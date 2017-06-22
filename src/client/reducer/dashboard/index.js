// @flow
import { API_URL } from '~/constants';
import { type GlobalState } from '~/reducer/state';
import cloneState from '~/utils/cloneState';
import _ from 'lodash';
import qs from 'querystring';

// Types
export type Filters = {
  deviceId: ?string,
  startDate: string,
  endDate: string,
};

export type Device = {
  id: string,
  name: string,
};
export type Location = {
  device_id: string,
  activity_type: string,
  activity_confidence: number,
  uuid: string,
  event: string,
  recorded_at: string,
  latitude: number,
  longitude: number,
  accuracy: number,
  odometer: number,
  speed: number,
  battery_level: number,
  battery_is_charging: boolean,
  geofence: {
    action: string,
    identifier: string,
  },
};

export type DashboardState = {
  isLoading: boolean,
  hasData: boolean,
  filters: Filters,
  showMarkers: boolean,
  showPolyline: boolean,
  showGeofenceHits: boolean,
  devices: Device[],
  locations: Location[],
  selectedLocationId: ?string,
  currentLocation: ?Location,
  isWatching: boolean,
};

// Action Types

type SetDevicesAction = {
  type: 'dashboard/SET_DEVICES',
  devices: Device[],
};

type SetLocationsAction = {
  type: 'dashboard/SET_LOCATIONS',
  locations: Location[],
};

type SetIsLoadingAction = {
  type: 'dashboard/SET_IS_LOADING',
  status: boolean,
};
type SetHasDataAction = {
  type: 'dashboard/SET_HAS_DATA',
  status: boolean,
};

type SetStartDateAction = {
  type: 'dashboard/SET_START_DATE',
  value: string,
};

type SetEndDateAction = {
  type: 'dashboard/SET_END_DATE',
  value: string,
};

type AutoselectOrInvalidateSelectedDeviceAction = {
  type: 'dashboard/AUTOSELECT_OR_INVALIDATE_SELECTED_DEVICE',
};

type InvalidateSelectedLocationAction = {
  type: 'dashboard/INVALIDATE_SELECTED_LOCATION',
};

type SetShowMarkersAction = {
  type: 'dashboard/SET_SHOW_MARKERS',
  value: boolean,
};
type SetShowPolylineAction = {
  type: 'dashboard/SET_SHOW_POLYLINE',
  value: boolean,
};
type SetShowGeofenceHitsAction = {
  type: 'dashboard/SET_SHOW_GEOFENCE_HITS',
  value: boolean,
};
type SetIsWatchingAction = {
  type: 'dashboard/SET_IS_WATCHING',
  value: boolean,
};
type SetCurrentLocationAction = {
  type: 'dashboard/SET_CURRENT_LOCATION',
  location: ?Location,
};

type SetDeviceAction = {
  type: 'dashboard/SET_DEVICE',
  deviceId: string,
};

type SetSelectedLocationAction = {
  type: 'dashboard/SET_SELECTED_LOCATION',
  locationId: ?string,
};
// Combining Actions

type Action =
  | SetDevicesAction
  | SetLocationsAction
  | SetIsLoadingAction
  | SetHasDataAction
  | AutoselectOrInvalidateSelectedDeviceAction
  | InvalidateSelectedLocationAction
  | SetShowMarkersAction
  | SetShowPolylineAction
  | SetShowGeofenceHitsAction
  | SetIsWatchingAction
  | SetCurrentLocationAction
  | SetStartDateAction
  | SetEndDateAction
  | SetDeviceAction
  | SetSelectedLocationAction;

type GetState = () => GlobalState;
type Dispatch = (action: Action | ThunkAction) => Promise<void>; // eslint-disable-line no-use-before-define
type ThunkAction = (dispatch: Dispatch, getState: GetState) => Promise<void>;

// ------------------------------------
// Action Creators
// ------------------------------------

export function setDevices (devices: Device[]): SetDevicesAction {
  return {
    type: 'dashboard/SET_DEVICES',
    devices: devices,
  };
}

