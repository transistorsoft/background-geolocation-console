import { Op } from 'sequelize';
import Promise from 'bluebird';
import CompanyModel from '../database/CompanyModel';
import DeviceModel from '../database/DeviceModel';
import LocationModel from '../database/LocationModel';
import { findOrCreate } from './Device';
import {
  AccessDeniedError,
  filterByCompany,
  hydrate,
  isDeniedCompany,
  isDeniedDevice,
  jsonb,
} from '../libs/utils';

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

  params.device_id && (whereConditions.device_id = +params.device_id);
  if (filterByCompany) {
    params.company_id && (whereConditions.company_id = +params.company_id);
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
  params.device_id && (whereConditions.device_id = +params.device_id);
  if (filterByCompany) {
    params.companyId && (whereConditions.company_id = +params.companyId);
  }
  const row = await LocationModel.findOne({
    where: whereConditions,
    order: [['recorded_at', 'DESC']],
    raw: true,
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
    const geofence = jsonb(location.geofence);
    const provider = jsonb(location.provider);
    const extras = jsonb(location.extras);
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

    const company = await findOrCreate(companyName);
    const [device] = await DeviceModel.findOrCreate({
      where: { company_id: company.id, device_model: model },
      defaults: {
        company_id: company.id,
        created_at: now,
        device_id: uuid,
        device_model: model,
        framework: deviceInfo.framework,
        version: deviceInfo.version,
        updated_at: now,
      },
      raw: true,
    });

    CompanyModel.update({ updated_at: now }, { where: { id: company.id } });
    DeviceModel.update({ updated_at: now }, { where: { id: device.id } });

    await LocationModel.create({
      uuid: location.uuid,
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
      device_id: device.id,
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
    whereConditions.device_id = +params.deviceId;
    verify.device_id = +params.deviceId;
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
        where: { id: verify.device_id },
      });
    }
  } else {
    const devices = await LocationModel.findAll({
      attributes: ['company_id', 'device_id'],
      where: verify,
      group: ['company_id', 'device_id'],
      raw: true,
    });
    const group = {};
    devices.forEach(x => (group[x.company_id] = (group[x.company_id] || []).concat([x.device_id])));
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
