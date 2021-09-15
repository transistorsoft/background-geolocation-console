import { firestore } from './index.js';

import { toRows, toRow } from '../libs/utils.js';

export async function getOrgs({ org }, isAdmin) {
  if (!isAdmin && !org) {
    return [
      {
        id: 'bogus',
        company_token: 'bogus',
      },
    ];
  }

  if (isAdmin) {
    const snapshot = await firestore.collection('Org').get();
    return toRows(snapshot);
  }

  const snapshot = await firestore.collection('Org').doc(org).get();
  const result = toRow(snapshot);

  return [result];
}

export async function findOrCreate({ org }) {
  const now = new Date();
  const ref = firestore.collection('Org').doc(org);
  const snapshot = await ref.get();

  if (!snapshot.exists) {
    await ref.set({
      created_at: now,
      company_token: org,
      updated_at: now,
    });
  }
  const doc = await ref.get();

  return toRow(doc);
}
