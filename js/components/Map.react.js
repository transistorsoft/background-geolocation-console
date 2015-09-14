import {default as React, Component} from "react";
import {default as GoogleMap} from "react-google-maps/lib/GoogleMap";
import {default as Marker} from "react-google-maps/lib/Marker";
import {default as InfoWindow} from "react-google-maps/lib/InfoWindow";
import {default as Polyline} from "react-google-maps/lib/Polyline";
import View from "react-flexbox";

// Fluxor
var Fluxxor         = require('fluxxor');
var FluxMixin       = Fluxxor.FluxMixin(React),
    StoreWatchMixin = Fluxxor.StoreWatchMixin;

// Stores
var DevicesStore = require('../stores/DevicesStore');
var Constants = require('../constants/Constants');

// For date-formatting
var moment = require('moment');

// Material deps
var mui = require('material-ui'),
  ThemeManager  = new mui.Styles.ThemeManager(),
  Colors        = mui.Styles.Colors,
  FlatButton    = mui.FlatButton,
  SelectField   = mui.SelectField,
  RaisedButton  = mui.RaisedButton,
  FontIcon      = mui.FontIcon,
  Tabs          = mui.Tabs,
  Tab           = mui.Tab,
  Toolbar       = mui.Toolbar,
  DatePicker    = mui.DatePicker,
  TextField     = mui.TextField,
  ToolbarSeparator = mui.ToolbarSeparator,
  ToolbarGroup  = mui.ToolbarGroup,
  ToolbarTitle  = mui.ToolbarTitle;

var DataGrid = require('react-datagrid')

/**
* Grid-column booleanRenderer
*/
function booleanRenderer(v, rec, cell) {
  if (v===null) { return "-"; }
  if (v) {
    cell.className = "cell-green";
  } else {
    cell.className = "cell-red";
  }
  return '';
}
/**
* Grid-column date-renderer
*/
function dateRenderer(v) {
  return moment(v).format('MM/DD, HH:mm:ss:S');
}


// DataGrid columns
var gridColumns = [
  { name: 'device_id', title: 'Device ID', render: function(v) { return (v) ? v.split('-').pop() : '-'; }},
  { name: 'uuid', title: 'UUID', render: function(v) { return (v) ? v.split('-').pop() : '-'; }},
  { name: 'recorded_at', title: "Timestamp", render: dateRenderer, width: 150},
  { name: 'created_at', title: 'Created at', render: dateRenderer, width: 150},
  { name: 'latitude', title: "Lat", width: 120},
  { name: 'longitude', title: "Lng", width: 120},
  { name: 'accuracy', textAlign: 'center', width: 100, render: function(v) { return parseFloat(v).toFixed(0); } },
  { name: 'activity_type', title: "Activity", width: 150, render: function(v, rec, cell) {
    if (!v) { return "-"; }
    return [rec.activity_type, " (", rec.activity_confidence, "%)"].join('');
  }},
  { name: 'battery_level', textAlign: 'center', className: "battery", title: "Battery", width: 100, render: function(v, rec, cell) { 
    if (!v) { return '-'; }
    cell.className = (rec.battery_is_charging) ? 'cell-green' : 'cell-red';
    return (parseFloat(v,10)*100).toFixed(0) + '%';      
  }}
];

/*
 * Sample From: https://developers.google.com/maps/documentation/javascript/examples/map-simple
 *
 * Add <script src="https://maps.googleapis.com/maps/api/js"></script> to your HTML to provide google.maps reference
 */
