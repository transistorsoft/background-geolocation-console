const getLocalStorageKey = (key) => (key ? `settings#${key}` : 'settings');
const removeUndefined = Object.keys(obj).forEach(key => obj[key] === undefined ? delete obj[key] : {});

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
    const parsed = JSON.parse(encodedSettings);
    const result = removeUndefined({ ...parsed,
        startDate: parsed.startDate ? new Date(parsed.startDate) : undefined,
        endDate: parsed.endDate ? new Date(parsed.endDate) : undefined,
        showGeofenceHits: parsed.showGeofenceHits,
        showMarkers: parsed.showMarkers,
        showPolyline: parsed.showPolyline,
        maxMarkers: parsed.maxMarkers,
    })
    return result;
  }
  return {};
}

function parseStartDate(date) {
  if (!date) {
    return undefined;
  }
  if (new Date(date).toString() === 'Invalid Date') {
    return undefined;
  }
  return new Date(date);
}

function parseEndDate(date) {
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

function encodeStartDate(date) {
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

function encodeEndDate(date) {
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

export function getUrlSettings() {
  const params = queryString.parse(window.location.search);
  const result = removeUndefined({
      deviceId: params.device,
      startDate: parseStartDate(params.start),
      endDate: parseEndDate(params.end),
  });
  return result;
}

export function setUrlSettings(
  settings,
  auth
) {
  const {
    orgTokenFromSearch, startDate, endDate, deviceId,
  } = settings;
  const { accessToken, org } = auth;
  const shared = !!process.env.SHARED_DASHBOARD;
  const hasToken = accessToken || org;
  const mainPart = orgTokenFromSearch ? `/${orgTokenFromSearch}` : '';
  const search = {
    device: deviceId,
    end: encodeEndDate(endDate),
    start: encodeStartDate(startDate),
  };
  const url = `${!hasToken || shared ? mainPart : ''}?${queryString.stringify(search)}`;

  window.history.replaceState({}, '', url);
}

export function setSettings(key, settings) {
  const existingSettings = getSettings(key);
  const newSettings = cloneState(existingSettings, settings);
  // convert start/endDate to string if they are present
  const stringifiedNewSettings = removeUndefined({
      startDate: newSettings.startDate
        ? newSettings.startDate.toISOString()
        : undefined,
      endDate: newSettings.endDate
        ? newSettings.endDate.toISOString()
        : undefined,
      showGeofenceHits: newSettings.showGeofenceHits,
      showMarkers: newSettings.showMarkers,
      showPolyline: newSettings.showPolyline,
      maxMarkers: newSettings.maxMarkers
  });

  window.localStorage.setItem(
    getLocalStorageKey(key),
    JSON.stringify(stringifiedNewSettings),
  );
}
