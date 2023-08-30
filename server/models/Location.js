/* eslint-disable no-param-reassign */
/* eslint-disable no-console */
import sequelizePkg from 'sequelize';
const { Op } = sequelizePkg;
import Promise from 'bluebird';

import CompanyModel from '../database/CompanyModel.js';
import DeviceModel from '../database/DeviceModel.js';
import LocationModel from '../database/LocationModel.js';
import {
  AccessDeniedError,
  hydrate,
  isDeniedCompany,
  isDeniedDevice,
  jsonb,
} from '../libs/utils.js';
import {
  dataLogOn,
  desc,
  withAuth,
} from '../config.js';

import { findOrCreate } from './Device.js';

const include = [{ model: DeviceModel, as: 'device' }];

export async function getStats(org) {
  let where = {};
  if (org) {
    org = org.org || org;
    const organization = await CompanyModel.findOne({ where: { company_token: org } });
    where = { company_id: organization.id };
  }
  const minDate = await LocationModel.min('created_at', { where });
  const maxDate = await LocationModel.max('created_at', { where });
  const minRecordedDate = await LocationModel.min('recorded_at', { where });
  const maxRecordedDate = await LocationModel.max('recorded_at', { where });
  const total = await LocationModel.count({ where });
  return {
    minDate,
    maxDate,
    minRecordedDate,
    maxRecordedDate,
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
    order: [
      ['recorded_at', desc],
      ['created_at', desc]
    ],
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

/// RegExp:  Does this companyToken begin with "transistor-" or "_transistor-"?  That data is special and doesn't get DELETEd
///
const IS_TRANSISTOR_TOKEN = /^_?transistor-.*/;

export async function removeOld(org) {
  if (org) {
    org = org.org || org;
  }
  if (!org) {
    const organizations = await CompanyModel.findAll();
    for (let o of organizations) {
      await removeOld(o.company_token);
    }
    return;
  }
  // Org names of form "_transistor-*" / "transistor-*" get special treatment.  Don't delete those records!
  const organization = await CompanyModel.findOne({ where: { company_token: org } });
  const count = await LocationModel.count({ where: { company_id: organization.id } });
  if (count > 10000 && !IS_TRANSISTOR_TOKEN.test(organization.company_token)) {
    const entry = await LocationModel.findOne({
      where: { company_id: organization.id },
      offset: 10000,
      order: [['recorded_at', 'DESC']],
    });
    const minDate = entry.recorded_at;
    console.info('first allowed:', minDate);
    LocationModel.destroy({
      where: {
        company_id: organization.id,
        recorded_at: { [Op.lt]: minDate },
      },
    });
  }
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
      'This is a question from the CEO of Transistor Software:\n' +
          'Why are you spamming my demo server?\n' +
          'Please email me at chris@transistorsoft.com.', {cause: 'banned'}
    );
  }
  if (isDeniedDevice(device.device_model)) {
    throw new AccessDeniedError(
      'This is a question from the CEO of Transistor Software:\n' +
        'Why are you spamming my demo server?\n' +
        'Please email me at chris@transistorsoft.com.', {cause: 'banned'}
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
