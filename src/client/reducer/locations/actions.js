import { API_URL } from '~/constants';
import qs from 'querystring';
export const SET_LOCATIONS = 'SET_LOCATIONS';

/**
* locations
*/
export function getLocations (filter) {
  return async function (dispatch, getState) {
    const params = qs.stringify({
      device_id: filter.deviceId,
      start_date: filter.startDate.toISOString(),
      end_date: filter.endDate.toISOString(),
    });
    const response = await fetch(`${API_URL}/locations?${params}`);
    const locations = await response.json();
    dispatch(setLocations(locations));
  };
}

export function setLocations (locations) {
  return {
    type: SET_LOCATIONS,
    locations,
  };
}
