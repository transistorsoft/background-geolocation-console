package main

import (
	"bufio"
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"flag"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/term"

	"github.com/resistorsoftware/api-service/pkg/api"
	"github.com/resistorsoftware/api-service/pkg/api/config"
	"github.com/resistorsoftware/api-service/pkg/storage"
)

const (
	dockerContainerName = "api-service-postgres-smoke"
	postgresImage       = "postgres:16-alpine"

	dbUser     = "smoke"
	dbPassword = "smokepass"
	dbName     = "smoke_db"
)

func main() {
	configFlag := flag.String("config", "", "path to configuration file (default server.toml)")
	shortConfigFlag := flag.String("f", "", "shorthand for -config")
	useDocker := flag.Bool("docker", false, "provision/run the Dockerized PostgreSQL smoke test database before starting the API service")
	initFlag := flag.Bool("initialize", false, "generate a fresh configuration file with secure keys and exit")
	flag.Parse()

	envOverride := strings.TrimSpace(os.Getenv("API_SERVICE_CONFIG"))

	override := strings.TrimSpace(*configFlag)
	if v := strings.TrimSpace(*shortConfigFlag); v != "" {
		override = v
	}

	if *useDocker && override == "" && envOverride == "" {
		log.Fatal("--docker requires either API_SERVICE_CONFIG or -f to reference a writable TOML config")
	}

	configPath := resolveConfigPath(override)

	if *initFlag {
		if err := runInitialization(configPath); err != nil {
			log.Fatalf("initialize config: %v", err)
		}
		log.Println("Initialization complete")
		return
	}

	if err := ensureConfigFile(configPath); err != nil {
		log.Fatalf("config setup: %v", err)
	}

	if err := os.Setenv("API_SERVICE_CONFIG", configPath); err != nil {
		log.Fatalf("set API_SERVICE_CONFIG: %v", err)
	}

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("load config: %v", err)
	}
	log.Println(api.AdminStartupStatus(cfg))

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if *useDocker {
		if err := bootstrapDockerPostgres(ctx, &cfg.Database); err != nil {
			log.Fatalf("docker database setup: %v", err)
		}
	}

	if _, err := storage.Init(ctx, cfg.Database); err != nil {
		log.Fatalf("init storage: %v", err)
	}
	defer func() {
		if err := storage.Close(); err != nil {
			log.Printf("storage shutdown: %v", err)
		}
	}()

	stopBackground := api.StartBackground(context.Background())
	defer stopBackground()

	addr := ":9000"
	if port := cfg.Server.Port; port != 0 {
		addr = fmt.Sprintf(":%d", port)
	}
	if v := os.Getenv("ADDR"); v != "" {
		addr = v
	}

	log.Printf("listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, api.New()))
}

func resolveConfigPath(override string) string {
	if v := strings.TrimSpace(override); v != "" {
		return v
	}
	if v := strings.TrimSpace(os.Getenv("API_SERVICE_CONFIG")); v != "" {
		return v
	}
	return "server.toml"
}

func ensureConfigFile(path string) error {
	if path == "" {
		path = "server.toml"
	}
	if _, err := os.Stat(path); err == nil {
		return nil
	} else if !errors.Is(err, os.ErrNotExist) {
		return err
	}

	if !isInteractive() {
		return fmt.Errorf("configuration file %s not found; create it or set API_SERVICE_CONFIG", path)
	}

	fmt.Printf("Configuration file %s not found. Generate a starter config now? [Y/n]: ", path)
	reader := bufio.NewReader(os.Stdin)
	answer, err := reader.ReadString('\n')
	if err != nil && !errors.Is(err, io.EOF) {
		return err
	}
	if !acceptCreation(answer) {
		return fmt.Errorf("configuration file required; aborting start-up")
	}
	if err := writeSampleConfig(path); err != nil {
		return err
	}
	fmt.Printf("Wrote starter configuration to %s. Review and update the placeholder values before running in production.\n\n", path)
	return nil
}

func isInteractive() bool {
	return term.IsTerminal(int(os.Stdin.Fd())) && term.IsTerminal(int(os.Stdout.Fd()))
}

