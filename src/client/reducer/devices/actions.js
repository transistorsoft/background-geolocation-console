import { API_URL } from '~/constants';
export const SET_DEVICES = 'SET_DEVICES';

/**
* /devices
*/
export function getDevices () {
  return async function (dispatch, getState) {
    const response = await fetch(`${API_URL}/devices`);
    const devices = await response.json();
    dispatch(setDevices(devices));
  };
}

export function setDevices (devices) {
  return {
    type: SET_DEVICES,
    devices,
  };
}
