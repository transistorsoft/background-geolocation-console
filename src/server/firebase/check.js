import {
  firestore,
  getToken,
  verify,
} from '.';


import { toRows, toRow } from '../libs/utils';

export default async ({ uuid, org }) => {
  const now = new Date();


  try {
    const jwt = await getToken({ org });

    // await clientApp.auth().signInWithCustomToken(jwt);

    // console.log('jwt', jwt);

    const jwtData = await verify(jwt);

    console.log('jwt:data', jwtData);

    await firestore.collection('Org')
      .doc(org).set({
        company_token: org,
        created_at: now,
      });

    const ref = firestore
      .collection('Org').doc(org)
      .collection('Devices').doc(uuid);

    const snapshot = await ref.get();
    if (!snapshot.exists) {
      await ref.set({
        company_token: org,
        created_at: now,
        device_id: uuid,
        // uuid,
      });
      await ref
        .collection('Locations').doc('test')
        .set({ recorded_at: now });
    }

    const result = await ref
      .collection('Locations')
      .add({ recorded_at: now });
    const fOne = await firestore
      .collection('Org').doc(org)
      .collection('Devices').doc(uuid)
      .get();
    const fDevices = await firestore
      .collection('Org').doc(org)
      .collection('Devices')
      .get();
    const fLocation = await firestore
      .collection('Org').doc(org)
      .collection('Devices').doc(uuid)
      .collection('Locations')
      .doc('test')
      .get();
    const fLocations = await firestore
      .collection('Org').doc(org)
      .collection('Devices').doc(uuid)
      .collection('Locations')
      .orderBy('recorded_at', 'desc')
      .get();

    const batch = firestore.batch();
    batch.update(ref, { test: 2 });
    await batch.commit();

    console.log('firestore:result', result.id);
    console.log('firestore:device', toRow(fOne));
    console.log('firestore:devices', toRows(fDevices));
    console.log('firestore:location', toRow(fLocation));
    console.log('firestore:locations', toRows(fLocations));
  } catch (e) {
    console.log('result:error', e);
  }

  // await clientApp.auth().signOut();
};
