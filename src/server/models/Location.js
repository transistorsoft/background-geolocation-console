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

const include = [{ model: DeviceModel, as: 'device' }];

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
    include,
  });

  const locations = rows.map(hydrate);
  return locations;
}

export async function getLatestLocation (params) {
  var whereConditions = {};
  params.device_id && (whereConditions.device_id = +params.device_id);
  if (filterByCompany) {
    params.companyId && (whereConditions.company_id = +params.companyId);
    params.company_id && (whereConditions.company_id = +params.company_id);
  }
  const row = await LocationModel.findOne({
    where: whereConditions,
    order: [['recorded_at', 'DESC']],
    include,
  });
  const result = row ? hydrate(row) : null;
  return result;
}

export async function createLocation (params, device = {}) {
  if (Array.isArray(params)) {
    for (let location of params) {
      try {
        await createLocation(location, device);
      } catch (e) {
        throw e;
      }
    }
    return;
  }
  const { company_token: companyToken, id } = device;
  const { location, company_token: token } = params;
  const deviceInfo = params.device || { model: 'UNKNOWN' };
  const companyName = companyToken || token || 'UNKNOWN';
  const now = new Date();

  if (isDeniedCompany(companyName)) {
    throw new AccessDeniedError(
      'This is a question from the CEO of Transistor Software.\n' +
      'Why are you spamming my demo server1?\n' +
      'Please email me at chris@transistorsoft.com.'
    );
  }

  const locations = Array.isArray(location) ? location : (location ? [location] : []);

  for (let location of locations) {
    const uuid = deviceInfo.uuid;
    const model = deviceInfo.model;

    if (isDeniedDevice(deviceInfo.model)) {
      throw new AccessDeniedError(
        'This is a question from the CEO of Transistor Software.\n' +
        'Why are you spamming my demo server2?\n' +
        'Please email me at chris@transistorsoft.com.'
      );
    }

    const currentDevice = id
      ? device
      : await findOrCreate(companyName, { ...deviceInfo, model, id: uuid });

    CompanyModel.update(
      { updated_at: now },
      { where: { id: currentDevice.company_id } }
    );
    DeviceModel.update(
      { updated_at: now },
      { where: { id: currentDevice.id } }
    );

    await LocationModel.create({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      data: jsonb(location),
      recorded_at: location.timestamp,
      created_at: now,
      company_id: currentDevice.company_id,
      device_id: currentDevice.id,
    });
  }
}

export async function deleteLocations (params) {
  const whereConditions = {};
  const verify = {};
  const companyId = params && (params.companyId || params.company_id);
  const deviceId = params && (params.deviceId || params.device_id);

  if (filterByCompany && !!companyId) {
    whereConditions.company_id = +companyId;
    verify.company_id = +companyId;
  }
  if (params && deviceId) {
    whereConditions.device_id = +deviceId;
    verify.device_id = +deviceId;
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
