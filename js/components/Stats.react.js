import {default as React, Component} from "react";
import View from "react-flexbox";

// Fluxor
var Fluxxor         = require('fluxxor');
var FluxMixin       = Fluxxor.FluxMixin(React),
    StoreWatchMixin = Fluxxor.StoreWatchMixin;

// Stores
var Constants = require('../constants/Constants');
var Format = require('../lib/Format');

// Material deps
var mui = require('material-ui'),
  ThemeManager  = new mui.Styles.ThemeManager(),
  Colors        = mui.Styles.Colors,

  // Table
  Table         = mui.Table,
  TableBody = mui.TableBody,
  TableHeader   = mui.TableHeader,
  TableRow= mui.TableRow,
  TableHeaderColumn = mui.TableHeaderColumn,
  TableRowColumn = mui.TableRowColumn,
  TableFooter = mui.TableFooter;

var Stats = React.createClass({
  mixins: [FluxMixin, StoreWatchMixin("LocationsStore")],
  
  getInitialState: function() {
    return {
      // TEST STATE TABLE
      duplicates: [],
      dictionary: {},

      fixedHeader: true,
      fixedFooter: true,
      stripedRows: false,
      showRowHover: false,
      selectable: false,
      multiSelectable: false,
      enableSelectAll: false,
      displaySelectAll: false,
      deselectOnClickaway: true
    };
  },

  getStateFromFlux: function() {
    var store = this.getFlux().store("LocationsStore");

    return {
      loading: store.loading,
      error: store.error,
      locations: store.data
    };
  },

  componentDidMount: function() {
    var me = this;
    var flux = this.getFlux();

    flux.on("dispatch", function(type, payload) {
      if (type === Constants.LOAD_LOCATIONS_SUCCESS) {
        me.onLoadLocations(payload);
      }
    });
  },
  onLoadLocations: function(payload) {
    var locations = payload.data,
        location, uuid,
        dictionary = {},
        duplicates = [];

    for (var n=0,len=locations.length;n<len;n++) {
      location = locations[n];
      uuid = location.uuid;
      if (dictionary[uuid]) {
        dictionary[uuid]++;
        if (dictionary[uuid] > 1) {
          duplicates.push(location);
        }
      } else {
        dictionary[uuid] = 1;
      }
    };
    dictionary = {};
    if (duplicates.length > 0) {
      for (var n=0,len=duplicates.length;n<len;n++) {
        uuid = duplicates[n].uuid;
        dictionary[uuid] = true;
      }
    }
    this.setState({          
      duplicates: duplicates,
      dictionary: dictionary
    });
  },
  onClick: function() {
    alert('click');
  },
  render: function() {
    var view = (<p style={{padding:"0.3em", margin: "0 0 0 1em", fontWeight:"bold"}}>No Duplicates!</p>);
    if (this.state.duplicates.length) {
      view = (
        <View column width="100%" style={{padding:"1em"}}>
          <table className="stats" style={{width:"100%", height:"70px"}}>
            <tr>
              <th>Duplicates:</th>
              <td>{
                this.state.duplicates.map((location, index) => { 
                  return (
                    <a href="#" className="duplicate" onClick={this.onClick.bind(this, location)}>
                      <pre>{location.uuid.split('-').pop()} ({Format.dateRenderer(location.recorded_at)})</pre>
                    </a>
                  ); 
                })
              }</td>
            </tr>
          </table>
        </View>
      );
    }

    return view;

  }
});

module.exports = Stats;

