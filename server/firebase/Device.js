/* eslint-disable no-console */
import { isUndefined } from 'lodash-es';
import { omitBy } from 'lodash-es';

import {
  deleteCollection,
  firestore,
} from './index.js';

import { withAuth } from '../config.js';
import { toRows, toRow } from '../libs/utils.js';

export async function getDevice({ device_id: deviceId, org }) {
  try {
    const snapshot = await firestore
      .collection('Org').doc(org)
      .collection('Devices').doc(deviceId)
      .get();
    const result = toRow(snapshot);

    return result;
  } catch (e) {
    console.error('v3:getDevice', org, deviceId, e);
    return null;
  }
}

export async function getDevices({ org }, isAdmin) {
  if (!isAdmin && !org) {
    return [];
  }

  if (!withAuth) {
    const devices = await firestore.collectionGroup('Devices')
      .orderBy('updated_at', 'desc')
      .get();
    return toRows(devices);
  }

  try {
    const snapshot = await firestore
      .collection('Org').doc(org)
      .collection('Devices')
      .orderBy('updated_at', 'desc')
      .get();
    return toRows(snapshot);
  } catch (e) {
    console.error(`v3:getDevices:${org}`, e);
    return [];
  }
}

export async function deleteDevice({
  device_id: deviceId,
  start_date: startDate,
  end_date: endDate,
  org,
}) {
  if (startDate && endDate && new Date(startDate) && new Date(endDate)) {
    return deleteCollection(
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

  return firestore
    .collection('Org').doc(org)
    .collection('Devices').doc(deviceId)
    .delete();
}

export const findOrCreate = async (
  org = 'UNKNOWN',
  {
    device_id: deviceId,
    device_model: deviceModel,
    framework,
    model,
    platform,
    uuid,
    version,
  },
) => {
  const dev = {
    device_id: uuid || deviceId || 'UNKNOWN',
    device_model: model || deviceModel || 'UNKNOWN',
  };
  const now = new Date();
  const ref = await firestore
    .collection('Org').doc(org)
    .collection('Devices').doc(dev.device_id);
  const snapshot = await ref.get();
  const device = omitBy(
    {
      ...dev,
      company_token: org,
      created_at: now,
      framework,
      model,
      platform,
      uuid,
      version,
    },
    isUndefined,
  );
  if (!snapshot.exists) {
    await ref.set(device);
  }

  const row = await ref.get();

  return toRow(row);
};
