package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"log"
	"net"
	"os/exec"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

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

type tableRow struct {
	TableName string `gorm:"column:tablename"`
}

var (
	keepContainer = flag.Bool("keep-container", false, "leave the Docker container running after the smoke test for manual verification")
	fixedPort     = flag.Int("port", 0, "host port to expose Postgres on (default 0 => random free port)")
)

func main() {
	flag.Parse()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("load config: %v", err)
	}

	var stopContainer func()
	if strings.TrimSpace(cfg.Database.DatabaseURL) == "" {
		hostPort, stopFn, err := provisionDockerPostgres(ctx)
		if err != nil {
			log.Fatalf("provision postgres container: %v", err)
		}
		stopContainer = stopFn

		cfg.Database.DatabaseURL = fmt.Sprintf("postgres://%s:%s@127.0.0.1:%d/%s?sslmode=disable", dbUser, dbPassword, hostPort, dbName)
		cfg.Database.DBConnectionURL = fmt.Sprintf("postgres://%s:%s@127.0.0.1:%d/postgres?sslmode=disable", dbUser, dbPassword, hostPort)
		cfg.Database.AutoMigrate = true

		if err := waitForPostgres(ctx, cfg.Database.DBConnectionURL); err != nil {
			log.Fatalf("wait for postgres: %v", err)
		}
		log.Printf("Started docker Postgres container %q on port %d", dockerContainerName, hostPort)
	} else {
		log.Printf("Using database_url from config; skipping docker provisioning")
	}

	db, err := storage.Init(ctx, cfg.Database)
	if err != nil {
		log.Fatalf("init storage: %v", err)
	}
	defer func() {
		if err := storage.Close(); err != nil {
			log.Printf("storage shutdown: %v", err)
		}
	}()

	var tables []tableRow
	if err := db.Raw(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`).Scan(&tables).Error; err != nil {
		log.Fatalf("list tables: %v", err)
	}

	var locationCount int64
	if err := db.WithContext(ctx).Table("locations").Count(&locationCount).Error; err != nil {
		log.Printf("locations count (optional): %v", err)
	}

	fmt.Println("✅ PostgreSQL smoke test succeeded")
	fmt.Println("📦 Public tables:")
	for _, t := range tables {
		fmt.Printf("  - %s\n", t.TableName)
	}
	fmt.Printf("ℹ️ locations row count: %d (0 is fine on a fresh database)\n", locationCount)

	if stopContainer != nil {
		if *keepContainer {
			log.Printf("Leaving Docker container %q running; stop it manually with `docker rm -f %s` when finished.", dockerContainerName, dockerContainerName)
		} else {
			stopContainer()
		}
	}
}

func provisionDockerPostgres(ctx context.Context) (int, func(), error) {
	if err := ensureDocker(ctx); err != nil {
		return 0, nil, err
	}

	if err := stopDockerContainer(ctx, dockerContainerName); err != nil {
		return 0, nil, err
	}

	port := *fixedPort
	if port == 0 {
		var err error
		port, err = findFreePort()
		if err != nil {
			return 0, nil, fmt.Errorf("find free port: %w", err)
		}
	} else {
		if err := ensurePortAvailable(port); err != nil {
			return 0, nil, err
		}
	}

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
		return 0, nil, fmt.Errorf("docker run: %w (output: %s)", err, strings.TrimSpace(string(output)))
	}

	stopFn := func() {
		stopCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		if err := stopDockerContainer(stopCtx, dockerContainerName); err != nil {
			log.Printf("stop container: %v", err)
		}
	}
	return port, stopFn, nil
}

func ensureDocker(ctx context.Context) error {
	cmd := exec.CommandContext(ctx, "docker", "version", "--format", "{{.Client.Version}}")
	if output, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("docker not available: %w (output: %s)", err, strings.TrimSpace(string(output)))
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
	l.Close()
	return nil
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
