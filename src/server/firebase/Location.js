/* eslint-disable no-console */
import Promise from 'bluebird';

import {
  deleteCollection,
  firestore,
} from '.';

import {
  AccessDeniedError,
  isDeniedCompany,
  isDeniedDevice,
  toRows,
} from '../libs/utils';


import { findOrCreate } from './Device';


export async function getStats() {
  return {
    minDate: '?',
    maxDate: '?',
    total: '?',
  };
}

export async function getLocations(params, isAdmin) {
  const {
    company_token: org,
    end_date: endDate,
    start_date: startDate,
    uuid,
  } = params || {};

  if (!isAdmin && !(uuid || org)) {
    return [];
  }

  let query = firestore
    .collection('Org').doc(org)
    .collection('Devices').doc(uuid)
    .collection('Locations');

  if (startDate && endDate) {
    query = query
      .where('recorded_at', '>', new Date(startDate))
      .where('recorded_at', '<', new Date(endDate));
  }

  const snapshot = await query
    .orderBy('recorded_at', 'desc')
    .get();

  return toRows(snapshot);
}

export async function getLatestLocation(params, isAdmin) {
  const {
    company_token: org,
    uuid,
  } = params || {};

  if (!isAdmin && !(uuid || org)) {
    return [];
  }

  const lastLocation = await firestore
    .collection('Org').doc(org)
    .collection('Devices').doc(uuid)
    .collection('Locations')
    .orderBy('recorded_at', 'desc')
    .limit(1)
    .get();

  return toRows(lastLocation);
}

export async function createLocation(params, device = {}) {
  if (Array.isArray(params)) {
    return Promise.reduce(
      params,
      async (p, location) => {
        try {
          await createLocation(location, device);
        } catch (e) {
          console.error('createLocation', e);
          throw e;
        }
      },
      0,
    );
  }
  const { company_token: orgToken, id } = device;
  const { location: list, company_token: token } = params;
  const deviceInfo = params.device || { model: 'UNKNOWN', uuid: 'UNKNOWN' };
  const companyName = orgToken || token || 'UNKNOWN';
  const now = new Date();
  const { uuid, model } = deviceInfo;

  if (isDeniedCompany(companyName)) {
    throw new AccessDeniedError(
      'This is a question from the CEO of Transistor Software.\n' +
        'Why are you spamming my demo server1?\n' +
        'Please email me at chris@transistorsoft.com.',
    );
  }

  const locations = Array.isArray(list)
    ? list
    : list
      ? [list]
      : [];
  const batch = firestore.batch();
  await Promise.reduce(
    locations,
    async (p, location) => {
      if (isDeniedDevice(model)) {
        throw new AccessDeniedError(
          'This is a question from the CEO of Transistor Software.\n' +
            'Why are you spamming my demo server2?\n' +
            'Please email me at chris@transistorsoft.com.',
        );
      }

      const currentDevice = id
        ? device
        : await findOrCreate(companyName, { ...deviceInfo });

      console.info(
        'location:create'.green,
        'org:name'.green,
        companyName,
        'org'.green,
        orgToken,
        'device:uuid'.green,
        currentDevice.uuid,
      );

      const orgRef = firestore
        .collection('Org').doc(orgToken);
      batch.update(orgRef, { updated_at: now });

      const deviceRef = firestore
        .collection('Org').doc(orgToken)
        .collection('Devices').doc(uuid);
      batch.update(deviceRef, { updated_at: now });

      return firestore
        .collection('Org').doc(orgToken)
        .collection('Devices').doc(uuid)
        .collection('Locations')
        .add({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          data: location,
          recorded_at: location.timestamp,
          created_at: now,
          org: orgToken,
          uuid,
        });
    },
    0,
  );
  return batch.commit();
}

export async function deleteLocations(params, isAdmin) {
  const {
    company_token: org,
    end_date: endDate,
    start_date: startDate,
    uuid,
  } = params || {};

  if (!isAdmin && !(org || uuid)) {
    return;
  }

  if (startDate && endDate && new Date(startDate) && new Date(endDate)) {
    await deleteCollection(
      firestore,
      'recorded_at',
      firestore
        .collection('Org').doc(org)
        .collection('Devices').doc(uuid)
        .collection('Locations')
        .where('recorded_at', '>', new Date(startDate))
        .where('recorded_at', '<', new Date(endDate)),
    );
  }

  const first = await firestore
    .collection('Org').doc(org)
    .collection('Devices').doc(uuid)
    .collection('Locations')
    .limit(1)
    .get();

  if (!first.exists) {
    await firestore
      .collection('Org').doc(org)
      .collection('Devices').doc(uuid)
      .delete();
  }
}
