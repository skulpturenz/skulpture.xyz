package main

import (
	"bytes"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestCreateEnquiry(t *testing.T) {
	file, err := os.CreateTemp(os.TempDir(), "create_enquiry")
	if err != nil {
		t.Fatal(err)
	}
	defer os.Remove(file.Name())

	enquiry := map[string]io.Reader{
		"firstName": strings.NewReader("Test"),
		"lastName":  strings.NewReader("123"),
		"email":     strings.NewReader("test@test.com"),
		"mobile":    strings.NewReader("+64123412342"),
		"enquiry":   strings.NewReader("Hello world"),
		"files":     file,
	}

	contentType, form, err := createMultipartForm(enquiry)
	if err != nil {
		t.Fatal(err)
	}

	res, err := http.Post("http://localhost:80/contact", contentType, form)
	if err != nil {
		t.Fatal(err)
	}

	assert.Equal(t, res.StatusCode, http.StatusCreated)
}

// From: https://stackoverflow.com/a/20397167
func createMultipartForm(values map[string]io.Reader) (string, *bytes.Buffer, error) {
	var b bytes.Buffer

	w := multipart.NewWriter(&b)
	defer w.Close()

	for key, r := range values {
		var fw io.Writer

		if x, ok := r.(io.Closer); ok {
			defer x.Close()
		}

		// Add file
		if x, ok := r.(*os.File); ok {
			writer, err := w.CreateFormFile(key, x.Name())
			if err != nil {
				return "", nil, err
			}

			fw = writer
		} else {
			// Add other fields
			writer, err := w.CreateFormField(key)
			if err != nil {
				return "", nil, err
			}

			fw = writer
		}

		if _, err := io.Copy(fw, r); err != nil {
			return "", nil, err
		}

	}

	return w.FormDataContentType(), &b, nil
}
