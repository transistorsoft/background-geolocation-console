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
import { desc } from '../config';

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
  params.company_id && (whereConditions.company_id = +params.company_id);

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
  const { companyId } = params || {};
  if (!isAdmin && !(params.device_id || companyId)) {
    return [];
  }
  const whereConditions = { company_id: companyId };

  params.device_id && (whereConditions.device_id = +params.device_id);

  const row = await LocationModel.findOne({
    where: whereConditions,
    order: [['recorded_at', desc]],
    include,
  });
  const result = row ? hydrate(row) : null;
  return result;
}

export async function createLocation(
  params,
  {
    company_id: companyId,
    company_token: orgToken,
    id,
  } = {},
) {
  if (Array.isArray(params)) {
    return Promise.reduce(
      params,
      async (p, location) => {
        try {
          await createLocation(
            location,
            {
              company_id: companyId,
              company_token: orgToken,
              id,
            },
          );
        } catch (e) {
          console.error('createLocation', e);
          throw e;
        }
      },
      0,
    );
  }
  const { location: list, company_token: token } = params;
  const deviceInfo = params.device || { model: 'UNKNOWN', uuid: 'UNKNOWN' };
  const companyName = orgToken || token || 'UNKNOWN';
  const now = new Date();

  if (isDeniedCompany(companyName)) {
    throw new AccessDeniedError(
      'This is a question from the CEO of Transistor Software.\n' +
        'Why are you spamming my demo server1?\n' +
        'Please email me at chris@transistorsoft.com.',
    );
  }

  const locations = Array.isArray(list)
    ? list
    : list
      ? [list]
      : [];

  return Promise.reduce(
    locations,
    async (p, location) => {
      if (isDeniedDevice(deviceInfo.model)) {
        throw new AccessDeniedError(
          'This is a question from the CEO of Transistor Software.\n' +
            'Why are you spamming my demo server2?\n' +
            'Please email me at chris@transistorsoft.com.',
        );
      }

      ({
        company_id: companyId,
        company_token: orgToken,
        id,
      } = !orgToken
        ? await findOrCreate(companyName, { ...deviceInfo })
        : {
          company_id: companyId,
          company_token: orgToken,
          id,
        });

      CompanyModel.update(
        { updated_at: now },
        { where: { id: companyId } },
      );
      DeviceModel.update(
        { updated_at: now },
        { where: { id } },
      );

      console.info(
        'location:create'.green,
        'org:name'.green,
        companyName,
        'org:id'.green,
        companyId,
        'device:id'.green,
        id,
      );
      const row = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        data: jsonb(location),
        recorded_at: location.timestamp,
        created_at: now.toISOString(),
        company_id: companyId,
        device_id: id,
      };
      return LocationModel.create(row);
    },
    0,
  );
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
