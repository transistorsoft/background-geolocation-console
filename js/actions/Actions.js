var constants = require('../constants/Constants');

/**
* Locations Proxy
*/
var LocationsProxy = {
  load: function(params, success, failure) {
    console.info('LocationsProxy#load');

    $.ajax({
      url: 'http://localhost:8080/locations',
      method: 'GET',
      crossDomain: true,
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
  }
};

module.exports = actions;