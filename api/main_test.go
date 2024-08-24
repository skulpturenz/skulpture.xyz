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

const (
	API_URL = "http://127.0.0.1:80/contact"
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

	res, err := http.Post(API_URL, contentType, form)
	if err != nil {
		t.Fatal(err)
	}

	body, err := io.ReadAll(res.Body)
	if err != nil {
		t.Fatal(err)
	}

	assert.Equal(t, http.StatusCreated, res.StatusCode, strings.Join([]string{res.Status, string(body)}, "\n"))
}

func TestValidateFirstNameRequired(t *testing.T) {
	file, err := os.CreateTemp(os.TempDir(), "create_enquiry")
	if err != nil {
		t.Fatal(err)
	}
	defer os.Remove(file.Name())

	enquiry := map[string]io.Reader{
		"lastName": strings.NewReader("123"),
		"email":    strings.NewReader("test@test.com"),
		"mobile":   strings.NewReader("+64123412342"),
		"enquiry":  strings.NewReader("Hello world"),
		"files":    file,
	}

	contentType, form, err := createMultipartForm(enquiry)
	if err != nil {
		t.Fatal(err)
	}

	res, err := http.Post(API_URL, contentType, form)
	if err != nil {
		t.Fatal(err)
	}

	body, err := io.ReadAll(res.Body)
	if err != nil {
		t.Fatal(err)
	}

	assert.Equal(t, http.StatusBadRequest, res.StatusCode, strings.Join([]string{res.Status, string(body)}, "\n"))
}

func TestValidateLastNameRequired(t *testing.T) {
	file, err := os.CreateTemp(os.TempDir(), "create_enquiry")
	if err != nil {
		t.Fatal(err)
	}
	defer os.Remove(file.Name())

	enquiry := map[string]io.Reader{
		"firstName": strings.NewReader("Test"),
		"email":     strings.NewReader("test@test.com"),
		"mobile":    strings.NewReader("+64123412342"),
		"enquiry":   strings.NewReader("Hello world"),
		"files":     file,
	}

	contentType, form, err := createMultipartForm(enquiry)
	if err != nil {
		t.Fatal(err)
	}

	res, err := http.Post(API_URL, contentType, form)
	if err != nil {
		t.Fatal(err)
	}

	body, err := io.ReadAll(res.Body)
	if err != nil {
		t.Fatal(err)
	}

	assert.Equal(t, http.StatusBadRequest, res.StatusCode, strings.Join([]string{res.Status, string(body)}, "\n"))
}

func TestValidateEmailRequired(t *testing.T) {
	file, err := os.CreateTemp(os.TempDir(), "create_enquiry")
	if err != nil {
		t.Fatal(err)
	}
	defer os.Remove(file.Name())

	enquiry := map[string]io.Reader{
		"firstName": strings.NewReader("Test"),
		"lastName":  strings.NewReader("123"),
		"mobile":    strings.NewReader("+64123412342"),
		"enquiry":   strings.NewReader("Hello world"),
		"files":     file,
	}

	contentType, form, err := createMultipartForm(enquiry)
	if err != nil {
		t.Fatal(err)
	}

	res, err := http.Post(API_URL, contentType, form)
	if err != nil {
		t.Fatal(err)
	}

	body, err := io.ReadAll(res.Body)
	if err != nil {
		t.Fatal(err)
	}

	assert.Equal(t, http.StatusBadRequest, res.StatusCode, strings.Join([]string{res.Status, string(body)}, "\n"))
}

func TestValidateEmailFormat(t *testing.T) {
	file, err := os.CreateTemp(os.TempDir(), "create_enquiry")
	if err != nil {
		t.Fatal(err)
	}
	defer os.Remove(file.Name())

	enquiry := map[string]io.Reader{
		"firstName": strings.NewReader("Test"),
		"lastName":  strings.NewReader("123"),
		"email":     strings.NewReader("test"),
		"mobile":    strings.NewReader("+64123412342"),
		"enquiry":   strings.NewReader("Hello world"),
		"files":     file,
	}

	contentType, form, err := createMultipartForm(enquiry)
	if err != nil {
		t.Fatal(err)
	}

	res, err := http.Post(API_URL, contentType, form)
	if err != nil {
		t.Fatal(err)
	}

	body, err := io.ReadAll(res.Body)
	if err != nil {
		t.Fatal(err)
	}

	assert.Equal(t, http.StatusBadRequest, res.StatusCode, strings.Join([]string{res.Status, string(body)}, "\n"))
}

