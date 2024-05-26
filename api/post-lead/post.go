package post

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/GoogleCloudPlatform/functions-framework-go/functions"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
)

var validate *validator.Validate

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
		log.Printf("[PostLead] Error: %s", err)

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

		response := make(map[string][]string)
		response["error"] = errs

		jsonResponse, _ := json.Marshal(response)

		w.WriteHeader(http.StatusBadRequest)
		w.Write(jsonResponse)
	}

	body.uuid = uuid.NewString()

	// TODO: Process files
	// TODO: Send to GoogleDrive
	// TODO: POST to CRM
	// TODO: Send email
}
