import fs from 'fs';
import path from 'path';
import Sequelize from 'sequelize';
import Promise from 'bluebird';
import CompanyModel from '../database/CompanyModel';
import DeviceModel from '../database/DeviceModel';
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

  params.device_id && (whereConditions.device_ref_id = +params.device_id);
  if (filterByCompany) {
    params.companyId && (whereConditions.company_id = +params.companyId);
    params.company_token && (whereConditions.company_token = params.company_token);
  }

  const rows = await LocationModel.findAll({
    where: whereConditions,
    order: [['recorded_at', 'DESC']],
    limit: params.limit,
    raw: true,
  });

  const locations = rows.map(hydrate);
  return locations;
}

export async function getLatestLocation (params) {
  var whereConditions = {};
  params.device_id && (whereConditions.device_ref_id = +params.device_id);
  if (filterByCompany) {
    params.companyId && (whereConditions.company_id = +params.companyId);
    params.company_token && (whereConditions.company_token = params.company_token);
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
  const deviceInfo = params.device || { model: 'UNKNOWN' };
  const companyName = companyToken || 'UNKNOWN';

  if (isDeniedCompany(companyName)) {
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
    const uuid = deviceInfo.framework ? deviceInfo.framework + '-' + deviceInfo.uuid : deviceInfo.uuid;
    const model = deviceInfo.framework ? deviceInfo.model + ' (' + deviceInfo.framework + ')' : deviceInfo.model;

    if (isDeniedDevice(deviceInfo.model)) {
      throw new AccessDeniedError(
        'This is a question from the CEO of Transistor Software.\n' +
        'Why are you spamming my demo server2?\n' +
        'Please email me at chris@transistorsoft.com.'
      );
    }

    const [company] = await CompanyModel.findOrCreate({
      where: { company_token: companyName },
      defaults: { created_at: now, company_token: companyName },
      raw: true,
    });
    const [device] = await DeviceModel.findOrCreate({
      where: { company_id: company.id, device_model: model },
      defaults: {
        company_id: company.id,
        company_token: companyName,
        device_id: uuid,
        device_model: model,
        created_at: now,
      },
      raw: true,
    });

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
      company_id: company.id,
      device_ref_id: device.id,
    });
  }
}

export async function deleteLocations (params) {
  const whereConditions = {};
  const verify = {};

  if (filterByCompany) {
    whereConditions.company_id = +params.companyId;
    verify.company_id = +params.companyId;
  }
  if (params && params.deviceId) {
    whereConditions.device_ref_id = +params.deviceId;
    verify.device_ref_id = +params.deviceId;
  }
  if (params && params.start_date && params.end_date) {
    whereConditions.recorded_at = { $between: [params.start_date, params.end_date] };
  }

  if (!Object.keys(whereConditions).length) {
    throw new Error('Missing some location deletion constraints');
  }

  await LocationModel.destroy({ where: whereConditions });

  if (params.deviceId) {
    const locationsCount = await LocationModel.count({
      where: verify,
    });
    if (!locationsCount) {
      await DeviceModel.destroy({
        where: { id: verify.device_ref_id },
      });
    }
  } else {
    const devices = await LocationModel.findAll({
      attributes: ['company_id', 'device_ref_id'],
      where: verify,
      group: ['company_id', 'device_ref_id'],
      raw: true,
    });
    const group = {};
    devices.forEach(x => (group[x.company_id] = (group[x.company_id] || []).concat([x.device_ref_id])));
    const queries = Object.keys(group)
      .map(companyId => DeviceModel.destroy({
        where: {
          company_id: +companyId,
          id: { $notIn: group[companyId] },
        },
        cascade: true,
        raw: true,
      }));
    await Promise.reduce(queries, (p, q) => q, 0);
  }
}
