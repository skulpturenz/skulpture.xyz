package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"mime/multipart"
	"net/http"
	"os"
	enums "skulpture/landing/enums"
	"strings"
	"time"

	"github.com/agoda-com/opentelemetry-go/otelslog"
	"github.com/agoda-com/opentelemetry-logs-go/exporters/otlp/otlplogs"
	"github.com/agoda-com/opentelemetry-logs-go/exporters/otlp/otlplogs/otlplogshttp"
	sdklog "github.com/agoda-com/opentelemetry-logs-go/sdk/logs"
	"github.com/dogmatiq/ferrite"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/go-chi/httplog/v2"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
	"github.com/mrz1836/postmark"
	slogmulti "github.com/samber/slog-multi"
	"github.com/sethvargo/go-limiter"
	"github.com/sethvargo/go-limiter/httplimit"
	"github.com/sethvargo/go-limiter/memorystore"
	"github.com/sethvargo/go-limiter/noopstore"
	"github.com/sourcegraph/conc/iter"
	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	"go.opentelemetry.io/otel/trace/noop"
	"google.golang.org/api/drive/v3"
	"google.golang.org/api/sheets/v4"
)

var validate *validator.Validate
var driveService *drive.Service
var postmarkClient *postmark.Client
var sheetsService *sheets.Service

const MAX_REQUEST_SIZE = 20 << 20 // 20 MB
const MAX_UPLOAD_SIZE = 15 << 20  // 15 MB

var (
	LOG_LEVEL = ferrite.EnumAs[slog.Level]("LOG_LEVEL", "Log level").
			WithMembers(slog.LevelDebug, slog.LevelError, slog.LevelInfo, slog.LevelWarn).
			WithDefault(slog.LevelInfo).
			Required()
	ENABLE_TELEMETRY = ferrite.
				Bool("ENABLE_TELEMETRY", "Enable telemetry").
				WithDefault(false).
				Required()
	OTEL_SERVICE_NAME = ferrite.
				String("OTEL_SERVICE_NAME", "OpenTelemetry service name").
				Required()
	OTEL_EXPORTER_OTLP_ENDPOINT = ferrite.
					String("OTEL_EXPORTER_OTLP_ENDPOINT", "OpenTelemetry exporter endpoint").
					Required()
	OTEL_EXPORTER_OTLP_TRACES_ENDPOINT = ferrite.
						String("OTEL_EXPORTER_OTLP_TRACES_ENDPOINT", "OpenTelemetry traces exporter endpoint").
						Optional()
	OTEL_EXPORTER_OTLP_HEADERS = ferrite.
					String("OTEL_EXPORTER_OTLP_HEADERS", "OpenTelemetry exporter headers").
					Required()
	OTEL_EXPORTER_OTLP_TRACES_HEADERS = ferrite.
						String("OTEL_EXPORTER_OTLP_TRACES_HEADERS", "OpenTelemetry exporter headers").
						Optional()
	POSTMARK_TEMPLATE = ferrite.Signed[int]("POSTMARK_TEMPLATE", "Postmark template").
				Required()
	POSTMARK_FROM = ferrite.String("POSTMARK_FROM", "Postmark from").
			WithDefault("hey@skulpture.xyz").
			Required()
	POSTMARK_SUPPORT_EMAIL = ferrite.String("POSTMARK_ADMIN_EMAIL", "Support email").
				Optional()
	POSTMARK_SERVER_TOKEN = ferrite.
				String("POSTMARK_SERVER_TOKEN", "Postmark server token").
				Required()
	POSTMARK_ACCOUNT_TOKEN = ferrite.
				String("POSTMARK_ACCOUNT_TOKEN", "Postmark account token").
				Required()
	GDRIVE_FOLDER_ID = ferrite.
				String("GDRIVE_FOLDER_ID", "Google drive folder id").
				Required()
	GSHEETS_SPREADSHEET_ID = ferrite.String("GSHEETS_SPREADSHEET_ID", "Google sheets spreadsheet id").
				Required()
	GSHEETS_SHEET_NAME = ferrite.
				String("GSHEETS_SHEET_NAME", "Google sheets sheet name").
				WithDefault("Sheet1").
				Required()
	GO_ENV = ferrite.
		Enum("GO_ENV", "Golang environment").
		WithMembers(string(enums.Production), string(enums.Development), string(enums.Test)).
		WithDefault(string(enums.Development)).
		Required()
)

