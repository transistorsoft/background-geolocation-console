var Sequelize = require('sequelize');
var definedSequelizeDb = require('./define-sequelize-db');

var LocationModel = definedSequelizeDb.define(
  'locations',
  {
    id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
    uuid: { type: Sequelize.TEXT },
    device_id: { type: Sequelize.TEXT },
    device_model: { type: Sequelize.TEXT },
    latitude: { type: Sequelize.REAL },
    longitude: { type: Sequelize.REAL },
    accuracy: { type: Sequelize.INTEGER },
    altitude: { type: Sequelize.REAL },
    speed: { type: Sequelize.REAL },
    heading: { type: Sequelize.REAL },
    odometer: { type: Sequelize.REAL },
    event: { type: Sequelize.TEXT },
    activity_type: { type: Sequelize.TEXT },
    activity_confidence: { type: Sequelize.INTEGER },
    battery_level: { type: Sequelize.REAL },
    battery_is_charging: { type: Sequelize.BOOLEAN },
    is_moving: { type: Sequelize.BOOLEAN },
    geofence: { type: Sequelize.TEXT },
    provider: { type: Sequelize.TEXT },
    extras: { type: Sequelize.TEXT },
    recorded_at: { type: Sequelize.DATE },
    created_at: { type: Sequelize.DATE },
  },
  {
    timestamps: false,
  }
);

/**
 * Init / create location table
 */
definedSequelizeDb
  .authenticate()
  .then(
    function () {
      console.log('DB Connection has been established successfully.');
      return LocationModel.sync();
    },
    function (err) {
      console.log('Unable to connect to the database:', err);
    }
  )
  .catch(function (err) {
    console.log('Unable to sync database:', err);
  });

module.exports = LocationModel;
