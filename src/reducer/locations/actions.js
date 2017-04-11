import {API_URL} from '../../constants';

export const SET_LOCATIONS = 'SET_LOCATIONS';

/**
* locations
*/
export function getLocations(filter) {
  return dispatch => {

    fetch(`${API_URL}/api/locations?device_id=${filter.deviceId}&start_date=${filter.startDate.toISOString()}&end_date=${filter.endDate.toISOString()}`)
      .then(res => res.json())
      .then(res => res)
      .then((locations) => {
        dispatch(setLocations(locations));
      });
  }
}

export function setLocations(locations) {
  return {
    type: SET_LOCATIONS,
    locations
  }
}
