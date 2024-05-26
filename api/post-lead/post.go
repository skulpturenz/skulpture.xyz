package post

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

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
		response := map[string]string{}
		response["error"] = err.Error()

		jsonResponse, _ := json.Marshal(response)

		http.Error(w, string(jsonResponse), http.StatusInternalServerError)

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
		log.Printf("[PostLead] Bad request \"%s\"", err)

		response := map[string]string{}
		response["error"] = err.Error()

		jsonResponse, _ := json.Marshal(response)

		http.Error(w, string(jsonResponse), http.StatusBadRequest)

		return
	}

	err := validate.Struct(body)
	if err != nil {
		validationErrs := err.(validator.ValidationErrors)

		errs := []string{}
		for i := range validationErrs {
			err := validationErrs[i]

			errs = append(errs, fmt.Sprintf("%s has invalid value '%s': %s", err.Namespace(), err.Value(), err.Error()))
		}

		response := map[string][]string{
			"error": errs,
		}

		jsonResponse, _ := json.Marshal(response)

		http.Error(w, string(jsonResponse), http.StatusBadRequest)

		return
	}

	body.uuid = uuid.NewString()

	uploadedFiles := []*drive.File{}
	files := r.MultipartForm.File["file"]

	if driveService == nil {
		driveService = createGoogleDriveService()
	}
	for _, fileHeader := range files {
		file, err := fileHeader.Open()
		if err != nil {
			response := map[string]string{}
			response["error"] = err.Error()

			jsonResponse, _ := json.Marshal(response)

			http.Error(w, string(jsonResponse), http.StatusInternalServerError)

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
			log.Printf("[PostLead] Error \"%s\" while processing enquiry for \"%s\"", err, body.Email)

			response := make(map[string]string)
			response["error"] = err.Error()

			jsonResponse, _ := json.Marshal(response)

			http.Error(w, string(jsonResponse), http.StatusBadRequest)

			return
		}

		uploadedFiles = append(uploadedFiles, res)
	}

	// TODO: POST to CRM
	// TODO: Send email
}

func createGoogleDriveService() *drive.Service {
	service, err := drive.NewService(context.Background(), option.WithCredentialsFile(os.Getenv("GCLOUD_CREDENTIALS")))
	if err != nil {
		log.Fatalf("[PostLead] Unable to access Drive API \"%s\"", err)
	}

	return service
}