var Map = React.createClass({
  mixins: [FluxMixin, StoreWatchMixin("LocationsStore", "DevicesStore")],
  /*
   * 1. Create a component that wraps all your map sub-components.
   */
  childContextTypes: {
    muiTheme: React.PropTypes.object
  },
  getChildContext: function() {
    return {
      muiTheme: ThemeManager.getCurrentTheme()
    };
  },

  getInitialState: function() {
    var filter = window.localStorage.getItem('filter');
    if (filter) {
      filter = JSON.parse(filter);
    } else {
      filter = {};
    }
    return {      
      device: filter.device_id,
      currentPosition: null,
      currentPositionMarker: null,
      path: [],
      devices: [],      
      markers: [{
        position: {
          lat: 25.0112183,
          lng: 121.52067570000001,
        },
        key: "Taiwan",
        defaultAnimation: 2
      }]
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

  getCurrentPosition: function() {
    var me = this;

    window.navigator.geolocation.getCurrentPosition(function(location) {
      me.setState({
        currentPosition: location,
        center: {
          lat: location.coords.latitude,
          lng: location.coords.longitude
        }
      });
    });
  },
  createCurrentPositionMarker: function() {
    return {
      map: this.refs.map.state.map,
      zIndex: 100,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 12,
        fillColor: '#2677FF',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeOpacity: 1,
        strokeWeight: 6
      }
    };
  },
  componentWillMount: function() {
    /*
    ThemeManager.setPalette({
      accent1Color: Colors.deepOrange500,
    });
    */
    ThemeManager.setTheme(ThemeManager.types.LIGHT);
  },
  componentDidMount: function() {
    var me = this;
    var flux = this.getFlux();

    flux.actions.loadDevices();

    // Init filter form
    var filter = this.getFilter();
    if (filter.start_date && filter.end_date) {
      var startDate = new Date(filter.start_date),
          endDate = new Date(filter.end_date);

      this.refs.startDate.setDate(startDate);
      this.refs.endDate.setDate(endDate);
      this.refs.startTime.setValue(moment(startDate).format("HH:mm"));
      this.refs.endTime.setValue(moment(endDate).format("HH:mm"));
    }

    this.getCurrentPosition();

    flux.on("dispatch", function(type, payload) {
      if (type === Constants.LOAD_LOCATIONS_SUCCESS) {
        var path = [], latLng;
        var markers = payload.data.map(function(location) {
          latLng = {lat: location.latitude, lng: location.longitude};
          path.push(latLng);

          return {
            position: latLng,
            location: location,
            key: location.id,
            zIndex: 1,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: (location.is_moving) ? 7 : 10,
              fillColor: (location.is_moving) ? '#11b700' : '#b71100',//'26cc77',
              fillOpacity: (location.is_moving) ? 1 : 0.5,
              strokeColor: (location.is_moving) ? '#0d6104' : '#f00',
              strokeWeight: 1,
              strokeOpacity: 0.7
            }
          }
        });
        
        me.setState({          
          locations: payload.data,
          markers: markers,
          path: path
        })
      } else if (type === Constants.LOAD_DEVICES_SUCCESS) {
        var filter = me.getFilter(), 
            deviceIndex = 0;
        if (!filter.device_id && payload.data.length) {
          filter.device_id = payload.data[0].device_id;
          me.setFilter(filter);
        }
        for (var n=0,len=payload.data.length;n<len;n++) {
          if (payload.data[n].device_id === filter.device_id) {
            deviceIndex = n;
          }
        }
        me.setState({
          devices: payload.data,
          deviceIndex: deviceIndex
        });
        me.onFilter();
      }
    });

    // Ugly-ass height-resize code for Map & Grid tabs.
    var ct    = React.findDOMNode(this.refs.container),
        map   = React.findDOMNode(this.refs.map),
        grid  = React.findDOMNode(this.refs.grid);
    
    window.addEventListener("resize", resize);

    this.setState({
      bodyHeight: window.document.body.clientHeight
    });

    /**
    * Window resize-handler.  Gotta' be a better way to do this...
    */
    function resize() {
      var cssHeight;

      if (me.state.bodyHeight) {
        var diff = window.document.body.clientHeight - me.state.bodyHeight;

        me.setState({
          bodyHeight: window.document.body.clientHeight
        });
        map.style.height = map.clientHeight + diff + 'px';
        grid.style.height = grid.clientHeight + diff + 'px';
      } else {
        cssHeight = (ct.clientHeight-48) + 'px';  // <-- 48 is height if Toolbar
      }
      map.style.height = cssHeight;
      grid.style.height = cssHeight;
    }    
    resize();

    setTimeout(function() {
      
    }, 500);
  },
  getFilter: function() {
    return JSON.parse(window.localStorage.getItem('filter')) || {};
  },
  setFilter: function(filter) {
    window.localStorage.setItem('filter', JSON.stringify(filter));
  },
  onFilter: function() {
    var device    = this.refs.device,
        startDate = new Date(this.refs.startDate.getDate()),
        startTime = this.refs.startTime.getValue().split(':'),
        endDate = new Date(this.refs.endDate.getDate()),
        endTime = this.refs.endTime.getValue().split(':');

    startDate.setHours(parseInt(startTime[0], 10));
    startDate.setMinutes(parseInt(startTime[1], 10));

    endDate.setHours(parseInt(endTime[0], 10));
    endDate.setMinutes(parseInt(endTime[1], 10));

    var filter = this.getFilter();
    filter.start_date = startDate.toISOString();
    filter.end_date   = endDate.toISOString();

    this.setFilter(filter);

    this.getFlux().actions.loadLocations(filter);
  },

  onSelectDevice: function(events, index, record) {
    var filter = this.getFilter();
    filter.device_id = record.device_id;
    this.setFilter(filter);

    this.setState({
      deviceIndex: index
    });
  },
  showInfoWindow: function(marker) {
    var location = marker.location,
        isChargingCls = '';

    if (location.battery_level) {
      isChargingCls = (location.battery_is_charging === true) ? 'is-charging-true' : 'is-charging-false';
    }
    return (
      <InfoWindow key={`${marker.key}_info_window`}>
        <div className="location-info-window">
          <pre>{location.uuid}</pre>
          <p className="timestamp">{moment(location.recorded_at).format("YYYY-MM-DD HH:mm:ss:S")}</p>
          <table className="properties">
            <tr><th>Latitude:</th><td>{location.latitude}</td></tr>
            <tr><th>Longitude:</th><td>{location.longitude}</td></tr>
            <tr><th>Accuracy:</th><td>{location.accuracy}</td></tr>
            <tr><th>Activity:</th><td>{ (location.activity_type) ? (location.activity_type + ' (' + location.activity_confidence + '%)') : '-' }</td></tr>
            <tr className={isChargingCls}><th>Battery:</th><td>{ (location.battery_level) ? (parseFloat(location.battery_level,10).toFixed(2)*100 + '%') : '-' }</td></tr>
          </table>
        </div>
      </InfoWindow>
    );
  },

  onMarkerClick: function(marker) {
    marker.showInfo = true;

    var store = this.getFlux().store("LocationsStore");
    var rec = store.getById(marker.key);
    this.setState({
      selected: marker.key
    });
  },

  formatDate: function(date) {
    return moment(date).format("YYYY-MM-DD");
  },

  onSelect: function(id, data) {
    this.setState({
      selected: id
    });
  },
  getRowStyle: function(data, props) {
    return (data.is_moving === 0) ? {borderLeft: "10px solid red"} : {}
  },
  render: function() {
    var today = new Date();

    return (

      <View column auto width="100%">
        <View column auto>
          <Toolbar style={{backgroundColor:"#fff"}}>
            <ToolbarGroup key={0}>
              <ToolbarTitle text="Device:" style={{float:"left"}} />
              <SelectField ref="device" selectedIndex={this.state.deviceIndex} displayMember="device_model" valueMember="device_id" menuItems={this.state.devices} onChange={this.onSelectDevice} style={{float:"left", marginTop:"5px", width:"150px"}} />
            </ToolbarGroup>

            <ToolbarGroup key={1} float="left">
              <ToolbarTitle text="Start date" style={{float:"left", marginLeft:"20px"}} />
              <DatePicker ref="startDate" autoOk={true} width="100px" formatDate={this.formatDate} defaultDate={today} style={{marginTop:"5px", float: "left", width: "100px"}} textFieldStyle={{width:"100px"}}/>
              <TextField ref="startTime" defaultValue="00:00" width="100" style={{marginLeft: "10px", marginTop: "5px", float: "left", width: "50px"}} />
            </ToolbarGroup>

            <ToolbarGroup key={2} float="left" style={{marginLeft:"20px"}}>
              <ToolbarTitle text="End date" style={{float:"left"}} />
              <DatePicker ref="endDate" autoOk={true} formatDate={this.formatDate} defaultDate={today} style={{marginTop:"5px", float: "left"}} textFieldStyle={{width:"100px"}} />
              <TextField ref="endTime" defaultValue="23:59" style={{marginLeft: "10px", marginTop:"5px", float: "left", width: "50px"}} />
              <RaisedButton label="Filter" primary={true} onClick={this.onFilter}  />
            </ToolbarGroup>
          </Toolbar>

        </View>
        <View ref="container" className="blue">
          <View column width="100%">
            <Tabs>
              <Tab label="Map">
                <GoogleMap 
                  containerProps={{style: {width: "100%"}}}
                  ref="map"
                  defaultZoom={18}
                  center={this.state.center}>
                    <Polyline path={this.state.path} options={{geodesic: true, strokeColor: '#2677FF', strokeOpacity: 0.7, strokeWeight: 5}} />
                    {this.state.markers.map((marker, index) => { return (
                      <Marker{...marker} onClick={this.onMarkerClick.bind(this, marker)}>
                        {marker.showInfo ? this.showInfoWindow(marker) : null}
                      </Marker>
                    ); })}
                </GoogleMap>
              </Tab>
              <Tab label="Grid">
                <DataGrid ref="grid" idProperty="id" dataSource={this.state.locations} columns={gridColumns} selected={this.state.selected} rowStyle={this.getRowStyle} onSelectionChange={this.onSelect} style={{width:"100%", height:"800px"}}/>
              </Tab>
            </Tabs>
          </View>
        </View>
      </View>
    );
  }
});

module.exports = Map;