func TestValidateMobileOptional(t *testing.T) {
	file, err := os.CreateTemp(os.TempDir(), "create_enquiry")
	if err != nil {
		t.Fatal(err)
	}
	defer os.Remove(file.Name())

	enquiry := map[string]io.Reader{
		"firstName": strings.NewReader("Test"),
		"lastName":  strings.NewReader("123"),
		"email":     strings.NewReader("test@example.com"),
		"enquiry":   strings.NewReader("Hello world"),
		"files":     file,
	}

	contentType, form, err := createMultipartForm(enquiry)
	if err != nil {
		t.Fatal(err)
	}

	res, err := http.Post(API_URL, contentType, form)
	if err != nil {
		t.Fatal(err)
	}

	body, err := io.ReadAll(res.Body)
	if err != nil {
		t.Fatal(err)
	}

	assert.Equal(t, http.StatusCreated, res.StatusCode, strings.Join([]string{res.Status, string(body)}, "\n"))
}

func TestValidateMobileFormat(t *testing.T) {
	file, err := os.CreateTemp(os.TempDir(), "create_enquiry")
	if err != nil {
		t.Fatal(err)
	}
	defer os.Remove(file.Name())

	enquiry := map[string]io.Reader{
		"firstName": strings.NewReader("Test"),
		"lastName":  strings.NewReader("123"),
		"email":     strings.NewReader("test"),
		"mobile":    strings.NewReader("12345678"),
		"enquiry":   strings.NewReader("Hello world"),
		"files":     file,
	}

	contentType, form, err := createMultipartForm(enquiry)
	if err != nil {
		t.Fatal(err)
	}

	res, err := http.Post(API_URL, contentType, form)
	if err != nil {
		t.Fatal(err)
	}

	body, err := io.ReadAll(res.Body)
	if err != nil {
		t.Fatal(err)
	}

	assert.Equal(t, http.StatusBadRequest, res.StatusCode, strings.Join([]string{res.Status, string(body)}, "\n"))
}

func TestValidateEnquiryRequired(t *testing.T) {
	file, err := os.CreateTemp(os.TempDir(), "create_enquiry")
	if err != nil {
		t.Fatal(err)
	}
	defer os.Remove(file.Name())

	enquiry := map[string]io.Reader{
		"firstName": strings.NewReader("Test"),
		"lastName":  strings.NewReader("123"),
		"email":     strings.NewReader("test"),
		"mobile":    strings.NewReader("12345678"),
		"files":     file,
	}

	contentType, form, err := createMultipartForm(enquiry)
	if err != nil {
		t.Fatal(err)
	}

	res, err := http.Post(API_URL, contentType, form)
	if err != nil {
		t.Fatal(err)
	}

	body, err := io.ReadAll(res.Body)
	if err != nil {
		t.Fatal(err)
	}

	assert.Equal(t, http.StatusBadRequest, res.StatusCode, strings.Join([]string{res.Status, string(body)}, "\n"))
}

func TestValidateFilesOptional(t *testing.T) {
	file, err := os.CreateTemp(os.TempDir(), "create_enquiry")
	if err != nil {
		t.Fatal(err)
	}
	defer os.Remove(file.Name())

	enquiry := map[string]io.Reader{
		"firstName": strings.NewReader("Test"),
		"lastName":  strings.NewReader("123"),
		"email":     strings.NewReader("test"),
		"mobile":    strings.NewReader("+6412345678"),
	}

	contentType, form, err := createMultipartForm(enquiry)
	if err != nil {
		t.Fatal(err)
	}

	res, err := http.Post(API_URL, contentType, form)
	if err != nil {
		t.Fatal(err)
	}

	body, err := io.ReadAll(res.Body)
	if err != nil {
		t.Fatal(err)
	}

	assert.Equal(t, http.StatusBadRequest, res.StatusCode, strings.Join([]string{res.Status, string(body)}, "\n"))
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
