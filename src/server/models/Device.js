import { Op } from 'sequelize';


import DeviceModel from '../database/DeviceModel';
import LocationModel from '../database/LocationModel';
import { checkCompany } from '../libs/utils';
import { desc } from '../config';

import { findOrCreate as findOrCreateCompany } from './Org';

export async function getDevice({
  id, device_id: deviceId, org,
}) {
  const whereConditions = id
    ? { id, company_token: org }
    : { device_id: deviceId, company_token: org };
  const result = await DeviceModel.findOne({
    where: whereConditions,
    attributes: [
      'id',
      'device_id',
      'device_model',
      'company_id',
      'company_token',
    ],
    raw: true,
  });
  return result;
}

export async function getDevices(params, isAdmin) {
  const { org, companyId } = params || {};

  if (!isAdmin && !(org || companyId)) {
    return [];
  }

  const whereConditions = isAdmin
    ? { company_id: companyId }
    : { company_token: org };

  const result = await DeviceModel.findAll({
    where: whereConditions,
    attributes: [
      'id',
      'device_id',
      'device_model',
      'company_id',
      'company_token',
      'framework',
    ],
    order: [
      ['updated_at', desc],
      ['created_at', desc],
    ],
    raw: true,
  });
  return result;
}

export async function deleteDevice(
  {
    end_date: endDate,
    id: deviceId,
    org,
    start_date: startDate,
  },
  isAdmin,
) {
  const device = await DeviceModel.findOne({
    where: !isAdmin
      ? { company_token: org, id: deviceId }
      : { id: deviceId },
    attributes: [
      'id',
      'device_id',
      'device_model',
      'company_id',
      'company_token',
    ],
    raw: true,
  });

  if (!device) {
    return null;
  }

  const whereByDevice = { device_id: deviceId };
  const where = { ...whereByDevice };
  if (startDate && endDate && new Date(startDate) && new Date(endDate)) {
    where.recorded_at = { [Op.between]: [new Date(startDate), new Date(endDate)] };
  }
  const result = await LocationModel.destroy({ where });
  const locationsCount = await LocationModel.count({ where: whereByDevice });
  if (!locationsCount) {
    await DeviceModel.destroy({
      where: { id: deviceId },
      cascade: true,
    });
  }
  return result;
}

export const findOrCreate = async (
  org = 'UNKNOWN',
  {
    framework,
    model,
    uuid,
    version,
  },
) => {
  const device = {
    device_id: uuid || 'UNKNOWN',
    model: model || 'UNKNOWN',
  };
  const now = new Date();

  checkCompany({ org, model: device.model });

  const company = await findOrCreateCompany({ org });
  const where = { company_id: company.id };

  uuid && (where.device_id = uuid);

  const [row] = await DeviceModel.findOrCreate({
    where,
    defaults: {
      company_id: company.id,
      company_token: org,
      device_id: device.device_id,
      device_model: device.model,
      created_at: now,
      framework,
      version,
    },
    raw: true,
  });

  return row;
};
