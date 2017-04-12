var path        = require("path");
var sqlite3     = require("sqlite3").verbose();
var fs          = require("fs");

var DB_FILE     = path.resolve(__dirname, "background-geolocation.db");
var LOCATIONS_COLUMNS = [
  "id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL", 
  "uuid TEXT",
  "device_id TEXT",
  "device_model TEXT",
  "latitude REAL", 
  "longitude REAL",
  "accuracy INTEGER", 
  "altitude REAL",
  "speed REAL",      
  "heading REAL",
  "odometer REAL",
  "event TEXT",
  "activity_type TEXT",
  "activity_confidence INTEGER",
  "battery_level REAL",
  "battery_is_charging BOOLEAN",
  "is_moving BOOLEAN",
  "geofence TEXT",
  "provider TEXT",
  "extras TEXT",
  "recorded_at DATETIME",
  "created_at DATETIME"
];

var dbh;

if(!fs.existsSync(DB_FILE)) {
  console.log("- Creating database: ", DB_FILE);

  fs.openSync(DB_FILE, "w");
        
  dbh = new sqlite3.Database(DB_FILE);  

  dbh.serialize(function() {
    dbh.run("CREATE TABLE locations (" + LOCATIONS_COLUMNS.join(',') + ")");
  });    
} else {
  dbh = new sqlite3.Database(DB_FILE);  
}  

module.exports = dbh;