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
  showGeofenceHits: boolean,
  showPolyline: boolean,
  showMarkers: boolean,
|};
export function getSettings (): StoredSettings {
  const encodedSettings = localStorage.getItem('settings');
  if (encodedSettings) {
    const parsed = JSON.parse(encodedSettings);
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
export function setSettings (settings: $Shape<StoredSettings>) {
  const existingSettings = getSettings();
  const newSettings = cloneState(existingSettings, settings);
  const stringifiedNewSettings = _.omitBy(
    Object.assign({}, newSettings, {
      startDate: newSettings.startDate ? newSettings.startDate.toISOString() : undefined,
      endDate: newSettings.endDate ? newSettings.endDate.toISOString() : undefined,
    }),
    _.isUndefined
  );
  localStorage.setItem('settings', JSON.stringify(stringifiedNewSettings));
}
