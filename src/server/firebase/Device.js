import isUndefined from 'lodash/isUndefined';
import omitBy from 'lodash/omitBy';

import {
  deleteCollection,
  firestore,
} from '.';

import { toRows, toRow } from '../libs/utils';

export async function getDevice({ id: uuid, org }) {
  try {
    const snapshot = await firestore
      .collection('Org').doc(org)
      .collection('Devices').doc(uuid)
      .get();
    const result = toRow(snapshot);

    return result;
  } catch (e) {
    console.error('v3:getDevice', e);
    return null;
  }
}

export async function getDevices({ org }, isAdmin) {
  if (!isAdmin && !org) {
    return [];
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
  id: uuid,
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
        .collection('Devices').doc(uuid)
        .collection('Locations')
        .where('recorded_at', '>', new Date(startDate))
        .where('recorded_at', '<', new Date(endDate)),
    );
  }

  return firestore
    .collection('Org').doc(org)
    .collection('Devices').doc(uuid)
    .delete();
}

export const findOrCreate = async (
  org = 'UNKNOWN',
  {
    model, uuid, framework, version,
  },
) => {
  const now = new Date();
  const ref = await firestore
    .collection('Org').doc(org)
    .collection('Devices').doc(uuid);
  const snapshot = await ref.get();
  const device = omitBy(
    {
      device_id: uuid || 'UNKNOWN',
      device_model: model || 'UNKNOWN',
      company_token: org,
      created_at: now,
      framework,
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
