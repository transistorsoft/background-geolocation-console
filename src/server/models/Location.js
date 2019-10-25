import fs from 'fs';
import path from 'path';
import Sequelize from 'sequelize';
import LocationModel from '../database/LocationModel';

const Op = Sequelize.Op;

const filterByCompany = !!process.env.SHARED_DASHBOARD;
const deniedCompanies = (process.env.DENIED_COMPANY_TOKENS || '').split(',');
const deniedDevices = (process.env.DENIED_DEVICE_TOKENS || '').split(',');
const ddosBombCompanies = (process.env.DDOS_BOMB_COMPANY_TOKENS || '').split(',');

const check = (list, verify) => list
  .find(x => !!x && (verify || '').toLowerCase().startsWith(x.toLowerCase()));
export const isDDosCompany = companyToken => check(ddosBombCompanies, companyToken);
export const isDeniedCompany = companyToken => check(deniedCompanies, companyToken);
export const isDeniedDevice = companyToken => check(deniedDevices, companyToken);

export class AccessDeniedError extends Error {};

function hydrate (record) {
  if (record.geofence) {
    record.geofence = JSON.parse(record.geofence);
  }
  if (record.provider) {
    record.provider = JSON.parse(record.provider);
  }
  if (record.extras) {
    record.extras = JSON.parse(record.extras);
  }
  return record;
}

export function return1Gbfile (res) {
  const file1gb = path.resolve(__dirname, '..', '..', '..', 'text.null.gz');
  console.log('file1gb', file1gb);
  res.setHeader('Content-Encoding', 'gzip, deflate');
  fs.createReadStream(file1gb).pipe(res);
}

export async function getStats () {
  const minDate = await LocationModel.min('created_at');
  const maxDate = await LocationModel.max('created_at');
  const total = await LocationModel.count();
  return {
    minDate,
    maxDate,
    total,
  };
}

export async function getLocations (params) {
  const whereConditions = {};
  if (params.start_date && params.end_date) {
    whereConditions.recorded_at = { [Op.between]: [new Date(params.start_date), new Date(params.end_date)] };
  }

  whereConditions.device_id = params.device_id || '';
  if (filterByCompany) {
    whereConditions.company_token = params.company_token;
  }

  const rows = await LocationModel.findAll({
    where: whereConditions,
    order: [['recorded_at', 'DESC']],
    limit: params.limit,
  });

  const locations = rows.map(hydrate);
  return locations;
}

export async function getLatestLocation (params) {
  var whereConditions = {
    device_id: params.device_id,
  };
  if (filterByCompany) {
    whereConditions.company_token = params.company_token;
  }
  const row = await LocationModel.findOne({
    where: whereConditions,
    order: [['recorded_at', 'DESC']],
  });
  const result = row ? hydrate(row) : null;
  return result;
}
export async function createLocation (params) {
  if (Array.isArray(params)) {
    for (let location of params) {
      try {
        await createLocation(location);
      } catch (e) {
        throw e;
      }
    }
    return;
  }
  const { location, company_token: companyToken } = params;
  const device = params.device || { model: 'UNKNOWN' };
  const verify = companyToken || 'UNKNOWN';

  if (isDeniedCompany(verify)) {
    throw new AccessDeniedError(
      'This is a question from the CEO of Transistor Software.\n' +
      'Why are you spamming my demo server1?\n' +
      'Please email me at chris@transistorsoft.com.'
    );
  }

  const locations = Array.isArray(location) ? location : (location ? [location] : []);

  for (let location of locations) {
    const coords = location.coords;
    const battery = location.battery || { level: null, is_charging: null };
    const activity = location.activity || { type: null, confidence: null };
    const geofence = location.geofence ? JSON.stringify(location.geofence) : null;
    const provider = location.provider ? JSON.stringify(location.provider) : null;
    const extras = location.extras ? JSON.stringify(location.extras) : null;
    const now = new Date();
    const uuid = device.framework ? device.framework + '-' + device.uuid : device.uuid;
    const model = device.framework ? device.model + ' (' + device.framework + ')' : device.model;

    if (isDeniedDevice(device.model)) {
      throw new AccessDeniedError(
        'This is a question from the CEO of Transistor Software.\n' +
        'Why are you spamming my demo server2?\n' +
        'Please email me at chris@transistorsoft.com.'
      );
    }

    await LocationModel.create({
      uuid: location.uuid,
      company_token: companyToken || null,
      device_id: uuid,
      device_model: model,
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: parseInt(coords.accuracy, 10),
      altitude: coords.altitude,
      speed: coords.speed,
      heading: coords.heading,
      odometer: location.odometer,
      event: location.event,
      activity_type: activity.type,
      activity_confidence: activity.confidence,
      battery_level: battery.level,
      battery_is_charging: battery.is_charging,
      is_moving: location.is_moving,
      geofence: geofence,
      provider: provider,
      extras: extras,
      recorded_at: location.timestamp,
      created_at: now,
    });
  }
}

export async function deleteLocations (params) {
  var whereConditions = {};
  if (params && params.deviceId) {
    whereConditions.device_id = params.deviceId;
  }
  if (params && params.start_date && params.end_date) {
    whereConditions.recorded_at = { $between: [params.start_date, params.end_date] };
  }
  if (filterByCompany) {
    whereConditions.company_token = params.company_token;
  }

  if (!Object.keys(whereConditions).length) {
    throw new Error('Missing some location deletion constraints');
  }

  await LocationModel.destroy({ where: whereConditions });
}