func init() {
	ferrite.Init()

	validate = validator.New(validator.WithRequiredStructEnabled())
}

func main() {
	ctx := context.Background()

	driveService = createGoogleDriveService(ctx)
	postmarkClient = createPostmarkClient(ctx)
	sheetsService = createGoogleSheetsService(ctx)

	r := chi.NewRouter()

	cleanup := initOtel(ctx, r)
	defer cleanup(ctx)

	r.Use(middleware.RequestID)
	r.Use(middleware.Heartbeat("/ping"))
	r.Use(middleware.RealIP)
	r.Use(middleware.Recoverer)

	r.Use(cors.Handler(cors.Options{
		AllowOriginFunc: func(r *http.Request, origin string) bool {
			if GO_ENV.Value() != string(enums.Development) {
				return strings.Contains(origin, "skulpture.xyz") || strings.Contains(origin, "skulpture-xyz.pages.dev")
			}

			return true
		},
	}))

	var store limiter.Store
	if GO_ENV.Value() != string(enums.Production) {
		noopStore, err := noopstore.New()
		if err != nil {
			slog.ErrorContext(ctx, "error", "init", err.Error())
			panic(err)
		}

		store = noopStore
	} else {
		memoryStore, err := memorystore.New(&memorystore.Config{
			Tokens:   5,
			Interval: time.Minute,
		})
		if err != nil {
			slog.ErrorContext(ctx, "error", "init", err.Error())
			panic(err)
		}

		store = memoryStore
	}

	// requests are proxied by nginx
	middleware, err := httplimit.NewMiddleware(store, httplimit.IPKeyFunc("X-Forwarded-For"))
	if err != nil {
		slog.ErrorContext(ctx, "error", "init", err.Error())
		panic(err)
	}
	r.Route("/api/v1", func(r chi.Router) {
		r.Use(middleware.Handle)

		r.Post("/contact", handler)
	})

	http.ListenAndServe(":80", r)
}

