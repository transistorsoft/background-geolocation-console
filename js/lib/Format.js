// For date-formatting
var moment = require('moment');

var Format = {
	/**
	* Grid-column booleanRenderer
	*/
	booleanRenderer: function(v, rec, cell) {
	  if (v===null) { return "-"; }
	  if (v) {
	    cell.className = "cell-green";
	  } else {
	    cell.className = "cell-red";
	  }
	  return '';
	},
	/**
	* Grid-column date-renderer
	*/
	dateRenderer: function(v) {
	  return moment(v).format('MM/DD, HH:mm:ss:SSS');
	}
};

module.exports = Format;