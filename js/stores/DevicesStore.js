
var Fluxxor = require('fluxxor');
var constants = require('../constants/Constants');

/**
* Store
*/
var DevicesStore = Fluxxor.createStore({
  initialize: function() {
    this.data = [];

    this.bindActions(
      constants.LOAD_DEVICES, this.onLoad,
      constants.LOAD_DEVICES_SUCCESS, this.onLoadSuccess
    );
  },
  onLoad: function() {
    this.loading = true;
    this.emit("change");
  },
  onLoadSuccess: function(result) {
    this.loading = false;
    this.error = null;

    var device;
    // Re-format device_model, appending device_id, eg:  iPhone8,1 (61CA53C7)
    for (var n=0,len=result.data.length;n<len;n++) {
      device = result.data[n];
      device.device_model += " (" + device.device_id.split("-").shift() + ")";
    }
    this.data = result.data;
  },
  getState: function() {
    return {
      data: this.data
    };
  }  
});

module.exports = DevicesStore;