export function setLocations (locations: Location[]): SetLocationsAction {
  return {
    type: 'dashboard/SET_LOCATIONS',
    locations: locations,
  };
}

export function setHasData (status: boolean): SetHasDataAction {
  return {
    type: 'dashboard/SET_HAS_DATA',
    status: status,
  };
}

export function setIsLoading (status: boolean): SetIsLoadingAction {
  return {
    type: 'dashboard/SET_IS_LOADING',
    status: status,
  };
}

export function autoselectOrInvalidateSelectedDevice (): AutoselectOrInvalidateSelectedDeviceAction {
  return {
    type: 'dashboard/AUTOSELECT_OR_INVALIDATE_SELECTED_DEVICE',
  };
}

export function invalidateSelectedLocation (): InvalidateSelectedLocationAction {
  return {
    type: 'dashboard/INVALIDATE_SELECTED_LOCATION',
  };
}

export function setShowMarkers (value: boolean): SetShowMarkersAction {
  return {
    type: 'dashboard/SET_SHOW_MARKERS',
    value: value,
  };
}
export function setShowPolyline (value: boolean): SetShowPolylineAction {
  return {
    type: 'dashboard/SET_SHOW_POLYLINE',
    value: value,
  };
}
export function setShowGeofenceHits (value: boolean): SetShowGeofenceHitsAction {
  return {
    type: 'dashboard/SET_SHOW_GEOFENCE_HITS',
    value: value,
  };
}

export function setIsWatching (value: boolean): SetIsWatchingAction {
  return {
    type: 'dashboard/SET_IS_WATCHING',
    value: value,
  };
}

export function setCurrentLocation (location: ?Location): SetCurrentLocationAction {
  return {
    type: 'dashboard/SET_CURRENT_LOCATION',
    location: location,
  };
}

export function setStartDate (value: string): SetStartDateAction {
  return {
    type: 'dashboard/SET_START_DATE',
    value: value,
  };
}

export function setEndDate (value: string): SetEndDateAction {
  return {
    type: 'dashboard/SET_END_DATE',
    value: value,
  };
}

export function setDevice (deviceId: string): SetDeviceAction {
  return {
    type: 'dashboard/SET_DEVICE',
    deviceId: deviceId,
  };
}

export function setSelectedLocation (locationId: string): SetSelectedLocationAction {
  return {
    type: 'dashboard/SET_SELECTED_LOCATION',
    locationId: locationId,
  };
}

export function unselectLocation (): SetSelectedLocationAction {
  return {
    type: 'dashboard/SET_SELECTED_LOCATION',
    locationId: null,
  };
}

// ------------------------------------
// Thunk Actions
// ------------------------------------
export function loadInitialData (): ThunkAction {
  return async function (dispatch: Dispatch, getState: GetState): Promise<void> {
    if (getState().dashboard.hasData) {
      console.error('extra call after everything is set up!');
      return;
    }
    await dispatch(setHasData(false));
    await dispatch(reload());
    await dispatch(setHasData(true));
    // set a timer as a side effect
    setTimeout(() => dispatch(reload()), 60 * 1000);
  };
}

export function reload (): ThunkAction {
  return async function (dispatch: Dispatch, getState: GetState): Promise<void> {
    await dispatch(setIsLoading(true));
    await dispatch(loadDevices());
    await dispatch(autoselectOrInvalidateSelectedDevice());
    await dispatch(loadLocations());
    await dispatch(loadCurrentLocation());
    await dispatch(invalidateSelectedLocation());
    await dispatch(setIsLoading(false));
  };
}

export function loadDevices (): ThunkAction {
  return async function (dispatch: Dispatch, getState: GetState): Promise<void> {
    const response = await fetch(`${API_URL}/devices`);
    const records = await response.json();
    const devices: Device[] = records.map((record: Object) => ({ id: record.device_id, name: record.device_name }));
    dispatch(setDevices(devices));
  };
}

