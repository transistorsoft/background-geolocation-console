import {default as React, Component} from "react";
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
// Custom formatting toolbox
var Format = require('../lib/Format');

// Material deps
var mui = require('material-ui'),
  ThemeManager  = require('material-ui/lib/styles/theme-manager'),
  Colors        = require('material-ui/lib/styles/colors'),
  FlatButton    = require('material-ui/lib/flat-button'),
  SelectField   = require('material-ui/lib/select-field'),
  MenuItem      = require('material-ui/lib/menus/menu-item'),
  RaisedButton  = require('material-ui/lib/raised-button'),
  FontIcon      = require('material-ui/lib/font-icon'),
  Toolbar       = require('material-ui/lib/toolbar/toolbar'),
  DatePicker    = require('material-ui/lib/date-picker/date-picker'),
  TextField     = require('material-ui/lib/text-field'),
  ToolbarSeparator = require('material-ui/lib/toolbar/toolbar-separator'),
  ToolbarGroup  = require('material-ui/lib/toolbar/toolbar-group'),
  ToolbarTitle  = require('material-ui/lib/toolbar/toolbar-title');

/*
 * Sample From: https://developers.google.com/maps/documentation/javascript/examples/map-simple
 *
 * Add <script src="https://maps.googleapis.com/maps/api/js"></script> to your HTML to provide google.maps reference
 */
var Filter = React.createClass({
  mixins: [FluxMixin, StoreWatchMixin("LocationsStore", "DevicesStore")],
  /*
   * 1. Create a component that wraps all your map sub-components.
   */
  childContextTypes: {
    muiTheme: React.PropTypes.object
  },
  getChildContext: function() {
    return {
      //muiTheme: ThemeManager.getCurrentTheme()
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
      devices: []
    };
  },

  getStateFromFlux: function() {  
    return {};
  },

  componentWillMount: function() {
    /*
    ThemeManager.setPalette({
      accent1Color: Colors.deepOrange500,
    });
    */
    //ThemeManager.setTheme(ThemeManager.types.LIGHT);
  },
  componentDidMount: function() {

    var me = this;
    var flux = this.getFlux();

    flux.actions.loadDevices();

    // Init filter form
    var startDate = new Date();
    var startTime = "00:00";
    var endDate = new Date();
    var endTime = "23:59";

    var filter = this.getFilter();
    if (filter.start_date && filter.end_date) {
      startDate = new Date(filter.start_date);
      endTime = moment(startDate).format("HH:mm");
      endDate = new Date(filter.end_date);
      endTime = moment(endDate).format("HH:mm");
    }

    flux.on("dispatch", function(type, payload) {
      
      if (type === Constants.LOAD_DEVICES_SUCCESS) {
        me.onLoadDevices(payload);
      }
    });
  
    this.setState({
      startDate: startDate,
      startTime: startTime,
      endDate: endDate,
      endTime: endTime
    });
  },

  onLoadDevices: function(payload) {
    var filter = this.getFilter(), 
        deviceIndex = 0;
    if (!filter.device_id && payload.data.length) {
      filter.device_id = payload.data[0].device_id;
      this.setFilter(filter);
    }
    for (var n=0,len=payload.data.length;n<len;n++) {
      if (payload.data[n].device_id === filter.device_id) {
        deviceIndex = n;
      }
    }
    this.setState({
      devices: payload.data,
      deviceIndex: deviceIndex
    });
    this.onFilter();
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
    if (device.props.selectedIndex >= 0 && device.props.menuItems.length) {
      filter.device_id  = device.props.menuItems[device.props.selectedIndex].device_id
    }
    this.setFilter(filter);

    this.getFlux().actions.loadLocations(filter);
  },

  onSelectDevice: function(events, index, value) {
    var filter = this.getFilter();
    filter.device_id = value;
    this.setFilter(filter);

    this.setState({
      device: value,
      deviceIndex: index
    });
  },
  onChangeTime: function(ev) {
    var target = ev.currentTarget;
    var state = {};
    state[target.id] = target.value;
    this.setState(state);  
  },

  formatDate: function(date) {
    return moment(date).format("YYYY-MM-DD");
  },

  render: function() {
    var today = new Date();
    const items = [];
    for (let i = 0; i < this.state.devices.length; i++ ) {
      items.push(<MenuItem value={this.state.devices[i].device_id} key={i} primaryText={this.state.devices[i].device_model}/>);
    }
    return (

      <Toolbar style={{backgroundColor:"#fff"}}>
        <ToolbarGroup key={0}>
          <ToolbarTitle text="Device:" style={{float:"left"}} />
          <SelectField ref="device" value={this.state.device} onChange={this.onSelectDevice} style={{float:"left", marginTop:"5px", width:"300px"}} >
          {items}
          </SelectField>
        </ToolbarGroup>

        <ToolbarGroup key={1} float="left">
          <ToolbarTitle text="Start date" style={{float:"left", marginLeft:"20px"}} />
          <DatePicker id="startDate" ref="startDate" autoOk={true} width="100px" formatDate={this.formatDate} defaultDate={today} style={{marginTop:"5px", float: "left", width: "100px"}} textFieldStyle={{width:"100px"}}/>
          <TextField id="startTime" ref="startTime" defaultValue="00:00" value={this.state.startTime} onChange={this.onChangeTime} width="100" style={{marginLeft: "10px", marginTop: "5px", float: "left", width: "50px"}} />
        </ToolbarGroup>

        <ToolbarGroup key={2} float="left" style={{marginLeft:"20px"}}>
          <ToolbarTitle text="End date" style={{float:"left"}} />
          <DatePicker id="endDate" ref="endDate" autoOk={true} formatDate={this.formatDate} defaultDate={today} style={{marginTop:"5px", float: "left"}} textFieldStyle={{width:"100px"}} />
          <TextField id="endTime" ref="endTime" defaultValue="23:59" value={this.state.endTime} onChange={this.onChangeTime} style={{marginLeft: "10px", marginTop:"5px", float: "left", width: "50px"}} />
          <RaisedButton label="Filter" primary={true} onClick={this.onFilter}  />
        </ToolbarGroup>
      </Toolbar>
    );
  }
});

module.exports = Filter;

