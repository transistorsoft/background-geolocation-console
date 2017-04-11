
import {EventEmitter} from 'events';
import * as moment from 'moment';

import store from '../store';
import {getLocations} from '../reducer/locations/actions';
import {getDevices} from '../reducer/devices/actions';

let instance = null;
let eventEmitter = new EventEmitter();

const SETTINGS = [
  {name: 'startDate', dataType: 'datetime'},
  {name: 'endDate', dataType: 'datetime'},
  {name: 'deviceId', dateType: 'string'},
  {name: 'showMarkers', dataType: 'boolean', defaultValue: true},
  {name: 'showPolyline', dataType: 'boolean', defaultValue: true},
  {name: 'showGeofenceHits', dataType: 'boolean', defaultValue: true}
];

export default class App {

  static getInstance() {
    if (instance === null) {
      instance = new App();
    }
    return instance;
  }

  constructor(props) {
    this.state = this._loadState();
    this.selectedLocation = undefined;

    store.dispatch(getLocations(this.state));
    store.dispatch(getDevices());
  }

  getStore() {
    return store;
  }

  getState() {
    return this.state;
  }

  set(key, value) {
    this.state[key] = value;
    this._saveState(this.state);

    switch(key) {
      case 'deviceId':
      case 'startDate':
      case 'endDate':
        this.setLocation(null);
        store.dispatch(getLocations(this.state));
        break;
    }    
    eventEmitter.emit('filter', {
      name: key,
      value: value
    });
  }

  on(event, callback) {
    eventEmitter.addListener(event, callback);
  }

  setLocation(location) {
    this.selectedLocation = location;
    eventEmitter.emit('selectlocation', location);
  }

  _loadState() {
    let state = window.localStorage.getItem('settings');
    let defaultState = this._getDefaultState();
    if (!state) {
      state = defaultState;
      this._saveState(state);
    } else {
      state = JSON.parse(state);
      // Ensure each setting exists (in case we add settings)
      SETTINGS.forEach((setting) => {
        if (!state.hasOwnProperty(setting.name)) {
          state[setting.name] = defaultState[setting.name];
          this._saveState(state);
        }
      });
    }
    state.startDate = new Date(state.startDate);
    state.endDate = new Date(state.endDate);
    return state;
  }

  _saveState(state) {
    window.localStorage.setItem('settings', JSON.stringify(state));
  }

  _getDefaultState() {

    var startDate = new Date();
    startDate.setHours(0);
    startDate.setMinutes(0);

    var endDate = new Date();
    endDate.setHours(23);
    endDate.setMinutes(59);
      
    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      deviceId: '',
      showMarkers: true,
      showPolyline: true,
      showGeofenceHits: true
    }
  }
}
