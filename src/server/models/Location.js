var dbh = require("../database/dbh.js");

/**
* Location model
*/
var Location = (function() {

  function hydrate(record) {
    if (record.geofence) { record.geofence = JSON.parse(record.geofence); }
    return record;
  }

  return {
    all: function(params, callback) {
      var query = ["SELECT * FROM locations"];
      var conditions = [];
      if (params.start_date && params.end_date) {
        conditions.push("recorded_at BETWEEN ? AND ?")
      }
      if (params.device_id && params.device_id !== '') {
        conditions.push("device_id = ?")
      }
      if (conditions.length) {
        query.push("WHERE " + conditions.join(' AND '));
      }
      query.push("ORDER BY recorded_at DESC");

      console.log('%s\n'.yellow, query.join(' '));
      var onQuery = function(err, rows) {
        if (err) {
          console.log('ERROR: ', err);
          return;
        }
        var rs = [];
        rows.forEach(function (row) {
          rs.push(hydrate(row));
        });
        callback(rs);
      }

      query = query.join(' ');
      if (params.device_id && params.start_date && params.end_date) {
        dbh.all(query, params.start_date, params.end_date, params.device_id, onQuery)
      } else if (params.start_date && params.end_date) {
        dbh.all(query, params.start_date, params.end_date, onQuery);
      } else {
        dbh.all(query, onQuery);
      }
    },
    create: function(params) {
      var location  = params.location,
          now       = new Date(),
          query     = "INSERT INTO locations (uuid, device_id, device_model, latitude, longitude, accuracy, altitude, speed, heading, odometer, event, activity_type, activity_confidence, battery_level, battery_is_charging, is_moving, geofence, recorded_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
      
      var sth       = dbh.prepare(query);
      
      var insert = function(location) {
        var coords = location.coords,
            battery   = location.battery  || {level: null, is_charging: null},
            activity  = location.activity || {type: null, confidence: null},
            device    = params.device     || {model: "UNKNOWN"};
            geofence  = (location.geofence) ? JSON.stringify(location.geofence) : null;

        var uuid = (device.framework) ? (device.framework + '-' + device.uuid) : device.uuid;
        var model = (device.framework) ?  (device.model + ' (' + device.framework + ')') : device.model;
        sth.run(location.uuid, uuid, model, coords.latitude, coords.longitude, coords.accuracy, coords.altitude, coords.speed, coords.heading, location.odometer, location.event, activity.type, activity.confidence, battery.level, battery.is_charging, location.is_moving, geofence, location.timestamp, now);
      }

      // Check for batchSync, ie: location: {...} OR location: [...]
      if (typeof(location.length) === 'number') {
        // batchSync: true        
        for (var n=0,len=location.length;n<len;n++) {
          insert(location[n]);          
        }
      } else {        
        // batchSync: false
        insert(location);
      }
      sth.finalize();
    }
  }
})();

module.exports = Location;