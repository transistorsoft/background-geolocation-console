package storage

import (
	"time"

	"gorm.io/datatypes"
)

// Company models the companies table.
type Company struct {
	ID           int64      `gorm:"column:id;primaryKey;autoIncrement"`
	CompanyToken string     `gorm:"column:company_token;index:companies_company_token"`
	CreatedAt    *time.Time `gorm:"column:created_at"`
	UpdatedAt    *time.Time `gorm:"column:updated_at"`
}

// TableName specifies the canonical table name for Company.
func (Company) TableName() string {
	return "companies"
}

// Device models the devices table.
type Device struct {
	ID           int64      `gorm:"column:id;primaryKey;autoIncrement"`
	CompanyID    *int64     `gorm:"column:company_id;index:devices_company_id"`
	CompanyToken string     `gorm:"column:company_token;index:devices_company_token"`
	DeviceID     string     `gorm:"column:device_id;index:devices_device_id"`
	DeviceModel  string     `gorm:"column:device_model"`
	CreatedAt    *time.Time `gorm:"column:created_at"`
	Framework    string     `gorm:"column:framework"`
	Version      string     `gorm:"column:version"`
	UpdatedAt    *time.Time `gorm:"column:updated_at"`
}

// TableName specifies the canonical table name for Device.
func (Device) TableName() string {
	return "devices"
}

// Location models the locations table.
type Location struct {
	ID         int64          `gorm:"column:id;primaryKey;autoIncrement"`
	Latitude   *float64       `gorm:"column:latitude"`
	Longitude  *float64       `gorm:"column:longitude"`
	RecordedAt *time.Time     `gorm:"column:recorded_at;index:locations_recorded_at"`
	CreatedAt  *time.Time     `gorm:"column:created_at"`
	CompanyID  *int64         `gorm:"column:company_id;index:locations_company_device_recorded,priority:1"`
	DeviceID   *int64         `gorm:"column:device_id;index:locations_company_device_recorded,priority:2;index:locations_device_id"`
	Data       datatypes.JSON `gorm:"column:data"`
	UUID       string         `gorm:"column:uuid;index:locations_uuid"`
}

// TableName specifies the canonical table name for Location.
func (Location) TableName() string {
	return "locations"
}
