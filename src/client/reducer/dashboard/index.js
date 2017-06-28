// @flow
import { API_URL } from '~/constants';
import { type GlobalState } from '~/reducer/state';
import cloneState from '~/utils/cloneState';
import _ from 'lodash';
import qs from 'querystring';
import { fitBoundsBus, scrollToRowBus, changeTabBus } from '~/globalBus';
import { setSettings, getSettings, type StoredSettings } from '~/storage';

// Types
export type Device = {|
  id: string,
  name: string,
|};
export type Tab = 'map' | 'list';
export type Location = {|
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
  heading: number,
  geofence: {
    action: string,
    identifier: string,
    extras?: {
      radius: number,
      center?: {
        latitude: number,
        longitude: number,
      },
    },
  },
|};

export type DashboardState = {|
  companyToken: string,
  activeTab: Tab,
  isLoading: boolean,
  hasData: boolean,
  deviceId: ?string,
  startDate: Date,
  endDate: Date,
  showMarkers: boolean,
  showPolyline: boolean,
  showGeofenceHits: boolean,
  devices: Device[],
  locations: Location[],
  selectedLocationId: ?string,
  currentLocation: ?Location,
  isWatching: boolean,
|};

// Action Types

type SetDevicesAction = {|
  type: 'dashboard/SET_DEVICES',
  devices: Device[],
|};

type SetLocationsAction = {|
  type: 'dashboard/SET_LOCATIONS',
  locations: Location[],
|};

type SetIsLoadingAction = {|
  type: 'dashboard/SET_IS_LOADING',
  status: boolean,
|};
type SetHasDataAction = {|
  type: 'dashboard/SET_HAS_DATA',
  status: boolean,
|};

type SetStartDateAction = {|
  type: 'dashboard/SET_START_DATE',
  value: Date,
|};

type SetEndDateAction = {|
  type: 'dashboard/SET_END_DATE',
  value: Date,
|};

type AutoselectOrInvalidateSelectedDeviceAction = {|
  type: 'dashboard/AUTOSELECT_OR_INVALIDATE_SELECTED_DEVICE',
|};

type InvalidateSelectedLocationAction = {|
  type: 'dashboard/INVALIDATE_SELECTED_LOCATION',
|};

type SetShowMarkersAction = {|
  type: 'dashboard/SET_SHOW_MARKERS',
  value: boolean,
|};
type SetShowPolylineAction = {|
  type: 'dashboard/SET_SHOW_POLYLINE',
  value: boolean,
|};
type SetShowGeofenceHitsAction = {|
  type: 'dashboard/SET_SHOW_GEOFENCE_HITS',
  value: boolean,
|};
type SetIsWatchingAction = {|
  type: 'dashboard/SET_IS_WATCHING',
  value: boolean,
|};
type SetCurrentLocationAction = {|
  type: 'dashboard/SET_CURRENT_LOCATION',
  location: ?Location,
|};

type SetDeviceAction = {|
  type: 'dashboard/SET_DEVICE',
  deviceId: string,
|};

type SetSelectedLocationAction = {|
  type: 'dashboard/SET_SELECTED_LOCATION',
  locationId: ?string,
|};

type ApplyExistingSettinsAction = {|
  type: 'dashboard/APPLY_EXISTING_SETTINGS',
  settings: StoredSettings,
|};

type SetActiveTabAction = {|
  type: 'dashboard/SET_ACTIVE_TAB',
  tab: Tab,
|};

type SetCompanyTokenAction = {|
  type: 'dashboard/SET_COMPANY_TOKEN',
  value: string,
|};
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
  | SetSelectedLocationAction
  | ApplyExistingSettinsAction
  | SetActiveTabAction
  | SetCompanyTokenAction;

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

export function setStartDate (value: Date): SetStartDateAction {
  return {
    type: 'dashboard/SET_START_DATE',
    value: value,
  };
}

