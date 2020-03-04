import {
  deleteCollection,
  firestore,
} from '.';

import { toRows, toRow } from '../libs/utils';

export async function getDevice({ id: uuid, org }) {
  const snapshot = await firestore
    .collection('Org').doc(org)
    .collection('Devices').doc(uuid)
    .get();
  const result = toRow(snapshot);

  return result;
}

export async function getDevices({ org }, isAdmin) {
  if (!isAdmin && !org) {
    return [];
  }

  const snapshot = await firestore
    .collection('Org').doc(org)
    .collection('Devices')
    .orderBy('updated_at', 'desc')
    .get();

  return toRows(snapshot);
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
  const device = {
    device_id: uuid || 'UNKNOWN',
    model: model || 'UNKNOWN',
  };
  const now = new Date();
  const ref = await firestore
    .collection('Org').doc(org)
    .collection('Devices').doc(uuid);
  const snapshot = await ref.get();

  if (!snapshot.exists) {
    await ref.set({
      company_token: org,
      device_id: device.device_id,
      device_model: device.model,
      created_at: now,
      framework,
      version,
    });
  }

  const row = await ref.get();

  return toRow(row);
};
