package post

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"strings"

	"github.com/GoogleCloudPlatform/functions-framework-go/functions"
	"github.com/go-chi/chi"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	"google.golang.org/api/drive/v3"
	"google.golang.org/grpc/credentials"
)

var validate *validator.Validate
var driveService *drive.Service

const MAX_REQUEST_SIZE = 20 << 20 // 20 MB
const MAX_UPLOAD_SIZE = 15 << 20  // 15 MB

const OPERATION = "SkulptureLandingPostLead"

var (
	serviceName  = os.Getenv("SERVICE_NAME")
	collectorURL = os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
	insecure     = os.Getenv("INSECURE_MODE")
)

func init() {
	cleanup := initTracer()
	defer cleanup(context.Background())

	r := chi.NewRouter()
	r.Use(otelhttp.NewMiddleware(OPERATION))
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.MethodFunc("POST", "/*", Handler)

	validate = validator.New(validator.WithRequiredStructEnabled())

	functions.HTTP("Handler", r.ServeHTTP)
}

func Handler(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, MAX_REQUEST_SIZE)
	if err := r.ParseMultipartForm(MAX_UPLOAD_SIZE); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)

		return
	}
	defer r.MultipartForm.RemoveAll()

	var body struct {
		uuid      string
		Email     string `json:"email" validate:"required,email"`
		Mobile    string `json:"mobile" validate:"e164"`
		FirstName string `json:"firstName" validate:"required"`
		LastName  string `json:"lastName" validate:"required"`
		Enquiry   string `json:"enquiry" validate:"required"`
	}

	body.uuid = uuid.NewString()
	body.Email = r.FormValue("email")
	body.Mobile = r.FormValue("mobile")
	body.FirstName = r.FormValue("firstName")
	body.LastName = r.FormValue("lastName")
	body.Enquiry = r.FormValue("enquiry")

	slog.Info("begin", "enquiry", fmt.Sprintf("%+v", body))

	err := validate.Struct(body)
	if err != nil {
		validationErrs := err.(validator.ValidationErrors)

		errs := []string{}
		for i := range validationErrs {
			err := validationErrs[i]

			errs = append(errs, fmt.Sprintf("- %s", err.Error()))
		}

		slog.Error("error", "enquiry", body)
		http.Error(w, fmt.Sprintf("Invalid field values:\n%s", strings.Join(errs, "\n")), http.StatusBadRequest)

		return
	}

	uploadedFileLinks := []string{}
	uploadedFiles := []*drive.File{}
	files := r.MultipartForm.File["files"]

	if len(files) > 0 {
		if driveService == nil {
			driveService = createGoogleDriveService()
		}

		about, err := driveService.About.Get().Fields("storageQuota").Do()
		if err != nil {
			slog.Error("error", "gdrive about", err.Error())
			http.Error(w, err.Error(), http.StatusInternalServerError)

			return
		}
		limit := about.StorageQuota.Limit
		currentUsage := about.StorageQuota.UsageInDrive

		slog.Info("stats", "gdrive usage", currentUsage, "gdrive limit", limit)

		for _, fileHeader := range files {
			slog.Info("begin", "upload", fileHeader.Filename, "size", fileHeader.Size)

			currentUsage += fileHeader.Size
			slog.Info("stats", "gdrive usage", currentUsage, "gdrive limit", limit)

			if currentUsage == limit {
				slog.Error("gdrive usage exceeds limit")

				break
			}

			file, err := fileHeader.Open()
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)

				return
			}
			defer file.Close()

			res, err := driveService.Files.
				Create(&drive.File{
					Name: fileHeader.Filename,
					Properties: map[string]string{
						"lead":      body.uuid,
						"email":     body.Email,
						"firstName": body.FirstName,
						"lastName":  body.LastName,
						"mobile":    body.Mobile,
					},
				}).
				Media(file).
				Fields("id, webContentLink").
				Do()

			if err != nil {
				slog.Error("error", "upload", err.Error(), "email", body.Email)

				http.Error(w, err.Error(), http.StatusInternalServerError)

				return
			}

			slog.Info("end", "upload", fileHeader.Filename, "link", res.WebContentLink)

			uploadedFiles = append(uploadedFiles, res)
			uploadedFileLinks = append(uploadedFileLinks, fmt.Sprintf("- %s", res.WebContentLink))
		}

		if currentUsage == limit {
			for _, file := range uploadedFiles {
				driveService.Files.Delete(file.Id)
			}

			http.Error(w, "Google Drive quota reached", http.StatusInsufficientStorage)

			return
		}

		if len(uploadedFileLinks) > 0 {
			enquiryWithFiles := fmt.Appendf([]byte(body.Enquiry), "\nAttached files:\n%s", strings.Join(uploadedFileLinks, "\n"))

			body.Enquiry = string(enquiryWithFiles)
		}
	}

	slog.Info("processed", "enquiry", fmt.Sprintf("%+v", body))

	// TODO: POST to CRM
	// TODO: Send email
}

func createGoogleDriveService() *drive.Service {
	// Authenticate using client default credentials
	// see: https://cloud.google.com/docs/authentication/client-libraries
	// Note: Service Account Token Creator IAM role must be granted to the service account
	ctx := context.Background()
	service, err := drive.NewService(ctx)
	if err != nil {
		slog.Error("error", "gdrive service", err.Error())

		panic(err)
	}

	return service
}

func initTracer() func(context.Context) error {
	var secureOption otlptracegrpc.Option

	if strings.ToLower(insecure) == "false" || insecure == "0" || strings.ToLower(insecure) == "f" {
		secureOption = otlptracegrpc.WithTLSCredentials(credentials.NewClientTLSFromCert(nil, ""))
	} else {
		secureOption = otlptracegrpc.WithInsecure()
	}

	exporter, err := otlptrace.New(
		context.Background(),
		otlptracegrpc.NewClient(
			secureOption,
			otlptracegrpc.WithEndpoint(collectorURL),
		),
	)

	if err != nil {
		slog.Error("error", "signoz", fmt.Sprintf("failed to create exporter: %s", err.Error()))

		panic(err)
	}
	resources, err := resource.New(
		context.Background(),
		resource.WithAttributes(
			attribute.String("service.name", serviceName),
			attribute.String("library.language", "go"),
		),
	)
	if err != nil {
		slog.Error("error", "signoz", fmt.Sprintf("could not set resources: %s", err.Error()))

		panic(err)
	}

	otel.SetTracerProvider(
		sdktrace.NewTracerProvider(
			sdktrace.WithSampler(sdktrace.AlwaysSample()),
			sdktrace.WithBatcher(exporter),
			sdktrace.WithResource(resources),
		),
	)

	return exporter.Shutdown
}
