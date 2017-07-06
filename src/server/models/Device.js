import LocationModel from '../database/LocationModel';
import { literal } from 'sequelize';

const filterByCompany = !!process.env.SHARED_DASHBOARD;

export async function getDevices (params) {
  const whereConditions = {};
  console.info(filterByCompany);
  if (filterByCompany) {
    whereConditions.company_token = params.company_token;
  }
  const result = await LocationModel.findAll({
    where: whereConditions,
    attributes: ['device_id', 'device_model'],
    group: ['device_id', 'device_model'],
    order: literal('max(recorded_at) DESC'),
  });
  return result;
}
