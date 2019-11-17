import { createReadStream } from 'fs';
import { resolve } from 'path';
import { verify } from './jwt';

export const filterByCompany = !!process.env.SHARED_DASHBOARD;
export const deniedCompanies = (process.env.DENIED_COMPANY_TOKENS || '').split(',');
export const deniedDevices = (process.env.DENIED_DEVICE_TOKENS || '').split(',');
export const ddosBombCompanies = (process.env.DDOS_BOMB_COMPANY_TOKENS || '').split(',');
export const isProduction = process.env.NODE_ENV === 'production';
export const isPostgres = !!process.env.DATABASE_URL;

const check = (list, item) => list
  .find(x => !!x && (item || '').toLowerCase().startsWith(x.toLowerCase()));
export const isDDosCompany = companyToken => check(ddosBombCompanies, companyToken);
export const isDeniedCompany = companyToken => check(deniedCompanies, companyToken);
export const isDeniedDevice = companyToken => check(deniedDevices, companyToken);
export const isAdmin = companyToken => !!filterByCompany &
  !!process.env.ADMIN_TOKEN &&
  companyToken === process.env.ADMIN_TOKEN;

export const jsonb = data => isPostgres ? (data || null) : JSON.stringify(data);

export class AccessDeniedError extends Error {};

export const raiseError = (res, message, error) => {
  const result = new AccessDeniedError(message);
  res.status(403).json({ status: 401, error: message });
  return error || result;
};

export function hydrate (row) {
  const record = row.toJSON();
  ['data']
    .filter(x => typeof record[x] === 'string')
    .forEach(x => {
      if (typeof record[x] === 'string') {
        try {
          record[x] = JSON.parse(record[x]);
        } catch (e) {
          console.error(`could not parse ${x} ${record.id}`, e);
          delete record[x];
        }
      }
    });
  const result = {
    ...record.device,
    activity_type: record.activity && record.activity.type,
    activity_confidence: record.activity && record.activity.confidence,
    battery_level: record.battery && record.battery.level,
    battery_is_charging: record.battery && record.battery.is_charging,
    ...record.data,
    ...record.coords,
    ...record,
    data: undefined,
  };
  delete result.data;
  delete result.device;

  return result;
}

export function return1Gbfile (res) {
  const file1gb = resolve(__dirname, '..', '..', '..', 'text.null.gz');
  console.log('file1gb', file1gb);
  res.setHeader('Content-Encoding', 'gzip, deflate');
  createReadStream(file1gb).pipe(res);
}

export const checkAuth = (req, res, next) => {
  const auth = (req.get('Authorization') || '').split(' ');

  if (auth.length < 2 || auth[0] !== 'Bearer') {
    return next(new AccessDeniedError('Authorization Bearer not found'));
  }
  const [, jwt] = auth;
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

export const checkCompany = ({ companyToken, model }) => {
  if (isDeniedCompany(companyToken)) {
    throw new AccessDeniedError(
      'This is a question from the CEO of Transistor Software.\n' +
      'Why are you spamming my demo server1/v2?\n' +
      'Please email me at chris@transistorsoft.com.'
    );
  }

  if (isDeniedDevice(model)) {
    throw new AccessDeniedError(
      'This is a question from the CEO of Transistor Software.\n' +
      'Why are you spamming my demo server2/v2?\n' +
      'Please email me at chris@transistorsoft.com.'
    );
  }
};