export function setEndDate (value: Date): SetEndDateAction {
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

export function applyExistingSettings (settings: StoredSettings): ApplyExistingSettinsAction {
  return {
    type: 'dashboard/APPLY_EXISTING_SETTINGS',
    settings: settings,
  };
}

export function setActiveTab (tab: Tab): SetActiveTabAction {
  return {
    type: 'dashboard/SET_ACTIVE_TAB',
    tab: tab,
  };
}

export function setCompanyToken (value: string): SetCompanyTokenAction {
  return {
    type: 'dashboard/SET_COMPANY_TOKEN',
    value: value,
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
    const locationHash = (location.hash || '').substring(1);
    await dispatch(setCompanyToken(locationHash));
    const existingSettings = getSettings(getState().dashboard.companyToken);
    await dispatch(applyExistingSettings(existingSettings));
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
    fitBoundsBus.emit({});
  };
}

export function loadDevices (): ThunkAction {
  return async function (dispatch: Dispatch, getState: GetState): Promise<void> {
    const response = await fetch(`${API_URL}/devices`);
    const records = await response.json();
    const devices: Device[] = records.map((record: Object) => ({ id: record.device_id, name: record.device_model }));
    dispatch(setDevices(devices));
  };
}

export function loadLocations (): ThunkAction {
  return async function (dispatch: Dispatch, getState: GetState): Promise<void> {
    const { deviceId, companyToken, startDate, endDate } = getState().dashboard;
    const params = qs.stringify({
      company_token: companyToken,
      device_id: deviceId,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
    });
    const response = await fetch(`${API_URL}/locations?${params}`);
    const records = await response.json();
    dispatch(setLocations(records));
  };
}

export function loadCurrentLocation (): ThunkAction {
  return async function (dispatch: Dispatch, getState: GetState): Promise<void> {
    const { deviceId, companyToken } = getState().dashboard;
    if (deviceId) {
      const params = qs.stringify({
        device_id: deviceId,
        company_token: companyToken,
      });
      const response = await fetch(`${API_URL}/locations/latest?${params}`);
      const currentLocation = await response.json();
      await dispatch(setCurrentLocation(currentLocation));
    } else {
      await dispatch(setCurrentLocation(null));
    }
  };
}

export function changeStartDate (value: Date) {
  return async function (dispatch: Dispatch, getState: GetState): Promise<void> {
    await dispatch(setStartDate(value));
    setSettings(getState().dashboard.companyToken, { startDate: value });
    await dispatch(reload());
  };
}
export function changeEndDate (value: Date) {
  return async function (dispatch: Dispatch, getState: GetState): Promise<void> {
    await dispatch(setEndDate(value));
    setSettings(getState().dashboard.companyToken, { endDate: value });
    await dispatch(reload());
  };
}

export function changeDeviceId (value: string) {
  return async function (dispatch: Dispatch, getState: GetState): Promise<void> {
    await dispatch(setDevice(value));
    setSettings(getState().dashboard.companyToken, { deviceId: value });
    await dispatch(reload());
  };
}

export function changeIsWatching (value: boolean) {
  return async function (dispatch: Dispatch, getState: GetState): Promise<void> {
    await dispatch(setIsWatching(value));
    setSettings(getState().dashboard.companyToken, { isWatching: value });
  };
}

export function changeShowMarkers (value: boolean) {
  return async function (dispatch: Dispatch, getState: GetState): Promise<void> {
    await dispatch(setShowMarkers(value));
    setSettings(getState().dashboard.companyToken, { showMarkers: value });
  };
}

export function changeShowPolyline (value: boolean) {
  return async function (dispatch: Dispatch, getState: GetState): Promise<void> {
    await dispatch(setShowPolyline(value));
    setSettings(getState().dashboard.companyToken, { showPolyline: value });
  };
}

export function changeShowGeofenceHits (value: boolean) {
  return async function (dispatch: Dispatch, getState: GetState): Promise<void> {
    await dispatch(setShowGeofenceHits(value));
    setSettings(getState().dashboard.companyToken, { showGeofenceHits: value });
  };
}

export function clickMarker (locationId: string) {
  return async function (dispatch: Dispatch, getState: GetState): Promise<void> {
    await dispatch(setSelectedLocation(locationId));
    scrollToRowBus.emit({ locationId });
  };
}

export function changeActiveTab (tab: Tab) {
  return async function (dispatch: Dispatch, getState: GetState): Promise<void> {
    await dispatch(setActiveTab(tab));
    setSettings(getState().dashboard.companyToken, { activeTab: tab });
    changeTabBus.emit({ tab });
  };
}
// ------------------------------------
// Action Handlers
// ------------------------------------

const setDevicesHandler = function (state: DashboardState, action: SetDevicesAction): DashboardState {
  return cloneState(state, { devices: action.devices });
};

const areLocationsEqual = function (existingLocations: Location[], newLocations: Location[]) {
  const firstExistingLocation = existingLocations[0];
  const firstNewLocation = newLocations[0];
  const lastExistingLocation = existingLocations[existingLocations.length - 1];
  const lastNewLocation = newLocations[newLocations.length - 1];
  return _.isEqual([firstExistingLocation, lastExistingLocation], [firstNewLocation, lastNewLocation]);
};

const setLocationsHandler = function (state: DashboardState, action: SetLocationsAction): DashboardState {
  if (areLocationsEqual(state.locations, action.locations)) {
    return state;
  } else {
    return cloneState(state, { locations: action.locations });
  }
};

const autoselectOrInvalidateSelectedDeviceHandler = function (
  state: DashboardState,
  action: AutoselectOrInvalidateSelectedDeviceAction
): DashboardState {
  if (state.devices.length === 0) {
    return cloneState(state, { deviceId: null });
  }
  if (state.devices.length === 1) {
    return cloneState(state, { deviceId: state.devices[0].id });
  }
  if (state.devices.length > 1) {
    const existingDevice = _.find(state.devices, { id: state.deviceId });
    if (!existingDevice) {
      return cloneState(state, { deviceId: state.devices[0].id });
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
    const existingLocation = _.find(state.locations, { uuid: state.selectedLocationId });
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
  return cloneState(state, { showGeofenceHits: action.value });
};
const setIsWatchingHandler = function (state: DashboardState, action: SetIsWatchingAction): DashboardState {
  return cloneState(state, { isWatching: action.value });
};
const setCurrentLocationHandler = function (state: DashboardState, action: SetCurrentLocationAction): DashboardState {
  return cloneState(state, { currentLocation: action.location });
};
const setStartDateHandler = function (state: DashboardState, action: SetStartDateAction): DashboardState {
  return cloneState(state, { startDate: action.value });
};
const setEndDateHandler = function (state: DashboardState, action: SetEndDateAction): DashboardState {
  return cloneState(state, { endDate: action.value });
};
const setDeviceHandler = function (state: DashboardState, action: SetDeviceAction): DashboardState {
  return cloneState(state, { deviceId: action.deviceId });
};
const setSelectedLocationHandler = function (state: DashboardState, action: SetSelectedLocationAction): DashboardState {
  return cloneState(state, { selectedLocationId: action.locationId });
};
const applyExistingSettingsHandler = function (
  state: DashboardState,
  action: ApplyExistingSettinsAction
): DashboardState {
  return cloneState(state, action.settings);
};
const setActiveTabHandler = function (state: DashboardState, action: SetActiveTabAction) {
  return cloneState(state, { activeTab: action.tab });
};
const setCompanyTokenHandler = function (state: DashboardState, action: SetCompanyTokenAction) {
  return cloneState(state, { companyToken: action.value });
};

// ------------------------------------
// Initial State
// ------------------------------------
const getStartDate = function () {
  var startDate = new Date();
  startDate.setHours(0);
  startDate.setMinutes(0);
  return startDate;
};

const getEndDate = function () {
  var endDate = new Date();
  endDate.setHours(23);
  endDate.setMinutes(59);
  return endDate;
};

const initialState: DashboardState = {
  companyToken: '',
  activeTab: 'map',
  devices: [],
  deviceId: null,
  startDate: getStartDate(),
  endDate: getEndDate(),
  hasData: false,
  isLoading: false,
  locations: [],
  showGeofenceHits: true,
  showMarkers: true,
  showPolyline: true,
  selectedLocationId: null,
  currentLocation: null,
  isWatching: false,
};

// ------------------------------------
// Reducer
// ------------------------------------
export default function spotsReducer (state: DashboardState = initialState, action: Action): DashboardState {
  console.info('v2');
  switch (action.type) {
    case 'dashboard/SET_DEVICES':
      return setDevicesHandler(state, action);
    case 'dashboard/SET_LOCATIONS':
      return setLocationsHandler(state, action);
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
    case 'dashboard/APPLY_EXISTING_SETTINGS':
      return applyExistingSettingsHandler(state, action);
    case 'dashboard/SET_ACTIVE_TAB':
      return setActiveTabHandler(state, action);
    case 'dashboard/SET_COMPANY_TOKEN':
      return setCompanyTokenHandler(state, action);
    default:
      (action: empty); // eslint-disable-line no-unused-expressions
      return state;
  }
}
