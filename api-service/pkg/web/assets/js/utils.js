const getLocalStorageKey = (key) => (key ? `transistorsoft-settings#${key}` : 'transistorsoft-settings');

const removeUndefined = (x) => {
  const obj = { ...x};
  Object.keys(obj).forEach(key => obj[key] === undefined ? delete obj[key] : {});
  return obj;
}

export function getAuth() {
  const encodedSettings = window.localStorage.getItem(getLocalStorageKey('auth'));
  if (encodedSettings) {
    const parsed = JSON.parse(encodedSettings);
    return parsed;
  }
  return null;
}

export function setAuth(settings) {
  if (!settings) {
    return null;
  }
  window.localStorage.setItem(getLocalStorageKey('auth'), JSON.stringify(settings));

  return settings;
}

export function getSettings(key) {
  const encodedSettings = window.localStorage.getItem(getLocalStorageKey(key));
  if (encodedSettings) {
    try {
      const parsed = JSON.parse(encodedSettings);
      const result = removeUndefined({ ...parsed,
        from: parsed.from ? parsed.from : undefined,
        to: parsed.to ? parsed.to : undefined,
        showGeofences: parsed.showGeofences,
        showMarkers: parsed.showMarkers,
        showPolyline: parsed.showPolyline,
        useClustering: parsed.useClustering
      })
      return result;
    } catch (ex) {
      return {};
    }
  }
  return {};
}

export function setSettings(key, settings) {
  const existingSettings = getSettings(key);
  const newSettings = {...existingSettings, ...settings};
  // convert start/endDate to string if they are present
  const stringifiedNewSettings = removeUndefined({
      from: newSettings.from,
      to: newSettings.to,
      showGeofences: newSettings.showGeofences,
      showMarkers: newSettings.showMarkers,
      showPolyline: newSettings.showPolyline,
      useClustering: newSettings.useClustering
  });

  window.localStorage.setItem(
    getLocalStorageKey(key),
    JSON.stringify(stringifiedNewSettings),
  );
}

export function dateToString(date) {
  const f = (x) => x < 10 ? `0${x}` : x.toString();
  return `${date.getFullYear()}-${f(date.getMonth() + 1)}-${f(date.getDate())}`;
}

export function dateTimeToString(date) {
  const f = (x) => x < 10 ? `0${x}` : x.toString();
  return `${date.getFullYear()}-${f(date.getMonth() + 1)}-${f(date.getDate())}T${f(date.getHours())}:${f(date.getMinutes())}`;
}

export function getTodayStart() {
      const today = new Date();
      today.setHours(0);
      today.setMinutes(0);
      today.setSeconds(0)
      today.setMilliseconds(0);
      return dateTimeToString(today);

}
export function getTodayEnd() {
      const now = new Date();
      now.setHours(23);
      now.setMinutes(59);
      now.setSeconds(0)
      now.setMilliseconds(0);
      return dateTimeToString(now);
}

export const COLORS = {
  gold: '#fedd1e',
  white: '#fff',
  blue: '#2677FF',
  light_blue: '#3366cc',
  polyline_color: '#00B3FD',
  green: '#16BE42',
  dark_purple: '#2A0A73',
  grey: '#404040',
  red: '#FE381E',
  dark_red: '#A71300',
  black: '#000',
};
