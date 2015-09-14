var constants = require('../constants/Constants');

/**
* Locations Proxy
*/
var LocationsProxy = {
  load: function(params, success, failure) {
    console.info('LocationsProxy#load');

    $.ajax({
      url: '/locations',
      method: 'GET',
      data: params,
      success: success
    });
  }
};

/**
* Devices Proxy
*/
var DevicesProxy = {
  load: function(params, success, failure) {
    $.ajax({
      url: '/devices',
      method: 'GET',
      data: params,
      success: success
    });
  }
};

/**
* Actions
*/
var actions = {
  loadLocations: function(params) {
    this.dispatch(constants.LOAD_LOCATIONS);
    LocationsProxy.load(params, function(rs) {
      this.dispatch(constants.LOAD_LOCATIONS_SUCCESS, {data: rs});
    }.bind(this), function(error) {
      alert('error');
    }.bind(this));
  },
  loadDevices: function(params) {
    this.dispatch(constants.LOAD_DEVICES);
    DevicesProxy.load(params, function(rs) {
      this.dispatch(constants.LOAD_DEVICES_SUCCESS, {data: rs});
    }.bind(this), function(error) {
      alert('error');
    }.bind(this));
  }
};

module.exports = actions;