func acceptCreation(answer string) bool {
	response := strings.TrimSpace(strings.ToLower(answer))
	return response == "" || response == "y" || response == "yes"
}

func writeSampleConfig(path string) error {
	if dir := filepath.Dir(path); dir != "." && dir != "" {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return err
		}
	}
	sample := config.SampleConfig()
	if len(sample) == 0 {
		return errors.New("sample configuration template is empty")
	}
	return os.WriteFile(path, sample, 0o600)
}

func runInitialization(basePath string) error {
	if strings.TrimSpace(basePath) == "" || basePath == "server.toml" {
		basePath = "server.local.toml"
	}
	dest := timestampedConfigPath(basePath)
	if err := writeInitialConfig(dest); err != nil {
		return err
	}
	log.Printf("Wrote initial configuration to %s", dest)
	return nil
}

func timestampedConfigPath(base string) string {
	dir := filepath.Dir(base)
	name := filepath.Base(base)
	ext := filepath.Ext(name)
	stem := strings.TrimSuffix(name, ext)
	if ext == "" {
		ext = ".toml"
	}
	ts := time.Now().Format("20060102150405")
	filename := fmt.Sprintf("%s.%s%s", stem, ts, ext)
	path := filepath.Join(dir, filename)
	if _, err := os.Stat(path); os.IsNotExist(err) {
		return path
	}
	for i := 0; ; i++ {
		ts = time.Now().Add(time.Duration(i+1) * time.Second).Format("20060102150405")
		filename = fmt.Sprintf("%s.%s%s", stem, ts, ext)
		path = filepath.Join(dir, filename)
		if _, err := os.Stat(path); os.IsNotExist(err) {
			return path
		}
	}
}

func randomBase64(size int) (string, error) {
	buf := make([]byte, size)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(buf), nil
}

func bootstrapDockerPostgres(_ context.Context, dbCfg *config.DatabaseConfig) error {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	if err := ensureDockerAvailable(ctx); err != nil {
		return err
	}

	desiredPort := determineDesiredPort(dbCfg)

	running, err := dockerContainerRunning(ctx, dockerContainerName)
	if err != nil {
		return err
	}

	var port int
	if running {
		port, err = dockerContainerPort(ctx, dockerContainerName)
		if err != nil {
			return err
		}
		if desiredPort != 0 && desiredPort != port {
			log.Printf("docker container already running on port %d; overriding requested %d", port, desiredPort)
		}
		log.Printf("Using existing docker Postgres container %q on port %d", dockerContainerName, port)
	} else {
		if err := stopDockerContainer(ctx, dockerContainerName); err != nil {
			return err
		}
		if desiredPort != 0 {
			if err := ensurePortAvailable(desiredPort); err != nil {
				return err
			}
			port = desiredPort
		} else {
			port, err = findFreePort()
			if err != nil {
				return err
			}
		}
		if err := startDockerContainer(ctx, port); err != nil {
			return err
		}
		adminURL := fmt.Sprintf("postgres://%s:%s@127.0.0.1:%d/postgres?sslmode=disable", dbUser, dbPassword, port)
		if err := waitForPostgres(ctx, adminURL); err != nil {
			return err
		}
		log.Printf("Started docker Postgres container %q on port %d", dockerContainerName, port)
	}

	dbCfg.DatabaseURL = fmt.Sprintf("postgres://%s:%s@127.0.0.1:%d/%s?sslmode=disable", dbUser, dbPassword, port, dbName)
	dbCfg.DBConnectionURL = fmt.Sprintf("postgres://%s:%s@127.0.0.1:%d/postgres?sslmode=disable", dbUser, dbPassword, port)
	dbCfg.SQLitePath = ""
	dbCfg.AutoMigrate = true

	log.Printf("Docker smoke database ready; DSN=%s", dbCfg.DatabaseURL)
	return nil
}

func determineDesiredPort(dbCfg *config.DatabaseConfig) int {
	if port := portFromDSN(dbCfg.DatabaseURL); port != 0 {
		return port
	}
	if port := portFromDSN(dbCfg.DBConnectionURL); port != 0 {
		return port
	}
	return 0
}