func handler(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, MAX_REQUEST_SIZE)
	if err := r.ParseMultipartForm(MAX_UPLOAD_SIZE); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)

		return
	}
	defer r.MultipartForm.RemoveAll()

	var body struct {
		uuid                  string
		Email                 string `json:"email" validate:"required,email"`
		Mobile                string `json:"mobile" validate:"omitempty,e164"`
		FirstName             string `json:"firstName" validate:"required"`
		LastName              string `json:"lastName" validate:"required"`
		Enquiry               string `json:"enquiry" validate:"required"`
		driveFiles            []*drive.File
		driveFileWebViewLinks []string
	}

	body.uuid = uuid.NewString()
	body.Email = r.FormValue("email")
	body.Mobile = r.FormValue("mobile")
	body.FirstName = r.FormValue("firstName")
	body.LastName = r.FormValue("lastName")
	body.Enquiry = r.FormValue("enquiry")

	slog.DebugContext(r.Context(), "begin", "enquiry", fmt.Sprintf("%+v", body))

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

	files := r.MultipartForm.File["files"]

	if len(files) > 0 {
		about, err := driveService.About.
			Get().
			Fields("storageQuota").
			Context(r.Context()).
			Do()
		if err != nil {
			slog.ErrorContext(r.Context(), "error", "gdrive about", err.Error())
			http.Error(w, err.Error(), http.StatusInternalServerError)

			return
		}

		slog.DebugContext(r.Context(), "stats", "gdrive usage", about.StorageQuota.UsageInDrive, "gdrive limit", about.StorageQuota.Limit)

		uploadCtx, cancel := context.WithCancel(r.Context())
		driveFiles, err := iter.MapErr(files, func(fileHeader **multipart.FileHeader) (*drive.File, error) {
			slog.DebugContext(r.Context(), "begin", "upload", (*fileHeader).Filename, "size", (*fileHeader).Size)

			file, err := (*fileHeader).Open()
			if err != nil {
				slog.ErrorContext(r.Context(), "error", "open file", (*fileHeader).Filename, "email", body.Email)

				cancel()

				return nil, err
			}
			defer file.Close()

			res, err := driveService.Files.
				Create(&drive.File{
					Name: fmt.Sprintf("%s - %s (%s)", body.Email, (*fileHeader).Filename, GO_ENV.Value()),
					Properties: map[string]string{
						"lead":        body.uuid,
						"email":       body.Email,
						"firstName":   body.FirstName,
						"lastName":    body.LastName,
						"mobile":      body.Mobile,
						"environment": GO_ENV.Value(),
					},
					Parents: []string{GDRIVE_FOLDER_ID.Value()},
				}).
				Media(file).
				Fields("id, webViewLink").
				Context(uploadCtx).
				Do()
			if err != nil {
				slog.ErrorContext(r.Context(), "error", "upload", err.Error(), "email", body.Email)

				cancel()
				return nil, err
			}

			slog.DebugContext(r.Context(), "end", "upload", (*fileHeader).Filename, "link", res.WebViewLink)

			return res, nil
		})
		if err != nil {
			for _, driveFile := range driveFiles {
				go driveService.Files.
					Delete(driveFile.Id).
					Do()
			}
		}

		driveLinks := iter.Map(driveFiles, func(driveFile **drive.File) string {
			return fmt.Sprintf("- %s", (*driveFile).WebViewLink)
		})

		body.driveFiles = driveFiles
		body.driveFileWebViewLinks = driveLinks

		updatedEnquiry := fmt.Sprintf("%s\nAttached files:\n%s", body.Enquiry, strings.Join(driveLinks, "\n"))
		body.Enquiry = updatedEnquiry
	}

	slog.DebugContext(r.Context(), "processed", "enquiry", fmt.Sprintf("%+v", body))

	captureEnquiry := func() {
		ctx := context.WithoutCancel(r.Context())

		sheetRange := fmt.Sprintf("%s!A1", GSHEETS_SHEET_NAME.Value())

		_, err = sheetsService.
			Spreadsheets.
			Values.
			Append(GSHEETS_SPREADSHEET_ID.Value(), sheetRange, &sheets.ValueRange{
				Values: [][]interface{}{
					{
						body.Email,
						body.uuid,
						body.FirstName,
						body.LastName,
						body.Mobile,
						body.Enquiry,
						strings.Join(body.driveFileWebViewLinks, "\n"),
					},
				},
			}).
			ValueInputOption("RAW").
			InsertDataOption("INSERT_ROWS").
			Context(ctx).
			Do()
		if err != nil {
			slog.ErrorContext(ctx, "error", "gsheets", err.Error())

			for _, file := range body.driveFiles {
				go driveService.Files.
					Delete(file.Id).
					Do()
			}

			return
		}

		templateId := POSTMARK_TEMPLATE.Value()
		postmarkFrom := POSTMARK_FROM.Value()

		res, err := postmarkClient.SendTemplatedEmail(ctx, postmark.TemplatedEmail{
			TemplateID: int64(templateId),
			From:       postmarkFrom,
			To:         body.Email,
			TrackOpens: true,
			TemplateModel: map[string]any{
				"uuid":      body.uuid,
				"email":     body.Email,
				"firstName": body.FirstName,
				"lastName":  body.LastName,
				"mobile":    body.Email,
				"enquiry":   body.Enquiry,
			},
		})
		if err != nil {
			slog.ErrorContext(ctx, "error", "postmark", err.Error())
		}

		supportEmail, ok := POSTMARK_SUPPORT_EMAIL.Value()
		if ok {
			postmarkClient.SendEmail(ctx, postmark.Email{
				From:     postmarkFrom,
				To:       supportEmail,
				TextBody: fmt.Sprintf("New enquiry from %s", body.Email),
			})
		}

		slog.DebugContext(ctx, "sent", "postmark message id", res.MessageID, "to", res.To, "at", res.SubmittedAt, "lead", body.uuid)
	}

	// not waiting for goroutine to properly complete
	// since whether it completes successfully or not has no effect
	go captureEnquiry()

	w.WriteHeader(http.StatusCreated)
}

