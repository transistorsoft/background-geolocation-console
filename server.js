var express     = require('express');
var bodyParser  = require('body-parser')
var app         = express();
var Sequelize   = require('sequelize');
var fs          = require("fs");

// ENVIRONMENT VARIABLES :
// PORT (optional, defaulted to 8080) : http port server will listen to
// DB_CONNECTION_URL (defaulted to "sqlite://db/background-geolocation.db") : connection url used to connect to a db
//    Currently, only postgresql & sqlite dialect are supported
//    Sample pattern for postgresql connection url : postgres://<username>:<password>@<hostname>:<port>/<dbname>

var sequelize = new Sequelize(process.env.DB_CONNECTION_URL || { dialect: "sqlite", storage: "./db/background-geolocation.db" });

app.disable('etag');
app.use(express.static('.'));
app.use(bodyParser.json());

/**
* GET /devices
*/
app.get('/devices', function(req, res) {
  console.log('GET /devices', "\n");
  Device.all(req.query, function(rs) {
    res.send(rs);
  })
});

/**
* GET /locations
*/
app.get('/locations', function(req, res) {
  console.log('--------------------------------------------------------------------');
  console.log('- GET /locations', JSON.stringify(req.query));
  Location.all(req.query, function(rs) {
    res.send(rs);
  });
});

/**
* POST /locations
*/
app.post('/locations', function (req, res) {
  console.log('---------------------------------------------------------------------');
  console.log("- POST /locations\n", JSON.stringify(req.body, null, 2), "\n");
  Location.create(req.body);
  res.send({success: true});
  //res.status(427).send("Too many requests");
  //res.status(500).send("Internal Server Error");
  //res.status(404).send("Not Found");

});

app.post('/configure', function(req, res) {
  console.log('/configure');

  var response = {
    "access_token":"e7ebae5e-4bea-4d63-8f28-8a104acd2f4c",   
    "token_type":"Bearer",   
    "expires_in":3600,   
    "refresh_token":"2a69e1cd-d7db-44f6-87fc-3d66c4505ee4",   
    "scope":"openid+email+profile+phone+address+group"   
  };

  res.send(response);
});

var server = app.listen((process.env.PORT || 8080), function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('*************************************************************************');
  console.log('* Background Geolocation Server listening at http://%s:%s', host, port);
  console.log('*************************************************************************', "\n");
});


var LocationModel = sequelize.define("locations", {
  id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true},
  uuid: { type: Sequelize.TEXT },
  device_id: { type: Sequelize.TEXT },
  device_model: { type: Sequelize.TEXT },
  latitude: { type: Sequelize.REAL },
  longitude: { type: Sequelize.REAL },
  accuracy: { type: Sequelize.INTEGER },
  altitude: { type: Sequelize.REAL },
  speed: { type: Sequelize.REAL },
  heading: { type: Sequelize.REAL },
  activity_type: { type: Sequelize.TEXT },
  activity_confidence: { type: Sequelize.INTEGER },
  battery_level: { type: Sequelize.REAL },
  battery_is_charging: { type: Sequelize.BOOLEAN },
  is_moving: { type: Sequelize.BOOLEAN },
  geofence: { type: Sequelize.TEXT },
  recorded_at: { type: Sequelize.DATE },
  created_at: { type: Sequelize.DATE }
});

/**
* Device model
*/
var Device = (function() {
  return {
    all: function(conditions, callback) {
      LocationModel.findAll({
        attributes: [ 'device_id', 'device_model'],
        group: [ 'device_id', 'device_model' ],
        order: 'max(recorded_at) DESC'
      }).then(callback, function(err){
        console.error("Error while fetching all devices", err);
      });
    }
  }
})();
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
      var whereConditions = {};
      if (params.start_date && params.end_date) {
        whereConditions.recorded_at = { $between: [params.start_date, params.end_date] };
      }
      if (params.device_id && params.device_id !== '') {
        whereConditions.device_id = params.device_id;
      }

      LocationModel.findAll({
        where: whereConditions,
        order: 'recorded_at DESC'
      }).then(function(rows) {
        var locations = [];
        rows.forEach(function (row) {
          locations.push(hydrate(row));
        });
        callback(locations);
      }, function(err){
        console.error("Fetch all locations error : ", err);
      });
    },
    create: function(params) {
      var location  = params.location,
          now       = new Date();

      // Considering we're always working with locations array
      var locations = location.length?location:[location];

      locations.forEach(function(location){
        var coords = location.coords,
            battery   = location.battery  || {level: null, is_charging: null},
            activity  = location.activity || {type: null, confidence: null},
            device    = params.device     || {model: "UNKNOWN"},
            geofence  = (location.geofence) ? JSON.stringify(location.geofence) : null;

        LocationModel.create({
          uuid: location.uuid,
          device_id: device.uuid,
          device_model: device.model,
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          altitude: coords.altitude,
          speed: coords.speed,
          heading: coords.heading,
          activity_type: activity.type,
          activity_confidence: activity.confidence,
          battery_level: battery.level,
          battery_is_charging: battery.is_charging,
          is_moving: location.is_moving,
          geofence: geofence,
          recorded_at: location.timestamp,
          created_at: now
        });
      });
    }
  }
})();

/**
 * Init / create database
 */
sequelize.authenticate()
    .then(function(err) {
      console.log('DB Connection has been established successfully.');
      return LocationModel.sync();
    }, function(err){
      console.log('Unable to connect to the database:', err);
    })
    .catch(function (err) {
      console.log('Unable to sync database:', err);
    });
