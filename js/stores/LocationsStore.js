var Fluxxor = require('fluxxor');
var constants = require('../constants/Constants');

/**
* Store
*/
var LocationsStore = Fluxxor.createStore({
  initialize: function() {
    this.data = [];

    this.bindActions(
      constants.LOAD_LOCATIONS, this.onLoad,
      constants.LOAD_LOCATIONS_SUCCESS, this.onLoadSuccess
    );
  },

  getById: function(id) {
  	var data = this.data,
  		rec = false;
  	for (var n=0,len=data.length;n<len;n++) {
  		if (data[n].id === id) {
  			rec = data[n];
  			break;
  		}
  	}
  	return rec;
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

module.exports = LocationsStore;