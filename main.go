package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"bg-console-staging/internal/configloader"

	"github.com/resistorsoftware/api-service/pkg/api"
	"github.com/resistorsoftware/api-service/pkg/api/config"
	"github.com/resistorsoftware/api-service/pkg/storage"
)

func main() {
	configPath, err := configloader.EnsureConfigFile()
	if err != nil {
		log.Fatalf("config setup: %v", err)
	}
	log.Printf("using API configuration %s", configPath)

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("load config: %v", err)
	}
	log.Println(api.AdminStartupStatus(cfg))

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if _, err := storage.Init(ctx, cfg.Database); err != nil {
		log.Fatalf("init storage: %v", err)
	}
	defer func() {
		if err := storage.Close(); err != nil {
			log.Printf("storage shutdown: %v", err)
		}
	}()

	addr := determineListenAddr(cfg)
	log.Printf("listening on %s", addr)
	if err := http.ListenAndServe(addr, api.New()); err != nil {
		log.Fatal(err)
	}
}

func determineListenAddr(cfg *config.Config) string {
	if v := strings.TrimSpace(os.Getenv("ADDR")); v != "" {
		return v
	}
	if port := strings.TrimSpace(os.Getenv("PORT")); port != "" {
		if strings.HasPrefix(port, ":") {
			return port
		}
		return ":" + port
	}
	if cfg.Server.Port > 0 {
		return fmt.Sprintf(":%d", cfg.Server.Port)
	}
	return ":9000"
}
