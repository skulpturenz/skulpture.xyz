package post

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"

	"github.com/GoogleCloudPlatform/functions-framework-go/functions"
	"github.com/agoda-com/opentelemetry-go/otelslog"
	"github.com/agoda-com/opentelemetry-logs-go/exporters/otlp/otlplogs"
	"github.com/agoda-com/opentelemetry-logs-go/exporters/otlp/otlplogs/otlplogshttp"
	sdklog "github.com/agoda-com/opentelemetry-logs-go/sdk/logs"
	"github.com/dogmatiq/ferrite"
	"github.com/go-chi/chi"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/httplog/v2"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	"google.golang.org/api/drive/v3"
)

var validate *validator.Validate
var driveService *drive.Service

const MAX_REQUEST_SIZE = 20 << 20 // 20 MB
const MAX_UPLOAD_SIZE = 15 << 20  // 15 MB

var (
	LOG_LEVEL = ferrite.EnumAs[slog.Level]("LOG_LEVEL", "Log level").
			WithMembers(slog.LevelDebug, slog.LevelError, slog.LevelInfo, slog.LevelWarn).
			WithDefault(slog.LevelInfo).
			Required()
	SERVICE_NAME = ferrite.
			String("SERVICE_NAME", "OpenTelemetry service name").
			Required()
	OTEL_EXPORTER_OTLP_ENDPOINT = ferrite.
					String("OTEL_EXPORTER_OTLP_ENDPOINT", "OpenTelemetry exporter endpoint").
					Required()
	OTEL_EXPORTER_OTLP_TRACES_ENDPOINT = ferrite.
						String("OTEL_EXPORTER_OTLP_TRACES_ENDPOINT", "OpenTelemetry traces exporter endpoint").
						Required()
	OTEL_EXPORTER_OTLP_HEADERS = ferrite.
					String("OTEL_EXPORTER_OTLP_HEADERS", "OpenTelemetry exporter headers").
					Required()
	OTEL_EXPORTER_OTLP_TRACES_HEADERS = ferrite.
						String("OTEL_EXPORTER_OTLP_TRACES_HEADERS", "OpenTelemetry exporter headers").
						Required()
	GO_ENV = ferrite.
		String("GO_ENV", "Golang environment").
		WithDefault("Development").
		Required()
)

