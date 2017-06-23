var LocationModel = require('../database/LocationModel');

/**
* Device model
*/
var Device = (function () {
  return {
    all: function (conditions, success, error) {
      LocationModel.findAll({
        attributes: ['device_id', 'device_model'],
        group: ['device_id', 'device_model'],
        order: 'max(recorded_at) DESC',
      })
        .then(success, function (err) {
          console.error('Error while fetching all devices', err);
          error(err);
        })
        .catch(error);
    },
  };
})();

module.exports = Device;
