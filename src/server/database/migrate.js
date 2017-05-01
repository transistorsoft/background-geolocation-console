/**
* Migrate records created from before Sequalize was introduced
*/

var path        = require("path");
var sqlite3     = require("sqlite3").verbose();
var fs          = require("fs");

var DB_FILE     = path.resolve(__dirname, "background-geolocation.db");
var LocationModel = require('./LocationModel.js');

var dbh;

if(!fs.existsSync(DB_FILE)) {
  console.log("- Failed to find background-geolocation.db: ", DB_FILE);
  return;
} else {
  dbh = new sqlite3.Database(DB_FILE);
  var query = "SELECT * FROM locations";

  var onQuery = function(err, rows) {
    if (err) {
      console.log('ERROR: ', err);
      return;
    }
    rows.forEach(function (row) {      
      var id = row.id;
      delete(row.id);
      LocationModel.update(row, {where:{id: id}});
    });
  }
  dbh.all(query, onQuery);
}  