func portFromDSN(dsn string) int {
	if strings.TrimSpace(dsn) == "" {
		return 0
	}
	u, err := url.Parse(dsn)
	if err != nil {
		return 0
	}
	if p := u.Port(); p != "" {
		if v, err := strconv.Atoi(p); err == nil {
			return v
		}
	}
	return 0
}

func ensureDockerAvailable(ctx context.Context) error {
	cmd := exec.CommandContext(ctx, "docker", "version", "--format", "{{.Client.Version}}")
	if output, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("docker not available: %w (output: %s)", err, strings.TrimSpace(string(output)))
	}
	return nil
}

func dockerContainerRunning(ctx context.Context, name string) (bool, error) {
	cmd := exec.CommandContext(ctx, "docker", "inspect", "-f", "{{.State.Running}}", name)
	output, err := cmd.CombinedOutput()
	if err != nil {
		trimmed := strings.TrimSpace(string(output))
		if strings.Contains(trimmed, "No such object") {
			return false, nil
		}
		return false, fmt.Errorf("docker inspect %s: %w (output: %s)", name, err, trimmed)
	}
	return strings.TrimSpace(string(output)) == "true", nil
}

func dockerContainerPort(ctx context.Context, name string) (int, error) {
	cmd := exec.CommandContext(ctx, "docker", "port", name, "5432/tcp")
	output, err := cmd.CombinedOutput()
	if err != nil {
		return 0, fmt.Errorf("docker port %s: %w (output: %s)", name, err, strings.TrimSpace(string(output)))
	}
	line := strings.TrimSpace(string(output))
	if line == "" {
		return 0, errors.New("docker port output empty")
	}
	parts := strings.Split(line, ":")
	value := strings.TrimSpace(parts[len(parts)-1])
	port, err := strconv.Atoi(value)
	if err != nil {
		return 0, fmt.Errorf("parse docker port output %q: %w", line, err)
	}
	return port, nil
}

func startDockerContainer(ctx context.Context, port int) error {
	args := []string{
		"run",
		"--rm",
		"--name", dockerContainerName,
		"-e", "POSTGRES_USER=" + dbUser,
		"-e", "POSTGRES_PASSWORD=" + dbPassword,
		"-e", "POSTGRES_DB=" + dbName,
		"-p", fmt.Sprintf("%d:5432", port),
		"-d",
		postgresImage,
	}
	if output, err := exec.CommandContext(ctx, "docker", args...).CombinedOutput(); err != nil {
		return fmt.Errorf("docker run: %w (output: %s)", err, strings.TrimSpace(string(output)))
	}
	return nil
}

func stopDockerContainer(ctx context.Context, name string) error {
	cmd := exec.CommandContext(ctx, "docker", "rm", "-f", name)
	if output, err := cmd.CombinedOutput(); err != nil {
		trimmed := strings.TrimSpace(string(output))
		if strings.Contains(trimmed, "No such container") {
			return nil
		}
		return fmt.Errorf("docker rm -f %s: %w (output: %s)", name, err, trimmed)
	}
	return nil
}

func findFreePort() (int, error) {
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return 0, err
	}
	defer l.Close()

	addr, ok := l.Addr().(*net.TCPAddr)
	if !ok {
		return 0, errors.New("unexpected addr type")
	}
	return addr.Port, nil
}

func ensurePortAvailable(port int) error {
	l, err := net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", port))
	if err != nil {
		return fmt.Errorf("port %d unavailable: %w", port, err)
	}
	return l.Close()
}

func waitForPostgres(ctx context.Context, connString string) error {
	deadline := time.Now().Add(45 * time.Second)
	for {
		if time.Now().After(deadline) {
			return errors.New("timed out waiting for postgres readiness")
		}
		attemptCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
		pool, err := pgxpool.New(attemptCtx, connString)
		if err == nil {
			err = pool.Ping(attemptCtx)
			pool.Close()
			if err == nil {
				cancel()
				return nil
			}
		}
		cancel()

		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(1 * time.Second):
		}
	}
}
