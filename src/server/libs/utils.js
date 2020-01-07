/* eslint-disable max-classes-per-file */
import { createReadStream } from 'fs';
import { resolve } from 'path';

import { verify } from './jwt';

// If client registration fails due to not being connected to network,
// an accessToken: "DUMMY_TOKEN" is provided to the SDK.
// If the server receives this token,
// send an HTTP response status "406 Not Acceptable".
// This signal will be detected by the client
// and it will hit /v2/registration once again.
const DUMMY_TOKEN = 'DUMMY_TOKEN';

export const filterByCompany = !!process.env.SHARED_DASHBOARD;
export const deniedCompanies = (process.env.DENIED_COMPANY_TOKENS || '').split(',');
export const deniedDevices = (process.env.DENIED_DEVICE_TOKENS || '').split(',');
export const ddosBombCompanies = (
  process.env.DDOS_BOMB_COMPANY_TOKENS || ''
).split(',');
export const isProduction = process.env.NODE_ENV === 'production';
export const isPostgres = !!process.env.DATABASE_URL;
export const desc = isPostgres ? 'DESC NULLS LAST' : 'DESC';

const check = (list, item) => list.find(x => !!x && (item || '').toLowerCase().startsWith(x.toLowerCase()));
export const isDDosCompany = orgToken => check(ddosBombCompanies, orgToken);
export const isDeniedCompany = orgToken => check(deniedCompanies, orgToken);
export const isDeniedDevice = orgToken => check(deniedDevices, orgToken);
export const isAdmin = orgToken => !!filterByCompany & !!process.env.ADMIN_TOKEN &&
  orgToken === process.env.ADMIN_TOKEN;

export const jsonb = data => (isPostgres ? data || null : JSON.stringify(data));

export class AccessDeniedError extends Error {}
export class RegistrationRequiredError extends Error {}

export const raiseError = (res, message, error) => {
  const result = new AccessDeniedError(message);
  res.status(403).json({ status: 401, error: message });
  return error || result;
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

export const checkAuth = (req, res, next) => {
  const auth = (req.get('Authorization') || '').split(' ');

  if (auth.length < 2 || auth[0] !== 'Bearer') {
    return next(new AccessDeniedError('Authorization Bearer not found'));
  }
  const [, jwt] = auth;

  if (jwt === DUMMY_TOKEN) {
    // const error = new RegistrationRequiredError('Registration required');
    // TODO would rather throw error here but
    // I couldn't figure out where these thrown errors end up.
    // Ideally some global error handler would check instanceof RegistrationRequiredError and res.status(406).
    // @see const DUMMY_TOKEN above for more information.
    return res.status(406).send();
  }
  try {
    const decoded = verify(jwt);
    req.jwt = decoded;
    if (!decoded) {
      return next(raiseError(res, 'Could not decode JWT'));
    }
    return next();
  } catch (e) {
    return next(raiseError(res, 'Wrong JWT', e));
  }
};

export const checkCompany = ({ org, model }) => {
  if (isDeniedCompany(org)) {
    throw new AccessDeniedError(
      'This is a question from the CEO of Transistor Software.\n' +
      'Why are you spamming my demo server1/v2?\n' +
      'Please email me at chris@transistorsoft.com.',
    );
  }

  if (isDeniedDevice(model)) {
    throw new AccessDeniedError(
      'This is a question from the CEO of Transistor Software.\n' +
      'Why are you spamming my demo server2/v2?\n' +
      'Please email me at chris@transistorsoft.com.',
    );
  }
};
