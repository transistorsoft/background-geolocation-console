PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_token TEXT,
    created_at DATETIME,
    updated_at DATETIME
);

CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER,
    company_token TEXT,
    device_id TEXT,
    device_model TEXT,
    created_at DATETIME,
    framework TEXT,
    version TEXT,
    updated_at DATETIME,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    latitude REAL,
    longitude REAL,
    recorded_at DATETIME,
    created_at DATETIME,
    company_id INTEGER,
    device_id INTEGER,
    data JSON,
    uuid TEXT,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS devices_company_id ON devices(company_id);
CREATE INDEX IF NOT EXISTS devices_company_token ON devices(company_token);
CREATE INDEX IF NOT EXISTS devices_device_id ON devices(device_id);
CREATE INDEX IF NOT EXISTS locations_company_id_device_id_recorded_at ON locations(company_id, device_id, recorded_at);
CREATE INDEX IF NOT EXISTS locations_device_id ON locations(device_id);
CREATE INDEX IF NOT EXISTS locations_recorded_at ON locations(recorded_at);
CREATE INDEX IF NOT EXISTS locations_uuid ON locations(uuid);
