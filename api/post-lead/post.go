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
	"google.golang.org/api/googleapi"
	"google.golang.org/api/option"
)

var validate *validator.Validate
var driveService *drive.Service

func init() {
	validate = validator.New(validator.WithRequiredStructEnabled())

	functions.HTTP("Handler", Handler)
}

func Handler(w http.ResponseWriter, r *http.Request) {
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

		response := make(map[string]string)
		response["error"] = err.Error()

		jsonResponse, _ := json.Marshal(response)

		w.WriteHeader(http.StatusBadRequest)
		w.Write(jsonResponse)

		return
	}

	err := validate.Struct(body)
	if err != nil {
		validationErrs := err.(validator.ValidationErrors)

		errs := make([]string, len(validationErrs))
		for i := range validationErrs {
			err := validationErrs[i]

			errs[i] = fmt.Sprintf("%s has invalid value '%s': %s", err.Namespace(), err.Value(), err.Error())
		}

		response := map[string][]string{
			"error": errs,
		}

		jsonResponse, _ := json.Marshal(response)

		w.WriteHeader(http.StatusBadRequest)
		w.Write(jsonResponse)
	}

	body.uuid = uuid.NewString()

	// TODO: Process files
	files := []*os.File{}

	// TODO: Send to GoogleDrive
	uploadedFiles := []*drive.File{}
	if len(files) > 0 {
		if driveService == nil {
			driveService = createGoogleDriveService()
		}

		for _, file := range files {
			stat, _ := file.Stat()

			fileMetadata := &drive.File{
				Name: file.Name(),
			}

			res, err := driveService.Files.
				Create(fileMetadata).Media(file, googleapi.ChunkSize(int(stat.Size()))).
				Do()

			if err != nil {
				log.Printf("[PostLead] Error \"%s\" while processing enquiry for \"%s\"", err, body.Email)

				response := make(map[string]string)
				response["error"] = err.Error()

				jsonResponse, _ := json.Marshal(response)

				w.WriteHeader(http.StatusBadRequest)
				w.Write(jsonResponse)
			}

			uploadedFiles = append(uploadedFiles, res)
		}
	}

	// TODO: POST to CRM
	// TODO: Send email
}

func createGoogleDriveService() *drive.Service {
	service, err := drive.NewService(context.Background(), option.WithCredentialsFile(os.Getenv("GCLOUD_CREDENTIALS")))
	if err != nil {
		log.Fatalf("[PostLead] Unabled to access Drive API %s", err)
	}

	return service
}
