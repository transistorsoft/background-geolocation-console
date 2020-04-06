/* eslint-disable no-param-reassign */
/* eslint-disable no-console */
import { Op } from 'sequelize';
import Promise from 'bluebird';

import CompanyModel from '../database/CompanyModel';
import DeviceModel from '../database/DeviceModel';
import LocationModel from '../database/LocationModel';
import {
  AccessDeniedError,
  hydrate,
  isDeniedCompany,
  isDeniedDevice,
  jsonb,
} from '../libs/utils';
import {
  dataLogOn,
  desc,
  withAuth,
} from '../config';

import { findOrCreate } from './Device';

const include = [{ model: DeviceModel, as: 'device' }];

export async function getStats() {
  const minDate = await LocationModel.min('created_at');
  const maxDate = await LocationModel.max('created_at');
  const total = await LocationModel.count();
  return {
    minDate,
    maxDate,
    total,
  };
}

export async function getLocations(params, isAdmin) {
  if (!isAdmin && !(params.device_id || params.company_id)) {
    return [];
  }

  const whereConditions = {};
  if (params.start_date && params.end_date) {
    whereConditions.recorded_at = { [Op.between]: [new Date(params.start_date), new Date(params.end_date)] };
  }

  params.device_id && (whereConditions.device_id = +params.device_id);
  withAuth && params.company_id && (whereConditions.company_id = +params.company_id);

  const rows = await LocationModel.findAll({
    where: whereConditions,
    order: [['recorded_at', desc]],
    limit: params.limit,
    include,
  });

  const locations = rows.map(hydrate);
  return locations;
}

export async function getLatestLocation(params, isAdmin) {
  const {
    company_id: companyId,
    device_id: deviceId,
  } = params || {};
  if (!isAdmin && !(deviceId || companyId)) {
    return [];
  }
  const whereConditions = {};

  withAuth && (whereConditions.company_id = companyId);
  deviceId && (whereConditions.device_id = +deviceId);

  const row = await LocationModel.findOne({
    where: whereConditions,
    order: [['recorded_at', desc]],
    include,
  });
  const result = row ? hydrate(row) : {};
  return result;
}

export async function createLocation(location, device, org) {
  const now = new Date();

  CompanyModel.update(
    { updated_at: now },
    { where: { id: device.company_id } },
  );
  DeviceModel.update(
    { updated_at: now },
    { where: { id: device.id } },
  );

  console.info(
    'v1:location:create'.green,
    'org:name'.green,
    org,
    'org:id'.green,
    device.company_id,
    'device:id'.green,
    device.device_id,
  );
  const row = {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    data: jsonb(location),
    recorded_at: location.timestamp,
    created_at: now.toISOString(),
    company_id: device.company_id,
    device_id: device.id,
  };
  console.info('v1:location:create'.green, JSON.stringify(device), JSON.stringify(row));
  return LocationModel.create(row);
}

export async function createLocations(
  locations,
  device,
  org,
) {
  return Promise.reduce(
    locations,
    async (p, location) => {
      try {
        await createLocation(
          location,
          device,
          org,
        );
      } catch (e) {
        console.error('v1:createLocation', e);
        throw e;
      }
    },
    0,
  );
}

export async function create(
  params,
  org,
  dev = {},
) {
  if (Array.isArray(params)) {
    return Promise.reduce(
      params,
      async (p, pp) => {
        try {
          await create(pp, org, dev);
        } catch (e) {
          console.error('v1:create', e);
          throw e;
        }
      },
      0,
    );
  }

  const {
    company_token: companyToken,
    device: propDevice = {},
    framework,
    location: list = [],
    manufacturer,
    model,
    platform,
    uuid,
    version,
  } = params;
  const deviceInfo = {
    company_token: companyToken || propDevice.company_token || propDevice.org || dev.company_token || dev.org,
    framework: framework || propDevice.framework || dev.framework,
    manufacturer: manufacturer || propDevice.manufacturer || dev.manufacturer,
    model: model || propDevice.model || propDevice.device_model || dev.device_model || dev.model || 'UNKNOWN',
    platform: platform || propDevice.platform || dev.platform,
    uuid: uuid || propDevice.device_id || propDevice.uuid || dev.uuid || dev.device_id || 'UNKNOWN',
    version: version || propDevice.version || dev.version,
  };
  const deviceId = propDevice.id || dev.id;
  const token = org ||
    companyToken ||
    params.org ||
    (deviceInfo && deviceInfo.company_token) ||
    'UNKNOWN';
  const device = dev || await findOrCreate(
    token,
    deviceId ? { id: deviceId } : deviceInfo,
  );
  const locations = Array.isArray(list)
    ? list
    : (
      list
        ? [list]
        : []
    );

  dataLogOn && console.log('v1:create:device'.yellow, token, JSON.stringify(deviceInfo), JSON.stringify(device));

  if (isDeniedCompany(token)) {
    throw new AccessDeniedError(
      'This is a question from the CEO of Transistor Software.\n' +
          'Why are you spamming my demo server1?\n' +
          'Please email me at chris@transistorsoft.com.',
    );
  }
  if (isDeniedDevice(device.device_model)) {
    throw new AccessDeniedError(
      'This is a question from the CEO of Transistor Software.\n' +
        'Why are you spamming my demo server2?\n' +
        'Please email me at chris@transistorsoft.com.',
    );
  }

  return createLocations(locations, device, token);
}

export async function deleteLocations(params, isAdmin) {
  if (!isAdmin && !(params.companyId || params.deviceId)) {
    return;
  }

  const whereConditions = {};
  const verify = {};
  const companyId = params && params.companyId;
  const deviceId = params && (params.deviceId || params.device_id);

  if (!isAdmin) {
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
    const locationsCount = await LocationModel.count({ where: verify });
    if (!locationsCount && verify.device_id) {
      await DeviceModel.destroy({ where: { id: verify.device_id } });
    }
  } else if (companyId) {
    const devices = await LocationModel.findAll({
      attributes: ['company_id', 'device_id'],
      where: verify,
      group: ['company_id', 'device_id'],
      raw: true,
    });
    const group = {};
    devices.forEach(
      x => (group[x.company_id] = (group[x.company_id] || []).concat([
        x.device_id,
      ])),
    );
    const queries = Object.keys(group)
      .map(id => DeviceModel.destroy({
        where: {
          company_id: +id,
          id: { $notIn: group[id] },
        },
        cascade: true,
        raw: true,
      }));
    await Promise.reduce(queries, (p, q) => q, 0);
  }
}
