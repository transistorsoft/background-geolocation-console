
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
    this.data = result.data;
  },
  getState: function() {
    return {
      data: this.data
    };
  }  
});

module.exports = DevicesStore;