export function loadLocations (): ThunkAction {
  return async function (dispatch: Dispatch, getState: GetState): Promise<void> {
    const filters = getState().dashboard.filters;
    const params = qs.stringify({
      device_id: filters.deviceId,
      start_date: filters.startDate,
      end_date: filters.endDate,
    });
    const response = await fetch(`${API_URL}/locations?${params}`);
    const records = await response.json();
    dispatch(setLocations(records));
  };
}

export function loadCurrentLocation (): ThunkAction {
  return async function (dispatch: Dispatch, getState: GetState): Promise<void> {
    const { deviceId } = getState().dashboard.filters;
    const params = qs.stringify({
      device_id: deviceId,
    });
    const response = await fetch(`${API_URL}/locations/latest?${params}`);
    const currentLocation = await response.json();
    await dispatch(setCurrentLocation(currentLocation));
  };
}

export function setIsWatchingAndReload (value: boolean) {
  return async function (dispatch: Dispatch, getState: GetState): Promise<void> {
    await dispatch(setIsWatching(value));
    await dispatch(reload());
  };
}

export function setStartDateAndReload (value: string) {
  return async function (dispatch: Dispatch, getState: GetState): Promise<void> {
    await dispatch(setStartDate(value));
    await dispatch(reload());
  };
}
export function setEndDateAndReload (value: string) {
  return async function (dispatch: Dispatch, getState: GetState): Promise<void> {
    await dispatch(setEndDate(value));
    await dispatch(reload());
  };
}

export function setDeviceAndReload (value: string) {
  return async function (dispatch: Dispatch, getState: GetState): Promise<void> {
    await dispatch(setDevice(value));
    await dispatch(reload());
  };
}

// ------------------------------------
// Action Handlers
// ------------------------------------

const setDevicesActionHandler = function (state: DashboardState, action: SetDevicesAction): DashboardState {
  return cloneState(state, { devices: action.devices });
};

const setLocationsActionHandler = function (state: DashboardState, action: SetLocationsAction): DashboardState {
  return cloneState(state, { locations: action.locations });
};

const autoselectOrInvalidateSelectedDeviceHandler = function (
  state: DashboardState,
  action: AutoselectOrInvalidateSelectedDeviceAction
): DashboardState {
  if (state.devices.length === 0) {
    return cloneState(state, { filters: cloneState(state.filters, { deviceId: null }) });
  }
  if (state.devices.length === 1) {
    return cloneState(state, { filters: cloneState(state.filters, { deviceId: state.devices[0].id }) });
  }
  if (state.devices.length > 1) {
    const existingDevice = _.find(state.devices, { id: state.filters.deviceId });
    if (!existingDevice) {
      return cloneState(state, { filters: cloneState(state.filters, { deviceId: state.devices[0].id }) });
    } else {
      return state;
    }
  }
  return state;
};

const invalidateSelectedLocationHandler = function (
  state: DashboardState,
  action: InvalidateSelectedLocationAction
): DashboardState {
  if (!state.selectedLocationId) {
    return state;
  }
  if (state.isWatching) {
    return cloneState(state, { selectedLocationId: state.currentLocation ? state.currentLocation.uuid : null });
  } else {
    const existingLocation = _.find(state.locations, { id: state.locations });
    if (!existingLocation) {
      return cloneState(state, { selectedLocationId: null });
    } else {
      return state;
    }
  }
};

const setIsLoadingHandler = function (state: DashboardState, action: SetIsLoadingAction): DashboardState {
  return cloneState(state, { isLoading: action.status });
};
const setHasDataHandler = function (state: DashboardState, action: SetHasDataAction): DashboardState {
  return cloneState(state, { hasData: action.status });
};

const setShowMarkersHandler = function (state: DashboardState, action: SetShowMarkersAction): DashboardState {
  return cloneState(state, { showMarkers: action.value });
};

