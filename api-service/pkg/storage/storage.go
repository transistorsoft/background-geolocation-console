package storage

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/jackc/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"gorm.io/gorm/schema"

	"github.com/resistorsoftware/api-service/pkg/api/config"
)

var (
	globalDB     *gorm.DB
	globalErr    error
	initOnce     sync.Once
	migrationsMu sync.Mutex

	// ErrNotInitialized indicates that Init has not been called yet.
	ErrNotInitialized = errors.New("storage: not initialized")
)

// Init configures the shared *gorm.DB instance used across the service.
func Init(ctx context.Context, cfg config.DatabaseConfig) (*gorm.DB, error) {
	initOnce.Do(func() {
		globalDB, globalErr = openDatabase(ctx, cfg)
		if globalErr != nil {
			return
		}
		if cfg.AutoMigrate {
			globalErr = runMigrations(ctx, globalDB, cfg)
		}
	})
	return globalDB, globalErr
}

// DB returns the initialized database handle.
func DB() (*gorm.DB, error) {
	if globalDB == nil {
		return nil, ErrNotInitialized
	}
	return globalDB, nil
}

// Close closes the underlying sql.DB when initialized.
func Close() error {
	if globalDB == nil {
		return nil
	}
	sqlDB, err := globalDB.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}

// ResetForTests clears global storage state so tests can initialize a fresh database.
func ResetForTests() {
	if globalDB != nil {
		if sqlDB, err := globalDB.DB(); err == nil {
			_ = sqlDB.Close()
		}
	}
	globalDB = nil
	globalErr = nil
	initOnce = sync.Once{}
}

func openDatabase(ctx context.Context, cfg config.DatabaseConfig) (*gorm.DB, error) {
	if cfg.DatabaseURL != "" {
		return openPostgres(ctx, cfg)
	}
	return openSQLite(cfg)
}

func gormConfig() *gorm.Config {
	return &gorm.Config{
		NamingStrategy: schema.NamingStrategy{
			SingularTable: false,
		},
		Logger: logger.Default.LogMode(logger.Warn),
	}
}

// pgApplicationName labels this service's Postgres connections so they are
// distinguishable in pg_stat_activity (e.g. from a legacy console sharing the DB).
const pgApplicationName = "bg-console-go"

// withApplicationName injects application_name into a Postgres DSN (URL or
// keyword/value form) unless one is already set.
func withApplicationName(dsn, name string) string {
	trimmed := strings.TrimSpace(dsn)
	if trimmed == "" {
		return dsn
	}
	if u, err := url.Parse(trimmed); err == nil && u.Scheme != "" {
		q := u.Query()
		if q.Get("application_name") == "" {
			q.Set("application_name", name)
			u.RawQuery = q.Encode()
		}
		return u.String()
	}
	if strings.Contains(trimmed, "application_name=") {
		return trimmed
	}
	return trimmed + " application_name=" + name
}

func openPostgres(ctx context.Context, cfg config.DatabaseConfig) (*gorm.DB, error) {
	dsn := withApplicationName(cfg.DatabaseURL, pgApplicationName)
	db, err := gorm.Open(postgres.Open(dsn), gormConfig())
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "3D000" {
			if createErr := createPostgresDatabase(ctx, cfg); createErr != nil {
				return nil, fmt.Errorf("create postgres database: %w", createErr)
			}
			db, err = gorm.Open(postgres.Open(dsn), gormConfig())
		}
	}
	if err != nil {
		return nil, fmt.Errorf("open postgres: %w", err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("postgres sql db: %w", err)
	}
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(50)
	sqlDB.SetConnMaxLifetime(time.Hour)
	if err := sqlDB.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("ping postgres: %w", err)
	}
	return db, nil
}

func openSQLite(cfg config.DatabaseConfig) (*gorm.DB, error) {
	path := cfg.SQLitePath
	if path == "" {
		path = "./data/api-service.db"
	}
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, fmt.Errorf("ensure sqlite directory: %w", err)
	}
	dsn := path + "?_pragma=busy_timeout=5000&_foreign_keys=1"
	db, err := gorm.Open(sqlite.Open(dsn), gormConfig())
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}
	if err := db.Exec("PRAGMA foreign_keys = ON;").Error; err != nil {
		return nil, fmt.Errorf("enable sqlite foreign keys: %w", err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("sqlite sql db: %w", err)
	}
	sqlDB.SetMaxOpenConns(1)
	sqlDB.SetMaxIdleConns(1)
	sqlDB.SetConnMaxLifetime(0)
	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("ping sqlite: %w", err)
	}
	return db, nil
}

func createPostgresDatabase(ctx context.Context, cfg config.DatabaseConfig) error {
	target, err := url.Parse(cfg.DatabaseURL)
	if err != nil {
		return fmt.Errorf("parse database_url: %w", err)
	}
	dbName := strings.TrimPrefix(target.Path, "/")
	if dbName == "" {
		return errors.New("database_url missing database name")
	}

	adminURL := cfg.DBConnectionURL
	if adminURL == "" {
		target.Path = "/postgres"
		adminURL = target.String()
	}
	pool, err := pgxpool.New(ctx, adminURL)
	if err != nil {
		return fmt.Errorf("connect admin database: %w", err)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		return fmt.Errorf("ping admin database: %w", err)
	}

	quoted := quoteIdentifier(dbName)
	_, err = pool.Exec(ctx, fmt.Sprintf("CREATE DATABASE %s", quoted))
	if err != nil && !strings.Contains(err.Error(), "already exists") {
		return fmt.Errorf("create database %s: %w", dbName, err)
	}
	return nil
}

func quoteIdentifier(name string) string {
	return `"` + strings.ReplaceAll(name, `"`, `""`) + `"`
}

func runMigrations(ctx context.Context, db *gorm.DB, cfg config.DatabaseConfig) error {
	migrationsMu.Lock()
	defer migrationsMu.Unlock()

	if err := db.WithContext(ctx).AutoMigrate(&Company{}, &Device{}, &Location{}); err != nil {
		return fmt.Errorf("auto migrate: %w", err)
	}

	var statements string
	if cfg.DatabaseURL != "" {
		statements = postgresDDL
	} else {
		statements = sqliteDDL
	}
	statements = strings.TrimSpace(statements)
	if statements == "" {
		return nil
	}
	if err := db.WithContext(ctx).Exec(statements).Error; err != nil {
		return fmt.Errorf("apply migrations: %w", err)
	}
	return nil
}
