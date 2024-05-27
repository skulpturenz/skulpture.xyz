package main

import (
	_ "leads/post"
	"log/slog"
	"os"

	"github.com/GoogleCloudPlatform/functions-framework-go/funcframework"
)

func main() {
	port := "8080"

	if envPort := os.Getenv("PORT"); envPort != "" {
		port = envPort
	}

	slog.Info("start", "port", port)

	if err := funcframework.Start(port); err != nil {
		slog.Error("error", "start", err.Error())

		panic(err)
	}
}
