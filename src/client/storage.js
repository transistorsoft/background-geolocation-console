// @flow
import queryString from 'query-string';
import isUndefined from 'lodash/isUndefined';
import omitBy from 'lodash/omitBy';

import { type Tab } from 'reducer/state';
import { type AuthInfo } from 'reducer/types';
import cloneState from 'utils/cloneState';

export type StoredSettings = {|
  activeTab: Tab,
  startDate: Date,
  endDate: Date,
  isWatching: boolean,
  deviceId: ?string,
  orgToken: string,
  showGeofenceHits: boolean,
  showPolyline: boolean,
  showMarkers: boolean,
  maxMarkers: number,
|};


const getLocalStorageKey = (key: string) => (key ? `settings#${key}` : 'settings');

export function getAuth(): AuthSettings {
  const encodedSettings = localStorage.getItem(getLocalStorageKey('auth'));
  if (encodedSettings) {
    const parsed = JSON.parse(encodedSettings);
    return parsed;
  }
  return null;
}

export function setAuth(settings: AuthSettings): AuthSettings {
  if (!settings) {
    return null;
  }
  localStorage.setItem(getLocalStorageKey('auth'), JSON.strinfigy(settings));

  return settings;
}

export function getSettings(key: string): $Shape<StoredSettings> {
  const encodedSettings = localStorage.getItem(getLocalStorageKey(key));
  if (encodedSettings) {
    const parsed = JSON.parse(encodedSettings);
    // convert start/endDate to Date if they are present
    const result = omitBy(
      cloneState(parsed, {
        startDate: parsed.startDate ? new Date(parsed.startDate) : undefined,
        endDate: parsed.endDate ? new Date(parsed.endDate) : undefined,
        showGeofenceHits: parsed.showGeofenceHits,
        showMarkers: parsed.showMarkers,
        showPolyline: parsed.showPolyline,
        maxMarkers: parsed.maxMarkers,
      }),
      isUndefined,
    );
    return result;
  }
  return {};
}

function parseStartDate(date: ?string) {
  if (!date) {
    return undefined;
  }
  if (new Date(date).toString() === 'Invalid Date') {
    return undefined;
  }
  return new Date(date);
}
function parseEndDate(date: ?string) {
  if (!date) {
    return undefined;
  }
  if (new Date(date).toString() === 'Invalid Date') {
    return undefined;
  }
  if (date.split(' ').length === 1) {
    return new Date(`${date} 23:59`);
  }
  return new Date(date);
}

function encodeStartDate(date: ?Date) {
  if (!date) {
    return undefined;
  }
  const y = date.getFullYear();
  const mon = date.getMonth() + 1;
  const d = date.getDate();
  const h = date.getHours();
  const min = date.getMinutes();
  if (h === 0 && min === 0) {
    return `${y}-${mon}-${d}`;
  }
  return `${y}-${mon}-${d} ${h}:${min}`;
}
function encodeEndDate(date: ?Date) {
  if (!date) {
    return undefined;
  }
  const y = date.getFullYear();
  const mon = date.getMonth() + 1;
  const d = date.getDate();
  const h = date.getHours();
  const min = date.getMinutes();
  if (h === 23 && min === 59) {
    return `${y}-${mon}-${d}`;
  }
  return `${y}-${mon}-${d} ${h}:${min}`;
}
export function getUrlSettings(): $Shape<StoredSettings> {
  const params = queryString.parse(window.location.search);
  const result = omitBy(
    {
      deviceId: params.device,
      startDate: parseStartDate(params.start),
      endDate: parseEndDate(params.end),
    },
    isUndefined,
  );
  return result;
}
export function setUrlSettings(
  settings: {|
    deviceId: ?string,
    startDate: ?Date,
    endDate: ?Date,
    orgTokenFromSearch: string,
  |},
  auth: AuthInfo,
) {
  const {
    orgTokenFromSearch, startDate, endDate, deviceId,
  } = settings;
  const { accessToken } = auth;
  const shared = !!process.env.SHARED_DASHBOARD;
  const hasToken = accessToken;
  const mainPart = orgTokenFromSearch ? `/${orgTokenFromSearch}` : '';
  const search = {
    device: deviceId,
    end: encodeEndDate(endDate),
    start: encodeStartDate(startDate),
  };
  const url = `${!hasToken || !shared ? mainPart : ''}?${queryString.stringify(search)}`;
  window.history.replaceState({}, '', url);
}

export function setSettings(key: string, settings: $Shape<StoredSettings>) {
  const existingSettings = getSettings(key);
  const newSettings = cloneState(existingSettings, settings);
  // convert start/endDate to string if they are present
  const stringifiedNewSettings = omitBy(
    {
      startDate: newSettings.startDate
        ? newSettings.startDate.toISOString()
        : undefined,
      endDate: newSettings.endDate
        ? newSettings.endDate.toISOString()
        : undefined,
      showGeofenceHits: newSettings.showGeofenceHits,
      showMarkers: newSettings.showMarkers,
      showPolyline: newSettings.showPolyline,
      maxMarkers: newSettings.maxMarkers,
    },
    isUndefined,
  );

  localStorage.setItem(
    getLocalStorageKey(key),
    JSON.stringify(stringifiedNewSettings),
  );
}
