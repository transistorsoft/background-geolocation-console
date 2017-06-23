import React, {
  Component
} from 'react';

import { connect } from 'react-redux';

import * as moment from 'moment';

import {
  AppBar,
  Button,
  IconButton,
  DatePicker,
  TimePicker,
  Switch,
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
      showGeofenceHits: state.showGeofenceHits,
      watchMode: false
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

  onClickReload() {
    App.getInstance().reload();
  }

  onToggleWatchMode() {
    let value = !this.state.watchMode;
    App.getInstance().setWatchMode(value);
    this.setState({watchMode: value});
  }

  render() {
    let devices = this.props.devices.map((device) => {
      return {value: device.device_id, label: device.device_model}
    });

    return (        
        <div className="filterView">
          <AppBar title="Filtro" rightIcon="refresh" onRightIconClick={this.onClickReload.bind(this)}></AppBar>
          <div className={Styles.content}>
            <Card style={{marginBottom:'10px'}}>
              <div className={Styles.content}>
                <h3>Ubicaciones</h3>
                <Dropdown
                  auto
                  label="Dispositivo"
                  onChange={this.onChange.bind(this, 'deviceId')}
                  source={devices}
                  value={this.state.deviceId}
                />
                <div style={{display:"flex", flexDirection:"row"}}>
                  <DatePicker 
                    label="Fecha Inicial" 
                    sundayFirstDayOfWeek
                    autoOk 
                    style={{flex:1}} 
                    onChange={this.onChange.bind(this, 'startDate')} 
                    value={this.state.startDate} 
                    inputFormat={this.formatDate.bind(this)} />
                  <TimePicker
                    label='Hora'
                    style={{flex:1}}
                    onChange={this.onChange.bind(this, 'startDate')}
                    value={this.state.startDate} />
                </div>
                <div style={{display:"flex", flexDirection:"row"}}>
                  <DatePicker 
                    label="Fecha Fin" 
                    sundayFirstDayOfWeek 
                    autoOk
                    style={{flex:1}} 
                    onChange={this.onChange.bind(this, 'endDate')} 
                    value={this.state.endDate} 
                    inputFormat={this.formatDate.bind(this)} />
                  <TimePicker
                    label='Hora'
                    style={{flex:1}}
                    onChange={this.onChange.bind(this, 'endDate')}
                    value={this.state.endDate} />
                </div>
                <Button icon="refresh" label="Refrescar" style={{width:'100%'}} raised primary onMouseUp={this.onClickReload.bind(this)}/>
                
                <!--
                <div style={{display:"flex", flexDirection:"row", marginTop: 10}}>
                  <label style={{flex:1}}>Watch mode</label>
                  <Switch checked={this.state.watchMode} onChange={this.onToggleWatchMode.bind(this)} style={{flex:1}}/>                
                </div>
                -->

              </div>
            </Card>
            <Card>
              <div className={Styles.content}>
                <h3>Mapa</h3>
                <Checkbox
                  checked={this.state.showMarkers}
                  label="Mostrar Marcadores"
                  onChange={this.onChange.bind(this, 'showMarkers')}
                />
                <Checkbox
                  checked={this.state.showPolyline}
                  label="Mostrar Lineas"
                  onChange={this.onChange.bind(this, 'showPolyline')}
                />
                <Checkbox
                  checked={this.state.showGeofenceHits}
                  label="Mostrar Geocercas"
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