func createGoogleSheetsService(ctx context.Context) *sheets.Service {
	// Authenticate using ADC
	// instance or account must have required permissions to docs api
	// instance must have oauth scope: https://www.googleapis.com/auth/spreadsheets
	service, err := sheets.NewService(ctx)
	if err != nil {
		slog.ErrorContext(ctx, "error", "gsheets service", err.Error())
		panic(err)
	}

	slog.DebugContext(ctx, "create google sheets service")

	return service
}

func createGoogleDriveService(ctx context.Context) *drive.Service {
	// Authenticate using ADC
	// instance or account must have required permissions to drive api
	// instance must have oauth scope: https://www.googleapis.com/auth/drive
	// local run must have gdrive access enabled
	service, err := drive.NewService(ctx)
	if err != nil {
		slog.ErrorContext(ctx, "error", "gdrive service", err.Error())
		panic(err)
	}

	slog.DebugContext(ctx, "create google drive service")

	return service
}

func createPostmarkClient(ctx context.Context) *postmark.Client {
	client := postmark.NewClient(POSTMARK_SERVER_TOKEN.Value(), POSTMARK_ACCOUNT_TOKEN.Value())

	slog.DebugContext(ctx, "created postmark client")

	return client
}

func initOtel(ctx context.Context, r *chi.Mux) func(context.Context) error {
	if !ENABLE_TELEMETRY.Value() {
		// https://github.com/open-telemetry/opentelemetry-go/discussions/2659#discussioncomment-10798740
		otel.SetTracerProvider(
			noop.NewTracerProvider(),
		)

		return func(context.Context) error { // noop cleanup
			return nil
		}
	}

	// TODO: json payload
	exporter, err := otlptrace.New(
		ctx,
		otlptracehttp.NewClient(),
	)

	if err != nil {
		slog.ErrorContext(ctx, "error", "otel", fmt.Sprintf("failed to create exporter: %s", err.Error()))
		panic(err)
	}
	resources, err := resource.New(
		ctx,
		resource.WithAttributes(
			attribute.String("service.name", OTEL_SERVICE_NAME.Value()),
			attribute.String("library.language", "go"),
			attribute.String("deployment.environment", GO_ENV.Value()),
		),
	)
	if err != nil {
		slog.ErrorContext(ctx, "error", "otel", fmt.Sprintf("could not set resources: %s", err.Error()))
		panic(err)
	}

	otel.SetTracerProvider(
		sdktrace.NewTracerProvider(
			sdktrace.WithSampler(sdktrace.ParentBased(sdktrace.AlwaysSample())),
			sdktrace.WithBatcher(exporter),
			sdktrace.WithResource(resources),
		),
	)

	logExporter, _ := otlplogs.NewExporter(ctx, otlplogs.WithClient(otlplogshttp.NewClient(
		// parseable only supports json payloads
		otlplogshttp.WithJsonProtocol())))
	loggerProvider := sdklog.NewLoggerProvider(
		sdklog.WithBatcher(logExporter),
		sdklog.WithResource(resources),
	)

	otelLogger := slog.New(
		slogmulti.Fanout(
			otelslog.NewOtelHandler(loggerProvider, &otelslog.HandlerOptions{
				Level: LOG_LEVEL.Value(),
			}),
			slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
				Level: LOG_LEVEL.Value(),
			}),
		),
	)
	slog.SetDefault(otelLogger)

	r.Use(otelhttp.NewMiddleware(OTEL_SERVICE_NAME.Value()))
	r.Use(httplog.RequestLogger(httplog.NewLogger(OTEL_SERVICE_NAME.Value(), httplog.Options{
		Concise: true,
		Tags: map[string]string{
			"env": GO_ENV.Value(),
		},
	})))

	return func(ctx context.Context) error {
		loggerErr := loggerProvider.Shutdown((ctx))
		exporterErr := exporter.Shutdown(ctx)

		return errors.Join(loggerErr, exporterErr)
	}
}
