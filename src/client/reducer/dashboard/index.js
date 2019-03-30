// @flow
import { API_URL } from '~/constants';
import { type GlobalState } from '~/reducer/state';
import cloneState from '~/utils/cloneState';
import _ from 'lodash';
import qs from 'querystring';
import { fitBoundsBus, scrollToRowBus, changeTabBus } from '~/globalBus';
import { setSettings, getSettings, getUrlSettings, setUrlSettings, type StoredSettings } from '~/storage';
import GA from '~/utils/GA';

// Types
export type Device = {|
  id: string,
  name: string,
|};
export type CompanyToken = {|
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
  created_at: string,
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
  companyTokenFromSearch: string,
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
  maxMarkers: number,
  devices: Device[],
  companyTokens: CompanyToken[],
  locations: Location[],
  testMarkers: Object,
  selectedLocationId: ?string,
  currentLocation: ?Location,
  isWatching: boolean,
|};

// Action Types
type SetCompanyTokensAction = {|
  type: 'dashboard/SET_COMPANY_TOKENS',
  companyTokens: CompanyToken[],
|};
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

type AutoselectOrInvalidateSelectedCompanyTokenAction = {|
  type: 'dashboard/AUTOSELECT_OR_INVALIDATE_SELECTED_COMPANY_TOKEN',
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
type SetMaxMarkersAction = {|
  type: 'dashboard/SET_MAX_MARKERS',
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

type SetCompanyTokenFromSearchAction = {|
  type: 'dashboard/SET_COMPANY_TOKEN_FROM_SEARCH',
  value: string,
|};
// Combining Actions

type AddTestMarkerAction = {|
  type: 'dashboard/ADD_TEST_MARKER',
  value: Object
|};

type Action =
  | SetCompanyTokensAction
  | SetDevicesAction
  | SetLocationsAction
  | SetIsLoadingAction
  | SetHasDataAction
  | AutoselectOrInvalidateSelectedDeviceAction
  | AutoselectOrInvalidateSelectedCompanyTokenAction
  | InvalidateSelectedLocationAction
  | SetShowMarkersAction
  | SetShowPolylineAction
  | SetShowGeofenceHitsAction
  | SetMaxMarkersAction
  | SetIsWatchingAction
  | SetCurrentLocationAction
  | SetStartDateAction
  | SetEndDateAction
  | SetDeviceAction
  | SetSelectedLocationAction
  | ApplyExistingSettinsAction
  | SetActiveTabAction
  | SetCompanyTokenAction
  | AddTestMarkerAction
  | SetCompanyTokenFromSearchAction;

type GetState = () => GlobalState;
type Dispatch = (action: Action | ThunkAction) => Promise<void>; // eslint-disable-line no-use-before-define
type ThunkAction = (dispatch: Dispatch, getState: GetState) => Promise<void>;

// ------------------------------------
// Action Creators
// ------------------------------------

export function setCompanyTokens (companyTokens: CompanyToken[]): SetCompanyTokensAction {
  return {
    type: 'dashboard/SET_COMPANY_TOKENS',
    companyTokens: companyTokens,
  };
}
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

export function autoselectOrInvalidateSelectedCompanyToken (): AutoselectOrInvalidateSelectedCompanyTokenAction {
  return {
    type: 'dashboard/AUTOSELECT_OR_INVALIDATE_SELECTED_COMPANY_TOKEN',
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

export function setShowMaxMarkers (value: boolean): SetMaxMarkersAction {
  return {
    type: 'dashboard/SET_MAX_MARKERS',
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

export function setCompanyTokenFromSearch (value: string): SetCompanyTokenFromSearchAction {
  return {
    type: 'dashboard/SET_COMPANY_TOKEN_FROM_SEARCH',
    value: value,
  };
}

export function doAddTestMarker(value: Object): AddTestMarkerAction {
  return {
    type: 'dashboard/ADD_TEST_MARKER',
    value: value
  }
}

// ------------------------------------
// Thunk Actions
// ------------------------------------
export function loadInitialData (id: string): ThunkAction {
  return async function (dispatch: Dispatch, getState: GetState): Promise<void> {
    if (getState().dashboard.hasData) {
      console.error('extra call after everything is set up!');
      return;
    }
    await dispatch(setCompanyTokenFromSearch(id));
    const existingSettings = getSettings(getState().dashboard.companyTokenFromSearch);
    const urlSettings = getUrlSettings();
    await dispatch(applyExistingSettings(existingSettings));
    await dispatch(applyExistingSettings(urlSettings));
    await dispatch(setHasData(false));
    await dispatch(reload());
    await dispatch(setHasData(true));
    // set a timer as a side effect
    setTimeout(() => dispatch(reload()), 60 * 1000);
    GA.sendEvent('tracker', 'load:' + id);
  };
}

export function reload (): ThunkAction {
  return async function (dispatch: Dispatch, getState: GetState): Promise<void> {
    await dispatch(setIsLoading(true));
    await dispatch(loadCompanyTokens());
    await dispatch(autoselectOrInvalidateSelectedCompanyToken());
    await dispatch(loadDevices());
    await dispatch(autoselectOrInvalidateSelectedDevice());
    await dispatch(loadLocations());
    await dispatch(loadCurrentLocation());
    await dispatch(invalidateSelectedLocation());
    await dispatch(setIsLoading(false));
    fitBoundsBus.emit({});
  };
}

export function deleteActiveDevice (): ThunkAction {
  return async function (dispatch: Dispatch, getState: GetState): Promise<void> {
    const deviceId = getState().dashboard.deviceId;
    if (!deviceId) {
      return;
    }
    await fetch(`${API_URL}/devices/${deviceId}`, { method: 'delete' });
    await dispatch(reload());
    GA.sendEvent('tracker', 'delete device:' + deviceId);
  };
}

export function loadCompanyTokens (): ThunkAction {
  return async function (dispatch: Dispatch, getState: GetState): Promise<void> {
    const { companyTokenFromSearch } = getState().dashboard;
    const params = qs.stringify({
      company_token: companyTokenFromSearch,
    });
    const response = await fetch(`${API_URL}/company_tokens?${params}`);
    const records = await response.json();
    const companyTokens: CompanyToken[] = records.map((companyToken: { company_token: string }) => ({
      id: companyToken.company_token,
      name: companyToken.company_token,
    }));
    dispatch(setCompanyTokens(companyTokens));
  };
}

export function loadDevices (): ThunkAction {
  return async function (dispatch: Dispatch, getState: GetState): Promise<void> {
    const { companyToken } = getState().dashboard;
    const params = qs.stringify({
      company_token: companyToken,
    });
    const response = await fetch(`${API_URL}/devices?${params}`);
    const records = await response.json();
    const devices: Device[] = records.map((record: Object) => ({ id: record.device_id, name: record.device_model }));
    dispatch(setDevices(devices));
  };
}

export function loadLocations (): ThunkAction {
  return async function (dispatch: Dispatch, getState: GetState): Promise<void> {
    const { deviceId, companyToken, startDate, endDate, maxMarkers } = getState().dashboard;
    GA.sendEvent('tracker', 'loadLocations', companyToken);

    const params = qs.stringify({
      company_token: companyToken,
      device_id: deviceId,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      limit: maxMarkers
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
    setSettings(getState().dashboard.companyTokenFromSearch, { startDate: value });
    const dashboard = getState().dashboard;
    setUrlSettings({
      startDate: dashboard.startDate,
      endDate: dashboard.endDate,
      deviceId: dashboard.deviceId,
      companyTokenFromSearch: dashboard.companyTokenFromSearch,
    });
    await dispatch(reload());
  };
}
export function changeEndDate (value: Date) {
  return async function (dispatch: Dispatch, getState: GetState): Promise<void> {
    await dispatch(setEndDate(value));
    setSettings(getState().dashboard.companyTokenFromSearch, { endDate: value });
    const dashboard = getState().dashboard;
    setUrlSettings({
      startDate: dashboard.startDate,
      endDate: dashboard.endDate,
      deviceId: dashboard.deviceId,
      companyTokenFromSearch: dashboard.companyTokenFromSearch,
    });
    await dispatch(reload());
  };
}

export function changeCompanyToken (value: string) {
  return async function (dispatch: Dispatch, getState: GetState): Promise<void> {
    await dispatch(setCompanyToken(value));
    setSettings(getState().dashboard.companyTokenFromSearch, { companyToken: value });
    await dispatch(reload());
  };
}
export function changeDeviceId (value: string) {
  return async function (dispatch: Dispatch, getState: GetState): Promise<void> {
    await dispatch(setDevice(value));
    setSettings(getState().dashboard.companyTokenFromSearch, { deviceId: value });
    const dashboard = getState().dashboard;
    setUrlSettings({
      startDate: dashboard.startDate,
      endDate: dashboard.endDate,
      deviceId: dashboard.deviceId,
      companyTokenFromSearch: dashboard.companyTokenFromSearch,
    });
    await dispatch(reload());
  };
}

export function changeIsWatching (value: boolean) {
  return async function (dispatch: Dispatch, getState: GetState): Promise<void> {
    await dispatch(setIsWatching(value));
    setSettings(getState().dashboard.companyTokenFromSearch, { isWatching: value });
  };
}

export function changeShowMarkers (value: boolean) {
  return async function (dispatch: Dispatch, getState: GetState): Promise<void> {
    await dispatch(setShowMarkers(value));
    setSettings(getState().dashboard.companyTokenFromSearch, { showMarkers: value });
  };
}

export function changeShowPolyline (value: boolean) {
  return async function (dispatch: Dispatch, getState: GetState): Promise<void> {
    await dispatch(setShowPolyline(value));
    setSettings(getState().dashboard.companyTokenFromSearch, { showPolyline: value });
  };
}

export function changeShowGeofenceHits (value: boolean) {
  return async function (dispatch: Dispatch, getState: GetState): Promise<void> {
    await dispatch(setShowGeofenceHits(value));
    setSettings(getState().dashboard.companyTokenFromSearch, { showGeofenceHits: value });
  };
}

export function changeMaxMarkers (value: boolean) {
  return async function (dispatch: Dispatch, getState: GetState): Promise<void> {
    await dispatch(setShowMaxMarkers(value));
    setSettings(getState().dashboard.companyTokenFromSearch, { maxMarkers: value });
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
    setSettings(getState().dashboard.companyTokenFromSearch, { activeTab: tab });
    changeTabBus.emit({ tab });
  };
}

export function addTestMarker (value: Object): ThunkAction {
  return async function (dispatch: Dispatch, getState: GetState): Promise<void> {
    dispatch(doAddTestMarker(value));
  };
}
// ------------------------------------
// Action Handlers
// ------------------------------------

const setCompanyTokensHandler = function (state: DashboardState, action: SetCompanyTokensAction): DashboardState {
  return cloneState(state, { companyTokens: action.companyTokens });
};

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

const autoselectOrInvalidateSelectedCompanyTokenHandler = function (
  state: DashboardState,
  action: AutoselectOrInvalidateSelectedCompanyTokenAction
): DashboardState {
  if (state.companyTokens.length === 0) {
    return cloneState(state, { companyToken: 'bogus' });
  }
  if (state.companyTokens.length === 1) {
    return cloneState(state, { companyToken: state.companyTokens[0].id });
  }
  if (state.companyTokens.length > 1) {
    const existingCompanyToken = _.find(state.companyTokens, { id: state.companyToken });
    if (!existingCompanyToken) {
      return cloneState(state, { companyToken: state.companyTokens[0].id });
    } else {
      return state;
    }
  }
  return state;
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
const setMaxMarkersHandler = function (state: DashboardState, action: SetMaxMarkersAction): DashboardState {
  return cloneState(state, { maxMarkers: action.value });
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
const setCompanyTokenFromSearchHandler = function (state: DashboardState, action: SetCompanyTokenFromSearchAction) {
  return cloneState(state, { companyTokenFromSearch: action.value });
};

const addTestMarkerHandler = function(state: DashboardState, action: AddTestMarkerAction) {
  let markers = [].concat(state.testMarkers);
  markers.push(action.data);
  return cloneState(state, {testMarkers: markers});
}
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
  companyTokenFromSearch: '',
  companyToken: '',
  companyTokens: [],
  activeTab: 'map',
  devices: [],
  deviceId: null,
  startDate: getStartDate(),
  endDate: getEndDate(),
  hasData: false,
  isLoading: false,
  locations: [],
  testMarkers: [],
  showGeofenceHits: true,
  showMarkers: true,
  showPolyline: true,
  maxMarkers: 1000,
  selectedLocationId: null,
  currentLocation: null,
  isWatching: false,
};

// ------------------------------------
// Reducer
// ------------------------------------
export default function spotsReducer (state: DashboardState = initialState, action: Action): DashboardState {
  switch (action.type) {
    case 'dashboard/SET_COMPANY_TOKENS':
      return setCompanyTokensHandler(state, action);
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
    case 'dashboard/AUTOSELECT_OR_INVALIDATE_SELECTED_COMPANY_TOKEN':
      return autoselectOrInvalidateSelectedCompanyTokenHandler(state, action);
    case 'dashboard/INVALIDATE_SELECTED_LOCATION':
      return invalidateSelectedLocationHandler(state, action);
    case 'dashboard/SET_SHOW_MARKERS':
      return setShowMarkersHandler(state, action);
    case 'dashboard/SET_SHOW_POLYLINE':
      return setShowPolylineHandler(state, action);
    case 'dashboard/SET_SHOW_GEOFENCE_HITS':
      return setShowGeofenceHitsHandler(state, action);
    case 'dashboard/SET_MAX_MARKERS':
      return setMaxMarkersHandler(state, action);
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
    case 'dashboard/SET_COMPANY_TOKEN_FROM_SEARCH':
      return setCompanyTokenFromSearchHandler(state, action);
    case 'ADD_TEST_MARKER':
      return addTestMarkerHandler(state, action);
    default:
      (action: empty); // eslint-disable-line no-unused-expressions
      return state;
  }
}
