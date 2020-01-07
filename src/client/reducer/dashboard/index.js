/* eslint-disable no-console */
// @flow
import qs from 'querystring';
import isEqual from 'lodash/isEqual';

import {
  fitBoundsBus, scrollToRowBus, changeTabBus,
} from 'globalBus';
import {
  setSettings, getSettings, getUrlSettings, setUrlSettings, type StoredSettings,
} from 'storage';
import GA from 'utils/GA';
import { type GlobalState, type Tab } from 'reducer/state';
import cloneState from 'utils/cloneState';

import { API_URL } from '../../constants';

export type Source = {|
  value: string,
  label: string,
|};
export type MaterialInputElement = {|
  target: HTMLInputElement,
|};
export type Device = {|
  id: string,
  name: string,
|};
export type DeleteOptions = {|
  startDate: Date,
  endDate: Date,
|};
export type LoadParams = {|
  loadUsers: boolean,
|};
export type OrgToken = {|
  id: string,
  name: string,
|};
export type Location = {|
  accuracy: number,
  activity_confidence: number,
  activity_type: string,
  battery_is_charging: boolean,
  battery_level: number,
  company_id: number,
  created_at: string,
  device_id: string,
  event: string,
  heading: number,
  is_moving: string,
  latitude: number,
  longitude: number,
  odometer: number,
  recorded_at: string,
  speed: number,
  uuid: string,
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
export type Marker = {|
|};

export type DashboardState = {|
  activeTab: Tab,
  orgToken: string,
  companyId: number,
  orgTokenFromSearch: string,
  orgTokens: OrgToken[],
  currentLocation: ?Location,
  deviceId: ?string,
  devices: Device[],
  enableClustering: boolean,
  endDate: Date,
  hasData: boolean,
  isLoading: boolean,
  isWatching: boolean,
  locations: Location[],
  maxMarkers: number,
  selectedLocationId: ?string,
  showGeofenceHits: boolean,
  showMarkers: boolean,
  showPolyline: boolean,
  startDate: Date,
  testMarkers: Object,
|};

// Action Types
type SetOrgTokensAction = {|
  type: 'dashboard/SET_ORG_TOKENS',
  orgTokens: OrgToken[],
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

type AutoselectOrInvalidateSelectedOrgTokenAction = {|
  type: 'dashboard/AUTOSELECT_OR_INVALIDATE_SELECTED_ORG_TOKEN',
|};

type InvalidateSelectedLocationAction = {|
  type: 'dashboard/INVALIDATE_SELECTED_LOCATION',
|};

type SetShowMarkersAction = {|
  type: 'dashboard/SET_SHOW_MARKERS',
  value: boolean,
|};
type SetEnableClusteringAction = {|
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
  value: number,
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

type SetOrgTokenAction = {|
  type: 'dashboard/SET_ORG_TOKEN',
  value: string,
|};

type SetOrgTokenFromSearchAction = {|
  type: 'dashboard/SET_ORG_TOKEN_FROM_SEARCH',
  value: string,
|};
// Combining Actions

type AddTestMarkerAction = {|
  type: 'dashboard/ADD_TEST_MARKER',
  value: $Shape<{| data: any |}>,
|};

type Action =
  | AddTestMarkerAction
  | ApplyExistingSettinsAction
  | AutoselectOrInvalidateSelectedOrgTokenAction
  | AutoselectOrInvalidateSelectedDeviceAction
  | InvalidateSelectedLocationAction
  | SetActiveTabAction
  | SetOrgTokenAction
  | SetOrgTokenFromSearchAction
  | SetOrgTokensAction
  | SetCurrentLocationAction
  | SetDeviceAction
  | SetDevicesAction
  | SetEnableClusteringAction
  | SetEndDateAction
  | SetHasDataAction
  | SetIsLoadingAction
  | SetIsWatchingAction
  | SetLocationsAction
  | SetMaxMarkersAction
  | SetSelectedLocationAction
  | SetShowGeofenceHitsAction
  | SetShowMarkersAction
  | SetShowPolylineAction
  | SetStartDateAction;

type GetState = () => GlobalState;
type Dispatch = (action: Action | ThunkAction) => Promise<void>; // eslint-disable-line no-use-before-define
type ThunkAction = (dispatch: Dispatch, getState: GetState) => Promise<void>;

// ------------------------------------
// Action Creators
// ------------------------------------

export function setOrgTokens (orgTokens: OrgToken[]): SetOrgTokensAction {
  return {
    type: 'dashboard/SET_ORG_TOKENS',
    orgTokens,
  };
}
export function setDevices (devices: Device[]): SetDevicesAction {
  return {
    type: 'dashboard/SET_DEVICES',
    devices,
  };
}

export function setLocations (locations: Location[]): SetLocationsAction {
  return {
    type: 'dashboard/SET_LOCATIONS',
    locations,
  };
}

export function setHasData (status: boolean): SetHasDataAction {
  return {
    type: 'dashboard/SET_HAS_DATA',
    status,
  };
}

export function setIsLoading (status: boolean): SetIsLoadingAction {
  return {
    type: 'dashboard/SET_IS_LOADING',
    status,
  };
}

export function autoselectOrInvalidateSelectedOrgToken (): AutoselectOrInvalidateSelectedOrgTokenAction {
  return { type: 'dashboard/AUTOSELECT_OR_INVALIDATE_SELECTED_ORG_TOKEN' };
}

export function autoselectOrInvalidateSelectedDevice (): AutoselectOrInvalidateSelectedDeviceAction {
  return { type: 'dashboard/AUTOSELECT_OR_INVALIDATE_SELECTED_DEVICE' };
}

export function invalidateSelectedLocation (): InvalidateSelectedLocationAction {
  return { type: 'dashboard/INVALIDATE_SELECTED_LOCATION' };
}

export function setShowMarkers (value: boolean): SetShowMarkersAction {
  return {
    type: 'dashboard/SET_SHOW_MARKERS',
    value,
  };
}

export function setEnableClustering (value: boolean): SetEnableClusteringAction {
  return {
    type: 'dashboard/SET_ENABLE_CLUSTERING',
    value,
  };
}

export function setShowMaxMarkers (value: number): SetMaxMarkersAction {
  return {
    type: 'dashboard/SET_MAX_MARKERS',
    value,
  };
}

export function setShowPolyline (value: boolean): SetShowPolylineAction {
  return {
    type: 'dashboard/SET_SHOW_POLYLINE',
    value,
  };
}
export function setShowGeofenceHits (value: boolean): SetShowGeofenceHitsAction {
  return {
    type: 'dashboard/SET_SHOW_GEOFENCE_HITS',
    value,
  };
}

export function setIsWatching (value: boolean): SetIsWatchingAction {
  return {
    type: 'dashboard/SET_IS_WATCHING',
    value,
  };
}

export function setCurrentLocation (location: ?Location): SetCurrentLocationAction {
  return {
    type: 'dashboard/SET_CURRENT_LOCATION',
    location,
  };
}

export function setStartDate (value: Date): SetStartDateAction {
  return {
    type: 'dashboard/SET_START_DATE',
    value,
  };
}

export function setEndDate (value: Date): SetEndDateAction {
  return {
    type: 'dashboard/SET_END_DATE',
    value,
  };
}

export function setDevice (deviceId: string): SetDeviceAction {
  return {
    type: 'dashboard/SET_DEVICE',
    deviceId,
  };
}

export function setSelectedLocation (locationId: string): SetSelectedLocationAction {
  return {
    type: 'dashboard/SET_SELECTED_LOCATION',
    locationId,
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
    settings,
  };
}

export function setActiveTab (tab: Tab): SetActiveTabAction {
  return {
    type: 'dashboard/SET_ACTIVE_TAB',
    tab,
  };
}

export function setOrgToken (value: string): SetOrgTokenAction {
  return {
    type: 'dashboard/SET_ORG_TOKEN',
    value,
  };
}

export function setOrgTokenFromSearch (value: string): SetOrgTokenFromSearchAction {
  return {
    type: 'dashboard/SET_ORG_TOKEN_FROM_SEARCH',
    value,
  };
}

export function doAddTestMarker (value: Object): AddTestMarkerAction {
  return {
    type: 'dashboard/ADD_TEST_MARKER',
    value,
  };
}

// ------------------------------------
// Thunk Actions
// ------------------------------------

export const loadOrgTokens = (): ThunkAction => async (dispatch: Dispatch, getState: GetState): Promise<void> => {
  const { dashboard: { orgTokenFromSearch } } = getState();
  const params = qs.stringify({ company_token: orgTokenFromSearch });
  try {
    const response = await fetch(`${API_URL}/company_tokens?${params}`);
    const records = await response.json();
    const orgTokens: OrgToken[] = records.map((x: { company_token: string }) => ({
      id: x.id,
      name: x.company_token,
    }));
    return dispatch(setOrgTokens(orgTokens));
  } catch (e) {
    console.error('loadOrgTokens', e);
    return e;
  }
};

export const loadDevices = (): ThunkAction => async (dispatch: Dispatch, getState: GetState): Promise<void> => {
  const { dashboard: { companyId, orgToken } } = getState();
  const params = qs.stringify({
    company_id: companyId,
    company_token: orgToken,
  });
  try {
    const response = await fetch(`${API_URL}/devices?${params}`);
    const records = await response.json();
    const devices: Device[] = records
      .map((record: Object) => ({
        id: record.id,
        name: `${record.device_id}(${record.framework})`,
      }));
    return dispatch(setDevices(devices));
  } catch (e) {
    console.error('loadDevices', e);
    return e;
  }
};


export const loadLocations = (): ThunkAction => async (dispatch: Dispatch, getState: GetState): Promise<void> => {
  const {
    deviceId, orgToken, companyId, startDate, endDate, maxMarkers,
  } = getState().dashboard;
  GA.sendEvent('tracker', 'loadLocations', orgToken);

  const params = qs.stringify({
    company_id: companyId,
    company_token: orgToken,
    device_id: deviceId,
    end_date: endDate.toISOString(),
    limit: maxMarkers,
    start_date: startDate.toISOString(),
  });
  try {
    const response = await fetch(`${API_URL}/locations?${params}`);
    const records = await response.json();
    return dispatch(setLocations(records));
  } catch (e) {
    console.error('loadLocations', e);
    return e;
  }
};

export const loadCurrentLocation = (): ThunkAction => async (dispatch: Dispatch, getState: GetState): Promise<void> => {
  const {
    deviceId, companyId, company_token: orgToken,
  } = getState().dashboard;
  if (deviceId) {
    const params = qs.stringify({
      device_id: deviceId,
      company_id: companyId,
      company_token: orgToken,
    });
    try {
      const response = await fetch(`${API_URL}/locations/latest?${params}`);
      const currentLocation = await response.json();
      return await dispatch(setCurrentLocation(currentLocation));
    } catch (e) {
      console.error('loadCurrentLocation', deviceId, e);
    }
  }

  return dispatch(setCurrentLocation(null));
};

export const reload =
  ({ loadUsers }: LoadParams = { loadUsers: true }): ThunkAction => async (dispatch: Dispatch): Promise<void> => {
    await dispatch(setIsLoading(true));
    loadUsers && await dispatch(loadOrgTokens());
    await dispatch(autoselectOrInvalidateSelectedOrgToken());
    await dispatch(loadDevices());
    await dispatch(autoselectOrInvalidateSelectedDevice());
    await dispatch(loadLocations());
    await dispatch(loadCurrentLocation());
    await dispatch(invalidateSelectedLocation());
    await dispatch(setIsLoading(false));
    fitBoundsBus.emit({});
  };

export const loadInitialData =
  (id: string): ThunkAction => async (dispatch: Dispatch, getState: GetState): Promise<void> => {
    const { dashboard: { hasData } } = getState();
    if (hasData) {
      console.error('extra call after everything is set up!');
      return;
    }
    await dispatch(setOrgTokenFromSearch(id));
    const { dashboard: { orgTokenFromSearch } } = getState();
    const existingSettings = getSettings(orgTokenFromSearch);
    const urlSettings = getUrlSettings();
    await dispatch(applyExistingSettings(existingSettings));
    await dispatch(applyExistingSettings(urlSettings));
    await dispatch(setHasData(false));
    await dispatch(reload());
    await dispatch(setHasData(true));
    // set a timer as a side effect
    setTimeout(() => dispatch(reload()), 60 * 1000);
    GA.sendEvent('tracker', `load:${id}`);
  };

export function deleteActiveDevice (deleteOptions: ?DeleteOptions): ThunkAction {
  return async (dispatch: Dispatch, getState: GetState): Promise<void> => {
    const { dashboard: { deviceId } } = getState();
    if (!deviceId) {
      return;
    }
    const params = deleteOptions
      ? `?${qs.stringify({
        start_date: deleteOptions.startDate.toISOString(),
        end_date: deleteOptions.endDate.toISOString(),
      })}`
      : '';
    try {
      await fetch(`${API_URL}/devices/${deviceId}${params}`, { method: 'delete' });
      await dispatch(reload({ loadUsers: false }));
      GA.sendEvent('tracker', `delete device:${deviceId}`);
    } catch (e) {
      console.error('deleteActiveDevice', e);
    }
  };
}

export function changeStartDate (value: Date) {
  return async (dispatch: Dispatch, getState: GetState): Promise<void> => {
    await dispatch(setStartDate(value));
    setSettings(getState().dashboard.orgTokenFromSearch, { startDate: value });
    const { dashboard } = getState();
    setUrlSettings({
      startDate: dashboard.startDate,
      endDate: dashboard.endDate,
      deviceId: dashboard.deviceId,
      companyId: dashboard.companyId,
      orgTokenFromSearch: dashboard.orgTokenFromSearch,
    });
    await dispatch(reload({ loadUsers: false }));
  };
}
export function changeEndDate (value: Date) {
  return async (dispatch: Dispatch, getState: GetState): Promise<void> => {
    await dispatch(setEndDate(value));
    setSettings(getState().dashboard.orgTokenFromSearch, { endDate: value });
    const { dashboard } = getState();
    setUrlSettings({
      startDate: dashboard.startDate,
      endDate: dashboard.endDate,
      deviceId: dashboard.deviceId,
      companyId: dashboard.companyId,
      orgTokenFromSearch: dashboard.orgTokenFromSearch,
    });
    await dispatch(reload({ loadUsers: false }));
  };
}

export function changeOrgToken (value: string) {
  return async (dispatch: Dispatch, getState: GetState): Promise<void> => {
    await dispatch(setOrgToken(value));
    setSettings(getState().dashboard.orgTokenFromSearch, { companyId: value });
    await dispatch(reload({ loadUsers: false }));
  };
}
export function changeDeviceId (value: string) {
  return async (dispatch: Dispatch, getState: GetState): Promise<void> => {
    await dispatch(setDevice(value));
    setSettings(getState().dashboard.orgTokenFromSearch, { deviceId: value });
    const { dashboard } = getState();
    setUrlSettings({
      startDate: dashboard.startDate,
      endDate: dashboard.endDate,
      deviceId: dashboard.deviceId,
      companyId: dashboard.companyId,
      orgTokenFromSearch: dashboard.orgTokenFromSearch,
    });
    await dispatch(reload({ loadUsers: false }));
  };
}

export function changeIsWatching (value: boolean) {
  return async (dispatch: Dispatch, getState: GetState): Promise<void> => {
    await dispatch(setIsWatching(value));
    setSettings(getState().dashboard.orgTokenFromSearch, { isWatching: value });
  };
}

export function changeShowMarkers (value: boolean) {
  return async (dispatch: Dispatch, getState: GetState): Promise<void> => {
    await dispatch(setShowMarkers(value));
    setSettings(getState().dashboard.orgTokenFromSearch, { showMarkers: value });
  };
}

export function changeEnableClustering (value: boolean) {
  return async (dispatch: Dispatch, getState: GetState): Promise<void> => {
    await dispatch(setEnableClustering(value));
    setSettings(getState().dashboard.orgTokenFromSearch, { enableClustering: value });
  };
}

export function changeShowPolyline (value: boolean) {
  return async (dispatch: Dispatch, getState: GetState): Promise<void> => {
    await dispatch(setShowPolyline(value));
    setSettings(getState().dashboard.orgTokenFromSearch, { showPolyline: value });
  };
}

export function changeShowGeofenceHits (value: boolean) {
  return async (dispatch: Dispatch, getState: GetState): Promise<void> => {
    await dispatch(setShowGeofenceHits(value));
    setSettings(getState().dashboard.orgTokenFromSearch, { showGeofenceHits: value });
  };
}

export function changeMaxMarkers (value: number) {
  return async (dispatch: Dispatch, getState: GetState): Promise<void> => {
    await dispatch(setShowMaxMarkers(value));
    setSettings(getState().dashboard.orgTokenFromSearch, { maxMarkers: value });
  };
}

export function clickMarker (locationId: string) {
  return async (dispatch: Dispatch): Promise<void> => {
    await dispatch(setSelectedLocation(locationId));
    scrollToRowBus.emit({ locationId });
  };
}

export function changeActiveTab (tab: Tab) {
  return async (dispatch: Dispatch, getState: GetState): Promise<void> => {
    await dispatch(setActiveTab(tab));
    setSettings(getState().dashboard.orgTokenFromSearch, { activeTab: tab });
    changeTabBus.emit({ tab });
  };
}

export function addTestMarker (value: Object): ThunkAction {
  return async (dispatch: Dispatch): Promise<void> => {
    dispatch(doAddTestMarker(value));
  };
}
// ------------------------------------
// Action Handlers
// ------------------------------------

const setOrgTokensHandler =
  (state: DashboardState, action: SetOrgTokensAction): DashboardState => cloneState(
    state,
    { orgTokens: action.orgTokens },
  );

const setDevicesHandler =
  (state: DashboardState, action: SetDevicesAction): DashboardState => cloneState(state, { devices: action.devices });

const areLocationsEqual = (existingLocations: Location[], newLocations: Location[]) => {
  const firstExistingLocation = existingLocations[0];
  const firstNewLocation = newLocations[0];
  const lastExistingLocation = existingLocations[existingLocations.length - 1];
  const lastNewLocation = newLocations[newLocations.length - 1];
  return isEqual([firstExistingLocation, lastExistingLocation], [firstNewLocation, lastNewLocation]);
};

const setLocationsHandler = (state: DashboardState, action: SetLocationsAction): DashboardState => {
  if (areLocationsEqual(state.locations, action.locations)) {
    return state;
  }
  return cloneState(state, { locations: action.locations });
};

const autoselectOrInvalidateSelectedOrgTokenHandler = (
  state: DashboardState,
): DashboardState => {
  const { orgTokens, companyId } = state;
  if (orgTokens.length === 0) {
    return cloneState(state, { companyId: 1 });
  }
  if (orgTokens.length === 1) {
    return cloneState(state, { companyId: `${orgTokens[0].id}` });
  }
  if (orgTokens.length > 1) {
    const existingOrgToken = orgTokens && orgTokens.find((x: Device) => x.id === +companyId);
    if (!existingOrgToken) {
      return cloneState(state, { companyId: `${orgTokens[0].id}` });
    }
    return state;
  }
  return state;
};

const autoselectOrInvalidateSelectedDeviceHandler = (
  state: DashboardState,
): DashboardState => {
  const { devices, deviceId } = state;
  if (devices.length === 0) {
    return cloneState(state, { deviceId: null });
  }
  if (devices.length === 1) {
    return cloneState(state, { deviceId: `${devices[0].id}` });
  }
  if (devices.length > 1) {
    const existingDevice = devices && devices.find((x: Device) => x.id === +deviceId);
    if (!existingDevice) {
      return cloneState(state, { deviceId: `${devices[0].id}` });
    }
    return state;
  }
  return state;
};

const invalidateSelectedLocationHandler = (
  state: DashboardState,
): DashboardState => {
  const {
    selectedLocationId, isWatching, currentLocation, locations,
  } = state;
  if (!selectedLocationId) {
    return state;
  }
  if (isWatching) {
    return cloneState(state, { selectedLocationId: currentLocation ? currentLocation.uuid : null });
  }
  const existingLocation = locations && locations.find((x: Location) => x.uuid === selectedLocationId);
  if (!existingLocation) {
    return cloneState(state, { selectedLocationId: null });
  }
  return state;
};

const setIsLoadingHandler =
  (state: DashboardState, action: SetIsLoadingAction): DashboardState => cloneState(
    state,
    { isLoading: action.status },
  );
const setHasDataHandler =
  (state: DashboardState, action: SetHasDataAction): DashboardState => cloneState(state, { hasData: action.status });

const setShowMarkersHandler =
  (state: DashboardState, action: SetShowMarkersAction): DashboardState => cloneState(
    state,
    { showMarkers: action.value },
  );

const setEnableClusteringHandler =
  (state: DashboardState, action: SetEnableClustringAction): DashboardState => cloneState(
    state,
    { enableClustering: action.value },
  );

const setShowPolylineHandler =
  (state: DashboardState, action: SetShowPolylineAction): DashboardState => cloneState(
    state,
    { showPolyline: action.value },
  );

const setShowGeofenceHitsHandler =
  (state: DashboardState, action: SetShowGeofenceHitsAction): DashboardState => cloneState(
    state,
    { showGeofenceHits: action.value },
  );

const setMaxMarkersHandler =
  (state: DashboardState, action: SetMaxMarkersAction): DashboardState => cloneState(
    state,
    { maxMarkers: action.value },
  );

const setIsWatchingHandler =
  (state: DashboardState, action: SetIsWatchingAction): DashboardState => cloneState(
    state,
    { isWatching: action.value },
  );

const setCurrentLocationHandler =
  (state: DashboardState, action: SetCurrentLocationAction): DashboardState => cloneState(
    state,
    { currentLocation: action.location },
  );
const setStartDateHandler =
  (state: DashboardState, action: SetStartDateAction): DashboardState => cloneState(
    state,
    { startDate: action.value },
  );
const setEndDateHandler =
  (state: DashboardState, action: SetEndDateAction): DashboardState => cloneState(
    state,
    { endDate: action.value },
  );

const setDeviceHandler = (state: DashboardState, action: SetDeviceAction): DashboardState => cloneState(
  state,
  { deviceId: action.deviceId },
);

const setSelectedLocationHandler =
  (state: DashboardState, action: SetSelectedLocationAction): DashboardState => cloneState(
    state,
    { selectedLocationId: action.locationId },
  );

const applyExistingSettingsHandler = (
  state: DashboardState,
  action: ApplyExistingSettinsAction,
): DashboardState => cloneState(state, action.settings);

const setActiveTabHandler =
  (state: DashboardState, action: SetActiveTabAction) => cloneState(state, { activeTab: action.tab });

const setOrgTokenHandler =
  (state: DashboardState, action: SetOrgTokenAction) => cloneState(state, { companyId: action.value });

const setOrgTokenFromSearchHandler =
  (state: DashboardState, action: SetOrgTokenFromSearchAction) => cloneState(
    state,
    { orgTokenFromSearch: action.value },
  );

const addTestMarkerHandler = (state: DashboardState, action: AddTestMarkerAction) => {
  const markers = [].concat(state.testMarkers);
  markers.push(action.value.data);
  return cloneState(state, { testMarkers: markers });
};

// ------------------------------------
// Initial State
// ------------------------------------
const getStartDate = () => {
  const startDate = new Date();
  startDate.setHours(0);
  startDate.setMinutes(0);
  return startDate;
};

const getEndDate = () => {
  const endDate = new Date();
  endDate.setHours(23);
  endDate.setMinutes(59);
  return endDate;
};

const initialState: DashboardState = {
  activeTab: 'map',
  orgToken: '',
  orgTokenFromSearch: '',
  orgTokens: [],
  currentLocation: null,
  deviceId: null,
  devices: [],
  enableClustering: true,
  endDate: getEndDate(),
  hasData: false,
  isLoading: false,
  isWatching: false,
  locations: [],
  maxMarkers: 1000,
  selectedLocationId: null,
  showGeofenceHits: true,
  showMarkers: true,
  showPolyline: true,
  startDate: getStartDate(),
  testMarkers: [],
};

// ------------------------------------
// Reducer
// ------------------------------------
export default function spotsReducer (state: DashboardState = initialState, action: Action): DashboardState {
  switch (action.type) {
    case 'dashboard/SET_ORG_TOKENS':
      return setOrgTokensHandler(state, action);
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
    case 'dashboard/AUTOSELECT_OR_INVALIDATE_SELECTED_ORG_TOKEN':
      return autoselectOrInvalidateSelectedOrgTokenHandler(state, action);
    case 'dashboard/INVALIDATE_SELECTED_LOCATION':
      return invalidateSelectedLocationHandler(state, action);
    case 'dashboard/SET_SHOW_MARKERS':
      return setShowMarkersHandler(state, action);
    case 'dashboard/SET_ENABLE_CLUSTERING':
      return setEnableClusteringHandler(state, action);
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
    case 'dashboard/SET_ORG_TOKEN':
      return setOrgTokenHandler(state, action);
    case 'dashboard/SET_ORG_TOKEN_FROM_SEARCH':
      return setOrgTokenFromSearchHandler(state, action);
    case 'dashboard/ADD_TEST_MARKER':
      return addTestMarkerHandler(state, action);
    default:
      // eslint-disable-next-line no-unused-expressions
      (action: empty);
      return state;
  }
}