func init() {
	ferrite.Init()

	ctx := context.Background()

	cleanup := initOtel(ctx)
	defer cleanup(ctx)

	driveService = createGoogleDriveService(ctx)

	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(otelhttp.NewMiddleware(SERVICE_NAME.Value()))
	r.Use(httplog.RequestLogger(httplog.NewLogger(SERVICE_NAME.Value(), httplog.Options{
		Concise: true,
		Tags: map[string]string{
			"env": GO_ENV.Value(),
		},
	})))
	r.Use(middleware.Heartbeat("/ping"))
	r.Use(middleware.RealIP)
	r.Use(middleware.Recoverer)
	r.Post("/*", Handler)

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

	slog.InfoContext(r.Context(), "begin", "enquiry", fmt.Sprintf("%+v", body))

	err := validate.Struct(body)
	if err != nil {
		validationErrs := err.(validator.ValidationErrors)

		errs := []string{}
		for i := range validationErrs {
			err := validationErrs[i]

			errs = append(errs, fmt.Sprintf("- %s", err.Error()))
		}

		slog.ErrorContext(r.Context(), "error", "enquiry", body)
		http.Error(w, fmt.Sprintf("Invalid field values:\n%s", strings.Join(errs, "\n")), http.StatusBadRequest)

		return
	}

	uploadedFileLinks := []string{}
	uploadedFiles := []*drive.File{}
	files := r.MultipartForm.File["files"]

	if len(files) > 0 {
		about, err := driveService.About.Get().Fields("storageQuota").Do()
		if err != nil {
			slog.ErrorContext(r.Context(), "error", "gdrive about", err.Error())
			http.Error(w, err.Error(), http.StatusInternalServerError)

			return
		}
		limit := about.StorageQuota.Limit
		currentUsage := about.StorageQuota.UsageInDrive

		slog.InfoContext(r.Context(), "stats", "gdrive usage", currentUsage, "gdrive limit", limit)

		for _, fileHeader := range files {
			slog.InfoContext(r.Context(), "begin", "upload", fileHeader.Filename, "size", fileHeader.Size)

			currentUsage += fileHeader.Size
			slog.InfoContext(r.Context(), "stats", "gdrive usage", currentUsage, "gdrive limit", limit)

			if currentUsage == limit {
				slog.ErrorContext(r.Context(), "gdrive usage exceeds limit")

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
				slog.ErrorContext(r.Context(), "error", "upload", err.Error(), "email", body.Email)
				http.Error(w, err.Error(), http.StatusInternalServerError)

				return
			}

			slog.InfoContext(r.Context(), "end", "upload", fileHeader.Filename, "link", res.WebContentLink)

			uploadedFiles = append(uploadedFiles, res)
			uploadedFileLinks = append(uploadedFileLinks, fmt.Sprintf("- %s", res.WebContentLink))
		}

		if currentUsage == limit {
			for _, file := range uploadedFiles {
				driveService.Files.Delete(file.Id)
			}

			slog.ErrorContext(r.Context(), "error", "upload", "gdrive quota reached")
			http.Error(w, "Google Drive quota reached", http.StatusInsufficientStorage)

			return
		}

		if len(uploadedFileLinks) > 0 {
			enquiryWithFiles := fmt.Appendf([]byte(body.Enquiry), "\nAttached files:\n%s", strings.Join(uploadedFileLinks, "\n"))

			body.Enquiry = string(enquiryWithFiles)
		}
	}

	slog.InfoContext(r.Context(), "processed", "enquiry", fmt.Sprintf("%+v", body))

	// TODO: POST to CRM
	// TODO: Send email
}

func createGoogleDriveService(ctx context.Context) *drive.Service {
	// Authenticate using client default credentials
	// see: https://cloud.google.com/docs/authentication/client-libraries
	// Note: Service Account Token Creator IAM role must be granted to the service account
	service, err := drive.NewService(ctx)
	if err != nil {
		slog.ErrorContext(ctx, "error", "gdrive service", err.Error())
		panic(err)
	}

	return service
}

func initOtel(ctx context.Context) func(context.Context) error {
	exporter, err := otlptrace.New(
		ctx,
		otlptracehttp.NewClient(),
	)

	if err != nil {
		slog.Error("error", "otel", fmt.Sprintf("failed to create exporter: %s", err.Error()))
		panic(err)
	}
	resources, err := resource.New(
		ctx,
		resource.WithAttributes(
			attribute.String("service.name", SERVICE_NAME.Value()),
			attribute.String("library.language", "go"),
		),
	)
	if err != nil {
		slog.Error("error", "otel", fmt.Sprintf("could not set resources: %s", err.Error()))
		panic(err)
	}

	otel.SetTracerProvider(
		sdktrace.NewTracerProvider(
			sdktrace.WithSampler(sdktrace.AlwaysSample()),
			sdktrace.WithBatcher(exporter),
			sdktrace.WithResource(resources),
		),
	)

	logExporter, _ := otlplogs.NewExporter(ctx, otlplogs.WithClient(otlplogshttp.NewClient()))
	loggerProvider := sdklog.NewLoggerProvider(
		sdklog.WithBatcher(logExporter),
		sdklog.WithResource(resources),
	)

	otelLogger := slog.New(otelslog.NewOtelHandler(loggerProvider, &otelslog.HandlerOptions{
		Level: LOG_LEVEL.Value(),
	}))
	slog.SetDefault(otelLogger)

	return func(ctx context.Context) error {
		loggerErr := loggerProvider.Shutdown((ctx))
		exporterErr := exporter.Shutdown(ctx)

		return errors.Join(loggerErr, exporterErr)
	}
}
