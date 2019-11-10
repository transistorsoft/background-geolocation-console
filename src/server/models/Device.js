import { Op } from 'sequelize';

import CompanyModel from '../database/CompanyModel';
import DeviceModel from '../database/DeviceModel';
import LocationModel from '../database/LocationModel';
import {
  checkCompany,
  filterByCompany,
} from '../libs/utils';

export async function getDevices (params) {
  const whereConditions = {};
  if (filterByCompany) {
    params.company_id && (whereConditions.company_id = +params.company_id);
    params.company_token && (whereConditions.company_token = params.company_token);
  }
  const result = await DeviceModel.findAll({
    where: whereConditions,
    attributes: ['id', 'device_id', 'device_model', 'company_id', 'company_token'],
    order: [['created_at', 'DESC']],
    raw: true,
  });
  return result;
}

export async function deleteDevice ({
  id: deviceId,
  company_id: companyId,
  start_date: startDate,
  end_date: endDate,
}) {
  const whereByDevice = {
    company_id: companyId,
    device_ref_id: deviceId,
  };
  const where = { ...whereByDevice };
  if (startDate && endDate && new Date(startDate) && new Date(endDate)) {
    where.recorded_at = { [Op.between]: [new Date(startDate), new Date(endDate)] };
  }
  const result = await LocationModel.destroy({ where });
  const locationsCount = await LocationModel.count({ where: whereByDevice });
  if (!locationsCount) {
    await DeviceModel.destroy({
      where: {
        id: deviceId,
        company_id: companyId,
      },
      cascade: true,
    });
  }
  return result;
}

export const findOrCreate = async (companyToken = 'UNKNOWN', { model, id, framework, version }) => {
  const device = { model: model || 'UNKNOWN', id };
  const now = new Date();

  checkCompany({ companyToken, model: device.model });

  const [company] = await CompanyModel.findOrCreate({
    where: { company_token: companyToken },
    defaults: { created_at: now, company_token: companyToken },
    raw: true,
  });
  console.log('company', company);
  const [row] = await DeviceModel.findOrCreate({
    where: { company_id: company.id },
    defaults: {
      company_id: company.id,
      company_token: companyToken,
      device_id: device.id,
      device_model: device.model,
      created_at: now,
      framework,
      version,
    },
    raw: true,
  });

  return row;
};
