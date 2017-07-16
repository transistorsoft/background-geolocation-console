// @flow
import cloneState from '~/utils/cloneState';
import _ from 'lodash';
import { type Tab } from './reducer/dashboard';
export type StoredSettings = {|
  activeTab: Tab,
  startDate: Date,
  endDate: Date,
  isWatching: boolean,
  deviceId: ?string,
  companyToken: string,
  showGeofenceHits: boolean,
  showPolyline: boolean,
  showMarkers: boolean,
|};
const getLocalStorageKey = (key: string) => (key ? `settings#${key}` : 'settings');
export function getSettings (key: string): StoredSettings {
  const encodedSettings = localStorage.getItem(getLocalStorageKey(key));
  if (encodedSettings) {
    const parsed = JSON.parse(encodedSettings);
    // convert start/endDate to Date if they are present
    return _.omitBy(
      cloneState(parsed, {
        startDate: parsed.startDate ? new Date(parsed.startDate) : undefined,
        endDate: parsed.endDate ? new Date(parsed.endDate) : undefined,
      }),
      _.isUndefined
    );
  } else {
    return JSON.parse('{}');
  }
}
export function setSettings (key: string, settings: $Shape<StoredSettings>) {
  const existingSettings = getSettings(key);
  const newSettings = cloneState(existingSettings, settings);
  // convert start/endDate to string if they are present
  const stringifiedNewSettings = _.omitBy(
    Object.assign({}, newSettings, {
      startDate: newSettings.startDate ? newSettings.startDate.toISOString() : undefined,
      endDate: newSettings.endDate ? newSettings.endDate.toISOString() : undefined,
    }),
    _.isUndefined
  );
  localStorage.setItem(getLocalStorageKey(key), JSON.stringify(stringifiedNewSettings));
}
