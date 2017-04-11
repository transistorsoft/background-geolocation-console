import {API_URL} from '../../constants';

export const SET_DEVICES = 'SET_DEVICES';

/**
* /devices
*/
export function getDevices() {
  return dispatch => {

    fetch(`${API_URL}/api/devices`)
      .then(res => res.json())
      .then(res => res)
      .then(devices => 
        dispatch(setDevices(devices))
      );
  }
}

export function setDevices(devices) {
  console.log('- Devices: ', devices.length, devices);

  return {
    type: SET_DEVICES,
    devices
  }
}

