/* eslint-disable no-param-reassign */
/* eslint-disable no-console */
import Promise from 'bluebird';
import { omitBy, isUndefined } from 'lodash-es';
import 'colors';

import {
  deleteCollection,
  firestore,
} from './index.js';

import {
  AccessDeniedError,
  isDeniedCompany,
  isDeniedDevice,
  toRows,
} from '../libs/utils.js';
import { withAuth, dataLogOn } from '../config.js';

import { findOrCreate } from './Device.js';

export async function getStats() {
  return {
    minDate: '?',
    maxDate: '?',
    total: '?',
  };
}

const makeQuery = (query, startDate, endDate) => {
  let q = query;
  if (startDate && endDate) {
    q = q
      .where('recorded_at', '>', new Date(startDate))
      .where('recorded_at', '<', new Date(endDate));
  }

  q = q
    .orderBy('recorded_at', 'desc');
  return q;
};

export async function getLocations(params, isAdmin) {
  const {
    org,
    end_date: endDate,
    start_date: startDate,
    device_id: deviceId,
  } = params || {};

  if (!isAdmin && !(deviceId || org)) {
    return [];
  }

  if (!withAuth) {
    const devicesGroup = firestore.collectionGroup('Devices');
    const devices = deviceId
      ? await devicesGroup.where('device_id', '==', deviceId).get()
      : await devicesGroup.get();
    const requests = [];
    devices.forEach(device => requests.push(device.ref.collection('Locations')));
    const list = await Promise.reduce(
      requests,
      async (res, query) => res.concat(toRows(await query.get())),
      [],
    );
    return list;
  }

  try {
    const query = makeQuery(
      firestore
        .collection('Org').doc(org)
        .collection('Devices').doc(deviceId)
        .collection('Locations'),
      startDate,
      endDate,
    );

    const snapshot = await query.get();

    return toRows(snapshot);
  } catch (e) {
    console.error('v3:getLocations', org, deviceId, e);
    return [];
  }
}

export async function getLatestLocation(params, isAdmin) {
  const {
    org,
    deviceId,
  } = params || {};

  if (!isAdmin && !(deviceId || org)) {
    return [];
  }

  if (!withAuth) {
    const devicesGroup = firestore.collectionGroup('Devices');
    const devices = await devicesGroup
      .where('device_id', '==', deviceId)
      .limit(1)
      .get();
    const device = !devices.empty && devices.docs[0];
    const lastLocation = device && await device.ref
      .collection('Locations')
      .orderBy('recorded_at', 'desc')
      .limit(1)
      .get();
    return lastLocation && toRows(lastLocation).pop();
  }

  try {
    const lastLocation = await firestore
      .collection('Org').doc(org)
      .collection('Devices').doc(deviceId)
      .collection('Locations')
      .orderBy('recorded_at', 'desc')
      .limit(1)
      .get();
    return toRows(lastLocation).pop();
  } catch (e) {
    console.error('v3:getLatestLocation', org, deviceId, e);
    return [];
  }
}

export async function createLocation(location, device, org, batch) {
  const now = new Date();
  const { device_id: deviceId } = device;

  console.info(
    'v3:location:create'.green,
    'org:name'.green,
    org,
    'device:id'.green,
    device.device_id,
  );

  const orgRef = firestore
    .collection('Org').doc(org);
  batch.update(orgRef, { updated_at: now });

  const deviceRef = firestore
    .collection('Org').doc(org)
    .collection('Devices').doc(deviceId);
  batch.update(deviceRef, { updated_at: now });

  const data = omitBy(
    {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      data: location,
      recorded_at: location.timestamp,
      created_at: now,
      org,
      uuid: deviceId,
    },
    isUndefined,
  );

  return firestore
    .collection('Org').doc(org)
    .collection('Devices').doc(deviceId)
    .collection('Locations')
    .add(data);
}

export async function createLocations(
  locations,
  device,
  org,
) {
  const batch = firestore.batch();
  await Promise.reduce(
    locations,
    async (p, location) => {
      try {
        return createLocation(
          location,
          device,
          org,
          batch,
        );
      } catch (e) {
        console.error('v3:createLocation', e);
        throw e;
      }
    },
    0,
  );
  await batch.commit();
}

export async function create(params, org, dev = {}) {
  if (Array.isArray(params)) {
    return Promise.reduce(
      params,
      async (p, pp) => {
        try {
          await create(pp, org, dev);
        } catch (e) {
          console.error('v3:create', e);
          throw e;
        }
      },
      0,
    );
  }

  const {
    company_token: companyToken,
    device: propDevice = {},
    framework,
    location: list = [],
    manufacturer,
    model,
    platform,
    uuid,
    version,
  } = params;
  const deviceInfo = {
    company_token: companyToken || propDevice.company_token || propDevice.org || dev.company_token || dev.org,
    framework: framework || propDevice.framework || dev.framework,
    manufacturer: manufacturer || propDevice.manufacturer || dev.manufacturer,
    model: model || propDevice.model || propDevice.device_model || dev.device_model || dev.model || 'UNKNOWN',
    platform: platform || propDevice.platform || dev.platform,
    uuid: uuid || propDevice.device_id || propDevice.uuid || dev.uuid || dev.device_id || 'UNKNOWN',
    version: version || propDevice.version || dev.version,
  };
  const token = org ||
    companyToken ||
    (deviceInfo && deviceInfo.company_token) ||
    'UNKNOWN';
  const device = dev || await findOrCreate(
    token,
    { ...deviceInfo },
  );
  const locations = Array.isArray(list)
    ? list
    : (
      list
        ? [list]
        : []
    );

  dataLogOn && console.log('v3:create:device'.yellow, token, JSON.stringify(deviceInfo), JSON.stringify(device));

  if (isDeniedCompany(token)) {
    throw new AccessDeniedError(
      'This is a question from the CEO of Transistor Software.\n' +
      'Why are you spamming my demo server1?\n' +
      'Please email me at chris@transistorsoft.com.',
    );
  }

  if (isDeniedDevice(device.model || device.device_model)) {
    throw new AccessDeniedError(
      'This is a question from the CEO of Transistor Software.\n' +
      'Why are you spamming my demo server2?\n' +
      'Please email me at chris@transistorsoft.com.',
    );
  }

  return createLocations(locations, device, token);
}

export async function deleteLocations(params, isAdmin) {
  const {
    org,
    end_date: endDate,
    start_date: startDate,
    device_id: deviceId,
  } = params || {};

  if (!isAdmin && !(org || deviceId)) {
    return;
  }

  if (startDate && endDate && new Date(startDate) && new Date(endDate)) {
    await deleteCollection(
      firestore,
      'recorded_at',
      firestore
        .collection('Org').doc(org)
        .collection('Devices').doc(deviceId)
        .collection('Locations')
        .where('recorded_at', '>', new Date(startDate))
        .where('recorded_at', '<', new Date(endDate)),
    );
  }

  const first = await firestore
    .collection('Org').doc(org)
    .collection('Devices').doc(deviceId)
    .collection('Locations')
    .limit(1)
    .get();

  if (!first.exists) {
    await firestore
      .collection('Org').doc(org)
      .collection('Devices').doc(deviceId)
      .delete();
  }
}
