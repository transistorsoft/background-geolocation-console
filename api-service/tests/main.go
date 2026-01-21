package main

import (
	"context"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"errors"
	"flag"
	"fmt"
	"log"
	"math/big"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/resistorsoftware/api-service/pkg/api/config"
	"github.com/resistorsoftware/api-service/pkg/api/services"
	"github.com/resistorsoftware/api-service/pkg/api/types"
	"github.com/resistorsoftware/api-service/pkg/storage"
)

func main() {
	log.SetFlags(0)
	if len(os.Args) < 2 {
		usage()
		os.Exit(2)
	}

	cmd := os.Args[1]
	args := os.Args[2:]

	var err error
	switch cmd {
	case "seed":
		err = runSeedCommand(args)
	case "jwt-selftest":
		err = runJWTCheck(args)
	case "-h", "--help", "help":
		usage()
		return
	default:
		log.Printf("unknown command %q\n", cmd)
		usage()
		os.Exit(2)
	}

	if err != nil {
		log.Fatalf("%s: %v", cmd, err)
	}
}

func usage() {
	fmt.Println(`Usage: go run ./tests <command> [options]

Commands:
  seed           Populate the database with demo companies/devices.
  jwt-selftest   Confirm the configured JWT keys can encrypt/decrypt.

Active API surface:
  POST /api/register        (public)
  POST /api/refresh_token   (Authorization: Bearer <token>)
  GET  /api/devices         (Authorization: Bearer <token>)
  POST /api/locations       (Authorization: Bearer <token>)

Use "go run ./tests <command> -h" for command-specific help.`)
}

func runSeedCommand(args []string) error {
	fs := flag.NewFlagSet("seed", flag.ExitOnError)
	org := fs.String("org", "demo-company", "organization/company token to seed")
	deviceList := fs.String("devices", "", "comma separated device IDs (auto-generated when empty)")
	count := fs.Int("count", 1, "number of devices to create when --devices is empty")
	model := fs.String("model", "Pixel 8", "value stored in model/device_model")
	framework := fs.String("framework", "expo", "framework string recorded for each device")
	version := fs.String("version", "1.0.0", "application version recorded for each device")
	manufacturer := fs.String("manufacturer", "Google", "manufacturer recorded for each device")
	platform := fs.String("platform", "android", "platform string recorded for each device")
	enableMigrations := fs.Bool("migrate", true, "ensure schema is migrated before inserting data")
	verbose := fs.Bool("v", false, "enable verbose logging for each device")
	if err := fs.Parse(args); err != nil {
		return err
	}

	if strings.TrimSpace(*org) == "" {
		return errors.New("org cannot be empty")
	}
	ids := collectDeviceIDs(*deviceList, *count, *org)
	if len(ids) == 0 {
		return errors.New("no device ids to seed")
	}

	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}
	dbCfg := cfg.Database
	if *enableMigrations {
		dbCfg.AutoMigrate = true
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if _, err := storage.Init(ctx, dbCfg); err != nil {
		return fmt.Errorf("init storage: %w", err)
	}
	defer func() {
		if err := storage.Close(); err != nil {
			log.Printf("storage shutdown: %v", err)
		}
	}()

	for _, id := range ids {
		req := types.RegisterRequest{
			DeviceID:     id,
			DeviceModel:  *model,
			Framework:    *framework,
			Manufacturer: *manufacturer,
			Model:        *model,
			Org:          *org,
			Platform:     *platform,
			UUID:         uuid.NewString(),
			Version:      *version,
		}
		companyID, deviceID, err := services.FindOrCreateDevice(*org, req)
		if err != nil {
			return fmt.Errorf("seed %s: %w", id, err)
		}
		if *verbose {
			log.Printf("device %s ready (company_id=%d device_row=%d)", id, companyID, deviceID)
		}
	}

	fmt.Printf("Seeded %d device(s) for org %s:\n", len(ids), *org)
	for _, id := range ids {
		fmt.Printf("  - %s\n", id)
	}
	return nil
}

func runJWTCheck(_ []string) error {
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}

	privBytes, err := config.JWTPrivateKey()
	if err != nil {
		return fmt.Errorf("private key: %w", err)
	}
	pubBytes, err := config.JWTPublicKey()
	if err != nil {
		return fmt.Errorf("public key: %w", err)
	}

	privKey, err := parsePrivateKey(privBytes)
	if err != nil {
		return fmt.Errorf("parse private key: %w", err)
	}
	pubKey, err := parsePublicKey(pubBytes)
	if err != nil {
		return fmt.Errorf("parse public key: %w", err)
	}

	message := []byte("I am Willy Wonka, the king!")
	m := new(big.Int).SetBytes(message)
	if m.Cmp(privKey.N) >= 0 {
		return errors.New("message too large for modulus")
	}

	cipher := new(big.Int).Exp(m, privKey.D, privKey.N)
	unscrambled := new(big.Int).Exp(cipher, big.NewInt(int64(pubKey.E)), pubKey.N)

	fmt.Printf("Loaded config with JWT keys (private len=%d, public len=%d)\n", len(cfg.Auth.JWTPrivateKey), len(cfg.Auth.JWTPublicKey))
	fmt.Printf("Original message: %s\n", string(message))
	fmt.Printf("Cipher text (hex): %x\n", cipher.Bytes())
	fmt.Printf("Unscrambled message: %s\n", string(unscrambled.Bytes()))
	return nil
}

func collectDeviceIDs(list string, count int, org string) []string {
	var ids []string
	for _, part := range strings.Split(list, ",") {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			ids = append(ids, trimmed)
		}
	}
	if len(ids) > 0 {
		return ids
	}
	if count <= 0 {
		count = 1
	}
	prefix := sanitizeToken(org)
	if prefix == "" {
		prefix = "demo"
	}
	for i := 1; i <= count; i++ {
		ids = append(ids, fmt.Sprintf("%s-device-%02d", prefix, i))
	}
	return ids
}

func sanitizeToken(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	value = strings.NewReplacer(" ", "-", "/", "-", "\\", "-", "_", "-", ".", "-").Replace(value)
	value = strings.Trim(value, "-")
	if value == "" {
		return value
	}
	// Collapse duplicate separators for tidier defaults.
	return strings.Join(strings.FieldsFunc(value, func(r rune) bool {
		return r == '-'
	}), "-")
}

func parsePrivateKey(pemBytes []byte) (*rsa.PrivateKey, error) {
	block, _ := pem.Decode(pemBytes)
	if block == nil || block.Type != "RSA PRIVATE KEY" {
		return nil, fmt.Errorf("invalid private key PEM block")
	}
	return x509.ParsePKCS1PrivateKey(block.Bytes)
}

func parsePublicKey(pemBytes []byte) (*rsa.PublicKey, error) {
	block, _ := pem.Decode(pemBytes)
	if block == nil || block.Type != "RSA PUBLIC KEY" {
		return nil, fmt.Errorf("invalid public key PEM block")
	}
	return x509.ParsePKCS1PublicKey(block.Bytes)
}
