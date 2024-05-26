package post

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"strings"

	"github.com/GoogleCloudPlatform/functions-framework-go/functions"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
	"google.golang.org/api/drive/v3"
	"google.golang.org/api/option"
)

var validate *validator.Validate
var driveService *drive.Service

func init() {
	validate = validator.New(validator.WithRequiredStructEnabled())

	functions.HTTP("Handler", Handler)
}

func Handler(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Limit max request size to 20 MB
	const MAX_REQUEST_SIZE = 20 << 20
	r.Body = http.MaxBytesReader(w, r.Body, MAX_REQUEST_SIZE)

	const MAX_UPLOAD_SIZE = 15 << 20 // 15 MB
	if err := r.ParseMultipartForm(MAX_UPLOAD_SIZE); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)

		return
	}

	var body struct {
		uuid      string
		Email     string `json:"email" validate:"required,email"`
		Mobile    string `json:"mobile" validate:"e164"`
		FirstName string `json:"firstName" validate:"required"`
		LastName  string `json:"lastName" validate:"required"`
		Enquiry   string `json:"enquiry" validate:"required"`
	}

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		slog.Error("error", "request", err.Error())

		http.Error(w, err.Error(), http.StatusBadRequest)

		return
	}

	slog.Info("begin", "enquiry", fmt.Sprintf("%+v", body))

	err := validate.Struct(body)
	if err != nil {
		validationErrs := err.(validator.ValidationErrors)

		errs := []string{}
		for i := range validationErrs {
			err := validationErrs[i]

			errs = append(errs, fmt.Sprintf("- %s has invalid value '%s': %s", err.Namespace(), err.Value(), err.Error()))
		}

		slog.Error("error", "request", body, "errors", strings.Join(errs, ", "))
		http.Error(w, fmt.Sprintf("Invalid field values: %s", strings.Join(errs, "\n")), http.StatusBadRequest)

		return
	}

	body.uuid = uuid.NewString()

	uploadedFiles := []string{}
	files := r.MultipartForm.File["file"]

	if driveService == nil {
		driveService = createGoogleDriveService()
	}
	for _, fileHeader := range files {
		slog.Info("begin", "upload", fileHeader.Filename, "size", fileHeader.Size)

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
					"leadId":    body.uuid,
					"email":     body.Email,
					"firstName": body.FirstName,
					"lastName":  body.LastName,
					"mobile":    body.Mobile,
				},
			}).
			Media(file).
			Do()

		if err != nil {
			slog.Error("error", "upload", err.Error(), "email", body.Email)

			http.Error(w, err.Error(), http.StatusInternalServerError)

			return
		}

		slog.Info("end", "upload", fileHeader.Filename, "link", res.WebContentLink)

		uploadedFiles = append(uploadedFiles, fmt.Sprintf("- %s", res.WebContentLink))
	}

	if len(uploadedFiles) > 0 {
		enquiryWithFiles := fmt.Appendf([]byte(body.Enquiry), "\nAttached files:\n%s", strings.Join(uploadedFiles, "\n"))

		body.Enquiry = string(enquiryWithFiles)
	}

	slog.Info("processed", "enquiry", fmt.Sprintf("%+v", body))

	// TODO: POST to CRM
	// TODO: Send email
}

func createGoogleDriveService() *drive.Service {
	if os.Getenv("GO_ENV") != "Production" {
		service, err := drive.NewService(context.Background(), option.WithCredentialsFile(os.Getenv("GCLOUD_CREDENTIALS")))
		if err != nil {
			slog.Error("error", "gdrive dev", err.Error())

			panic(err)
		}

		return service
	}

	// Authenticate using client default credentials
	// see: https://cloud.google.com/docs/authentication/client-libraries
	ctx := context.Background()
	service, err := drive.NewService(ctx)
	if err != nil {
		slog.Error("error", "gdrive prod", err.Error())

		panic(err)
	}

	return service
}
