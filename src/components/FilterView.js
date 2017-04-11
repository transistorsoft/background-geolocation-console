import React, {
  Component
} from 'react';

import { connect } from 'react-redux';

import * as moment from 'moment';

import {
  AppBar,
  DatePicker,
  TimePicker,
  Checkbox,
  Dropdown,
  Card, CardTitle
} from 'react-toolbox';

import App from './App';
import Styles from '../assets/styles/app.css';

class FilterView extends Component {  

  constructor(props) {
    super(props);

    let app = App.getInstance();
    let state = app.getState();

    this.state = {
      startDate: state.startDate,
      endDate: state.endDate,
      deviceId: state.deviceId,
      showMarkers: state.showMarkers,
      showPolyline: state.showPolyline,
      showGeofenceHits: state.showGeofenceHits
    }
  }

  formatDate(date) {
    return moment(date).format("MM-DD");
  }

  onChange(name, value) {
    App.getInstance().set(name, value);

    let state = {};
    state[name] = value;
    this.setState(state);
  }

  render() {
    let devices = this.props.devices.map((device) => {
      return {value: device.device_id, label: device.device_model}
    });

    return (        
        <div className="filterView">
          <AppBar title="Filter"></AppBar>
          <div className={Styles.content}>
            <Card style={{marginBottom:'10px'}}>
              <div className={Styles.content}>
                <h3>Locations</h3>
                <Dropdown
                  auto
                  label="Device"
                  onChange={this.onChange.bind(this, 'deviceId')}
                  source={devices}
                  value={this.state.deviceId}
                />
                <div style={{display:"flex", flexDirection:"row"}}>
                  <DatePicker 
                    label="Start date" 
                    sundayFirstDayOfWeek
                    autoOk 
                    style={{flex:1}} 
                    onChange={this.onChange.bind(this, 'startDate')} 
                    value={this.state.startDate} 
                    inputFormat={this.formatDate.bind(this)} />
                  <TimePicker
                    label='Time'
                    style={{flex:1}}
                    onChange={this.onChange.bind(this, 'startDate')}
                    value={this.state.startDate} />
                </div>
                <div style={{display:"flex", flexDirection:"row"}}>
                  <DatePicker 
                    label="End date" 
                    sundayFirstDayOfWeek 
                    autoOk
                    style={{flex:1}} 
                    onChange={this.onChange.bind(this, 'endDate')} 
                    value={this.state.endDate} 
                    inputFormat={this.formatDate.bind(this)} />
                  <TimePicker
                    label='Time'
                    style={{flex:1}}
                    onChange={this.onChange.bind(this, 'endDate')}
                    value={this.state.endDate} />
                </div>
              </div>
            </Card>
            <Card>
              <div className={Styles.content}>
                <h3>Map</h3>
                <Checkbox
                  checked={this.state.showMarkers}
                  label="Show Markers"
                  onChange={this.onChange.bind(this, 'showMarkers')}
                />
                <Checkbox
                  checked={this.state.showPolyline}
                  label="Show Polyline"
                  onChange={this.onChange.bind(this, 'showPolyline')}
                />
                <Checkbox
                  checked={this.state.showGeofenceHits}
                  label="Show Geofences"
                  onChange={this.onChange.bind(this, 'showGeofenceHits')}
                />

              </div>
            </Card>
          </div>
        </div>
    );
  }
}

const mapStateToProps = function(store) {
  return {
    devices: store.devices
  };
};

export default connect(mapStateToProps)(FilterView);
