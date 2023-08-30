/* eslint-disable max-classes-per-file */
import { createReadStream } from 'fs';
import { resolve } from 'path';

import firebaseAdminPkg from 'firebase-admin';
const { firestore } = firebaseAdminPkg;

import {
  adminToken,
  adminUsername,
  dataLogOn,
  ddosBombCompanies,
  deniedCompanies,
  deniedDevices,
  dummyToken,
  password,
  withAuth,
  isPostgres
} from '../config.js';

const check = (list, item) => list.find(x => !!x && (item || '').toLowerCase().startsWith(x.toLowerCase()));
export const isDDosCompany = orgToken => check(ddosBombCompanies, orgToken);
export const isDeniedCompany = orgToken => check(deniedCompanies, orgToken);
export const isDeniedDevice = orgToken => check(deniedDevices, orgToken);
export const isAdminToken = orgToken => (!!adminToken && orgToken === adminToken) ||
  (!!adminUsername && adminUsername === orgToken);
export const isPassword = p => password === p;
export const isAdmin = ({ admin } = {}) => !!admin || !withAuth;
export const jsonb = data => (!data ? null : JSON.stringify(data));
export { dataLogOn };

export class AccessDeniedError extends Error {}
export class RegistrationRequiredError extends Error {}

export const raiseError = (res, message, error) => {
  const result = new AccessDeniedError(message);
  res.status(403).json({ status: 401, error: message });
  return error || result;
};

export const toRow = fObj => {
  if (!fObj) {
    return null;
  }
  const result = fObj.data({ serverTimestamps: 'previous' });
  result.id = fObj.id;
  [
    'created_at',
    'recorded_at',
    'updated_at',
  ]
    .filter(x => x in result && result[x] instanceof firestore.Timestamp)
    .forEach(x => (result[x] = result[x].toDate()));
  return result;
};

export const toRows = fObject => {
  const result = [];
  fObject.forEach(x => result.push(toRow(x)));
  return result;
};

export function hydrate(row) {
  const record = row.toJSON();
  ['data']
    .filter(x => typeof record[x] === 'string')
    .forEach(x => {
      if (typeof record[x] === 'string') {
        try {
          record[x] = JSON.parse(record[x]);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(`could not parse ${x} ${record.id}`, e);
          delete record[x];
        }
      }
    });
  const { data, device } = record;
  const result = {
    ...device,
    activity_type: data.activity && data.activity.type,
    activity_confidence: data.activity && data.activity.confidence,
    battery_level: data.battery && data.battery.level,
    battery_is_charging: data.battery && data.battery.is_charging,
    ...data,
    ...data.coords,
    ...record,
    uuid: data.uuid,
  };
  ['data', 'device', 'activity', 'battery', 'coords'].forEach(
    x => delete result[x],
  );

  return result;
}

export function return1Gbfile(res) {
  const file1gb = resolve(__dirname, '..', '..', '..', 'text.null.gz');
  res.setHeader('Content-Encoding', 'gzip, deflate');
  createReadStream(file1gb).pipe(res);
}

export const checkAuth = verifier => (req, res, next) => {
  const auth = (req.get('Authorization') || '').split(' ');

  if (auth.length < 2 || auth[0] !== 'Bearer') {
    return next(new AccessDeniedError('Authorization Bearer not found'));
  }
  const [, jwt] = auth;

  if (jwt === dummyToken) {
    // const error = new RegistrationRequiredError('Registration required');
    // TODO would rather throw error here but
    // I couldn't figure out where these thrown errors end up.
    // Ideally some global error handler would check instanceof RegistrationRequiredError and res.status(406).
    // @see const dummyToken above for more information.
    return res.status(406).send();
  }
  try {
    const decoded = verifier(jwt);
    req.jwt = {
      ...decoded,
      ...decoded.claims,
    };
    if (!decoded) {
      return next(raiseError(res, 'Could not decode JWT'));
    }
    return next();
  } catch (e) {
    return next(raiseError(res, 'Wrong JWT', e));
  }
};

export const getAuth = verifier => (req, res, next) => {
  const auth = (req.get('Authorization') || '').split(' ');

  if (auth.length >= 2 && auth[0] === 'Bearer') {
    const [, jwt] = auth;
    try {
      const decoded = verifier(jwt);
      req.jwt = {
        ...decoded,
        ...decoded.claims,
      };
      return next();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('getAuth', e);
    }
  }
  return next();
};

export const checkCompany = ({ org, model }) => {
  if (isDeniedCompany(org)) {
    throw new AccessDeniedError(
      'This is a question from the CEO of Transistor Software:\n' +
      'Why are you spamming my demo server?\n' +
      'Please email me at chris@transistorsoft.com.', {cause: 'banned'}
    );
  }

  if (isDeniedDevice(model)) {
    throw new AccessDeniedError(
      'This is a question from the CEO of Transistor Software:\n' +
      'Why are you spamming my demo server?\n' +
      'Please email me at chris@transistorsoft.com.', {cause: 'banned'}
    );
  }
};