const setShowPolylineHandler = function (state: DashboardState, action: SetShowPolylineAction): DashboardState {
  return cloneState(state, { showPolyline: action.value });
};
const setShowGeofenceHitsHandler = function (state: DashboardState, action: SetShowGeofenceHitsAction): DashboardState {
  return cloneState(state, { showPolyline: action.value });
};
const setIsWatchingHandler = function (state: DashboardState, action: SetIsWatchingAction): DashboardState {
  return cloneState(state, { isWatching: action.value });
};
const setCurrentLocationHandler = function (state: DashboardState, action: SetCurrentLocationAction): DashboardState {
  return cloneState(state, { currentLocation: action.location });
};
const setStartDateHandler = function (state: DashboardState, action: SetStartDateAction): DashboardState {
  return cloneState(state, { filters: cloneState(state.filters, { startDate: action.value }) });
};
const setEndDateHandler = function (state: DashboardState, action: SetEndDateAction): DashboardState {
  return cloneState(state, { filters: cloneState(state.filters, { endDate: action.value }) });
};
const setDeviceHandler = function (state: DashboardState, action: SetDeviceAction): DashboardState {
  return cloneState(state, { filters: cloneState(state.filters, { deviceId: action.deviceId }) });
};
const setSelectedLocationHandler = function (state: DashboardState, action: SetSelectedLocationAction): DashboardState {
  return cloneState(state, { selectedLocationId: action.locationId });
};

// ------------------------------------
// Initial State
// ------------------------------------
const getStartDate = function () {
  var startDate = new Date();
  startDate.setHours(0);
  startDate.setMinutes(0);
  return startDate.toISOString();
};

const getEndDate = function () {
  var endDate = new Date();
  endDate.setHours(23);
  endDate.setMinutes(59);
  return endDate.toISOString();
};

const initialState: DashboardState = {
  devices: [],
  filters: {
    deviceId: null,
    startDate: getStartDate(),
    endDate: getEndDate(),
  },
  hasData: false,
  isLoading: false,
  locations: [],
  showGeofenceHits: true,
  showMarkers: true,
  showPolyline: true,
  selectedLocationId: null,
  currentLocation: null,
  deviceId: null,
  isWatching: false,
};

// ------------------------------------
// Reducer
// ------------------------------------
export default function spotsReducer (state: DashboardState = initialState, action: Action): DashboardState {
  switch (action.type) {
    case 'dashboard/SET_DEVICES':
      return setDevicesActionHandler(state, action);
    case 'dashboard/SET_LOCATIONS':
      return setLocationsActionHandler(state, action);
    case 'dashboard/SET_IS_LOADING':
      return setIsLoadingHandler(state, action);
    case 'dashboard/SET_HAS_DATA':
      return setHasDataHandler(state, action);
    case 'dashboard/AUTOSELECT_OR_INVALIDATE_SELECTED_DEVICE':
      return autoselectOrInvalidateSelectedDeviceHandler(state, action);
    case 'dashboard/INVALIDATE_SELECTED_LOCATION':
      return invalidateSelectedLocationHandler(state, action);
    case 'dashboard/SET_SHOW_MARKERS':
      return setShowMarkersHandler(state, action);
    case 'dashboard/SET_SHOW_POLYLINE':
      return setShowPolylineHandler(state, action);
    case 'dashboard/SET_SHOW_GEOFENCE_HITS':
      return setShowGeofenceHitsHandler(state, action);
    case 'dashboard/SET_IS_WATCHING':
      return setIsWatchingHandler(state, action);
    case 'dashboard/SET_CURRENT_LOCATION':
      return setCurrentLocationHandler(state, action);
    case 'dashboard/SET_START_DATE':
      return setStartDateHandler(state, action);
    case 'dashboard/SET_END_DATE':
      return setEndDateHandler(state, action);
    case 'dashboard/SET_DEVICE':
      return setDeviceHandler(state, action);
    case 'dashboard/SET_SELECTED_LOCATION':
      return setSelectedLocationHandler(state, action);
    default:
      (action: empty); // eslint-disable-line no-unused-expressions
      return state;
  }
}
