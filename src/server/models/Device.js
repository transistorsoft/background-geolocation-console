var LocationModel = require("../database/LocationModel");

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

module.exports = Device;
