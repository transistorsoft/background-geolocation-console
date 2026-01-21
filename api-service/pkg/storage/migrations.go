package storage

import _ "embed"

var (
	//go:embed migrations/postgres.sql
	postgresDDL string

	//go:embed migrations/sqlite.sql
	sqliteDDL string
)
