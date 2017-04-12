var dbh = require("../database/dbh.js");

/**
* Device model
*/
var Device = (function() {
  return {
    all: function(conditions, callback) {
      var query = "SELECT device_id, device_model FROM locations GROUP BY device_id, device_model ORDER BY recorded_at DESC";
      var onQuery = function(err, rows) {
        var rs = [];
        rows.forEach(function (row) {
          rs.push(row);
        });
        callback(rs);
      }
      dbh.all(query, onQuery);
    }
  }
})();

module.exports = Device;
