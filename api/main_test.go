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
	"pgregory.net/rapid"
)

const (
	API_URL      = "http://127.0.0.1:80/api/v1/contact"
	one_megabyte = 1 << 20
	// from: https://github.com/go-playground/validator/blob/master/regexes.go
	emailRegexString = "^(?:(?:(?:(?:[a-zA-Z]|\\d|[!#\\$%&'\\*\\+\\-\\/=\\?\\^_`{\\|}~]|[\\x{00A0}-\\x{D7FF}\\x{F900}-\\x{FDCF}\\x{FDF0}-\\x{FFEF}])+(?:\\.([a-zA-Z]|\\d|[!#\\$%&'\\*\\+\\-\\/=\\?\\^_`{\\|}~]|[\\x{00A0}-\\x{D7FF}\\x{F900}-\\x{FDCF}\\x{FDF0}-\\x{FFEF}])+)*)|(?:(?:\\x22)(?:(?:(?:(?:\\x20|\\x09)*(?:\\x0d\\x0a))?(?:\\x20|\\x09)+)?(?:(?:[\\x01-\\x08\\x0b\\x0c\\x0e-\\x1f\\x7f]|\\x21|[\\x23-\\x5b]|[\\x5d-\\x7e]|[\\x{00A0}-\\x{D7FF}\\x{F900}-\\x{FDCF}\\x{FDF0}-\\x{FFEF}])|(?:(?:[\\x01-\\x09\\x0b\\x0c\\x0d-\\x7f]|[\\x{00A0}-\\x{D7FF}\\x{F900}-\\x{FDCF}\\x{FDF0}-\\x{FFEF}]))))*(?:(?:(?:\\x20|\\x09)*(?:\\x0d\\x0a))?(\\x20|\\x09)+)?(?:\\x22))))@(?:(?:(?:[a-zA-Z]|\\d|[\\x{00A0}-\\x{D7FF}\\x{F900}-\\x{FDCF}\\x{FDF0}-\\x{FFEF}])|(?:(?:[a-zA-Z]|\\d|[\\x{00A0}-\\x{D7FF}\\x{F900}-\\x{FDCF}\\x{FDF0}-\\x{FFEF}])(?:[a-zA-Z]|\\d|-|\\.|~|[\\x{00A0}-\\x{D7FF}\\x{F900}-\\x{FDCF}\\x{FDF0}-\\x{FFEF}])*(?:[a-zA-Z]|\\d|[\\x{00A0}-\\x{D7FF}\\x{F900}-\\x{FDCF}\\x{FDF0}-\\x{FFEF}])))\\.)+(?:(?:[a-zA-Z]|[\\x{00A0}-\\x{D7FF}\\x{F900}-\\x{FDCF}\\x{FDF0}-\\x{FFEF}])|(?:(?:[a-zA-Z]|[\\x{00A0}-\\x{D7FF}\\x{F900}-\\x{FDCF}\\x{FDF0}-\\x{FFEF}])(?:[a-zA-Z]|\\d|-|\\.|~|[\\x{00A0}-\\x{D7FF}\\x{F900}-\\x{FDCF}\\x{FDF0}-\\x{FFEF}])*(?:[a-zA-Z]|[\\x{00A0}-\\x{D7FF}\\x{F900}-\\x{FDCF}\\x{FDF0}-\\x{FFEF}])))\\.?$"
	e164RegexString  = "^\\+[1-9]?[0-9]{7,14}$"
)

func TestCreateEnquiry(t *testing.T) {
	rapid.Check(t, func(t *rapid.T) {
		var (
			fileSize  = rapid.Int64Range(0, 19*one_megabyte).Draw(t, "fileSize")
			firstName = rapid.StringMatching("[a-zA-Z]{1}").Draw(t, "firstName")
			lastName  = rapid.StringMatching("[a-zA-Z]{1}").Draw(t, "lastName")
			email     = rapid.StringMatching(emailRegexString).Draw(t, "email")
			mobile    = rapid.StringMatching(e164RegexString).Draw(t, "mobile")
			enquiry   = rapid.StringMatching("[a-zA-Z]{1}").Draw(t, "enquiry")
		)

		file, err := os.CreateTemp(os.TempDir(), "create_enquiry")
		if err != nil {
			t.Fatal(err)
		}
		defer os.Remove(file.Name())
		file.Truncate(fileSize)

		formData := map[string]io.Reader{
			"firstName": strings.NewReader(firstName),
			"lastName":  strings.NewReader(lastName),
			"email":     strings.NewReader(email),
			"mobile":    strings.NewReader(mobile),
			"enquiry":   strings.NewReader(enquiry),
			"files":     file,
		}

		contentType, form, err := createMultipartForm(formData)
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
	})
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
	rapid.Check(t, func(t *rapid.T) {
		var (
			email = rapid.String().Draw(t, "email")
		)

		file, err := os.CreateTemp(os.TempDir(), "create_enquiry")
		if err != nil {
			t.Fatal(err)
		}
		defer os.Remove(file.Name())

		enquiry := map[string]io.Reader{
			"firstName": strings.NewReader("Test"),
			"lastName":  strings.NewReader("123"),
			"email":     strings.NewReader(email),
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
	})
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
	rapid.Check(t, func(t *rapid.T) {
		var (
			mobile = rapid.String().Draw(t, "mobile")
		)

		file, err := os.CreateTemp(os.TempDir(), "create_enquiry")
		if err != nil {
			t.Fatal(err)
		}
		defer os.Remove(file.Name())

		enquiry := map[string]io.Reader{
			"firstName": strings.NewReader("Test"),
			"lastName":  strings.NewReader("123"),
			"email":     strings.NewReader("test"),
			"mobile":    strings.NewReader(mobile),
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
	})
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

func TestValidateFileSize(t *testing.T) {
	rapid.Check(t, func(t *rapid.T) {
		var (
			fileSize = rapid.Int64Range(21*one_megabyte, 40*one_megabyte).Draw(t, "fileSize")
		)

		file, err := os.CreateTemp(os.TempDir(), "create_enquiry")
		if err != nil {
			t.Fatal(err)
		}
		defer os.Remove(file.Name())
		file.Truncate(fileSize)

		formData := map[string]io.Reader{
			"firstName": strings.NewReader("Test"),
			"lastName":  strings.NewReader("123"),
			"email":     strings.NewReader("test@test.com"),
			"mobile":    strings.NewReader("+64123412342"),
			"enquiry":   strings.NewReader("Hello world"),
			"files":     file,
		}

		contentType, form, err := createMultipartForm(formData)
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

		assert.Equal(t, http.StatusInternalServerError, res.StatusCode, strings.Join([]string{res.Status, string(body)}, "\n"))
	})
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
