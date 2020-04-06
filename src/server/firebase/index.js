import firebase from 'firebase/app';
import admin from 'firebase-admin';
import 'firebase/auth';
import 'firebase/database';

import {
  firebaseClientEmail,
  firebasePrivateKey,
  firebaseProjectId,
  firebaseURL as databaseURL,
} from '../config';

import { verify as verifier, getPublicKey } from '../libs/jwt';

export const credential = databaseURL && admin.credential.cert({
  project_id: firebaseProjectId,
  client_email: firebaseClientEmail,
  private_key: firebasePrivateKey,
});
export const serviceApp = databaseURL && admin.initializeApp({
  credential,
  databaseURL,
});

export const publicKey = databaseURL && getPublicKey(firebasePrivateKey);
export const verify = jwt => verifier(jwt, publicKey, {});

export const serviceDatabase = databaseURL && serviceApp.database();

export const firestore = databaseURL && serviceApp.firestore();

export { firebase };

export const createUser = async ({ org }) => {
  try {
    await serviceApp.auth()
      .createUser({
        disabled: false,
        email: `${org}@bgc.com`,
        uid: org,
      });
  } catch (e) {
    if (e.code !== 'auth/uid-already-exists') {
      // eslint-disable-next-line no-console
      console.error('v3', 'createUser:uid:already-exists', e);
    }
    if (e.code !== 'auth/email-already-exists') {
      // eslint-disable-next-line no-console
      console.error('v3', 'createUser:email:already-exists', e);
    }
  }
  return null;
};

export const getToken = async ({ org }) => {
  try {
    await serviceApp.auth().createUser({
      uid: org,
      email: `${org}@bgc.com`,
      disabled: false,
    });
  } catch (e) {
    if (e.code !== 'auth/uid-already-exists') {
      // eslint-disable-next-line no-console
      console.error('createUser:error', e);
    }
  }
  return serviceApp.auth().createCustomToken(org, { org });
};

export const deleteQueryBatch = (db, query, resolve, reject) => {
  query.get()
    .then(snapshot => {
      // When there are no documents left, we are done
      if (snapshot.size === 0) {
        return 0;
      }

      // Delete documents in a batch
      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      return batch.commit().then(() => snapshot.size);
    }).then(numDeleted => {
      if (numDeleted === 0) {
        resolve();
        return;
      }

      process.nextTick(() => deleteQueryBatch(db, query, resolve, reject));
    })
    .catch(reject);
};

export const deleteCollection = (db, key, collectionRef) => {
  const query = collectionRef.orderBy(key);

  return new Promise((resolve, reject) => deleteQueryBatch(db, query, resolve, reject));
};
