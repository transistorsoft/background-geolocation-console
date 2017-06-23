// @flow
import cloneState from '~/utils/cloneState';
export type StoredSettings = {|
  startDate?: Date,
  endDate?: Date,
  isWatching?: boolean,
  deviceId?: ?string,
  showGeofenceHits?: boolean,
  showPolyline?: boolean,
  showMarkers?: boolean,
|};
export function getSettings (): StoredSettings {
  const encodedSettings = localStorage.getItem('settings');
  if (encodedSettings) {
    const parsed = JSON.parse(encodedSettings);
    return cloneState(parsed, {
      startDate: parsed.startDate ? new Date(parsed.startDate) : undefined,
      endDate: parsed.endDate ? new Date(parsed.endDate) : undefined,
    });
  } else {
    return JSON.parse('{}');
  }
}
export function setSettings (settings: StoredSettings) {
  const existingSettings = getSettings();
  const newSettings = cloneState(existingSettings, settings);
  const stringifiedNewSettings = Object.assign({}, newSettings, {
    startDate: newSettings.startDate ? newSettings.startDate.toISOString() : undefined,
    endDate: newSettings.endDate ? newSettings.endDate.toISOString() : undefined,
  });
  localStorage.setItem('settings', JSON.stringify(stringifiedNewSettings));
}
