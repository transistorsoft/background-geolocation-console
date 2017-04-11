import {combineReducers} from 'redux';
import locations from './locations';
import devices from './devices';

export default combineReducers({
  locations,
  devices,
});