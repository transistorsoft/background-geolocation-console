import { Op } from 'sequelize';
import Promise from 'bluebird';

import {
  firestore,
  getToken,
  verify,
} from '.';

import CompanyModel from '../database/CompanyModel';
import DeviceModel from '../database/DeviceModel';
import LocationModel from '../database/LocationModel';
import { toRows, toRow } from '../libs/utils';
import { firebaseOperationLimit } from '../config';


const checkLimit = async (counter, batch) => {
  if (
    firebaseOperationLimit > 0 &&
    (counter + 1) > firebaseOperationLimit
  ) {
    try {
      await batch.commit();
    } catch (e) {
      console.error('batch.commit', e);
    }
    process.exit(1);
  }
  return counter + 1;
};

export const transfer = async () => {
  const orgRef = firestore.collection('Org');

  const comps = await CompanyModel.findAll({
    order: [['id', 'asc']],
    raw: true,
  });
  const batch = firestore.batch();
  let counter = 0;
  await Promise.reduce(comps, async (p, x) => {
    console.log('Org/', x.company_token);
    const org = orgRef.doc(x.company_token);
    const devsRef = org.collection('Devices');
    await batch.set(org, x);
    counter = await checkLimit(counter, batch);
    const devices = await DeviceModel.findAll({
      where: { company_id: x.id },
      raw: true,
    });
    await Promise.reduce(devices, async (pp, dev) => {
      console.log('Org/', x.company_token, '/Devices/', dev.device_id);

      const devRef = devsRef.doc(dev.device_id);
      const locsRef = devRef.collection('Locations');
      const response = await locsRef.get();
      const locs = toRows(response);
      const locations = await LocationModel.findAll({
        where: { device_id: dev.id },
        id: { [Op.notIn]: locs.map(loc => loc.id) },
        uuid: { [Op.ne]: null },
        order: [['recorded_at', 'desc']],
        raw: true,
      });
      await batch.set(devRef, dev);
      counter = await checkLimit(counter, batch);
      await Promise.reduce(locations, async (ppp, loc) => {
        console.log('Org/', x.company_token, '/Devices/', dev.device_id, '/Locations/', loc.uuid);
        const locRef = locsRef.doc(`${loc.uuid}`);
        await batch.set(locRef, loc);
        counter = await checkLimit(counter, batch);
      });
    });
  });
  await batch.commit();
};

export default async ({ uuid, org }) => {
  const now = new Date();

  try {
    const jwt = await getToken({ org });

    // await clientApp.auth().signInWithCustomToken(jwt);

    // console.log('jwt', jwt);

    const jwtData = await verify(jwt);

    console.log('jwt:data', jwtData);

    await firestore.collection('Org')
      .doc(org)
      .set({
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
