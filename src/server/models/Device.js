import LocationModel from '../database/LocationModel';
import sequelize, { Op } from 'sequelize';

const filterByCompany = !!process.env.SHARED_DASHBOARD;

export async function getDevices (params) {
  const whereConditions = {};
  // console.info(filterByCompany);
  if (filterByCompany) {
    whereConditions.company_token = params.company_token;
  }
  const result = await LocationModel.findAll({
    where: whereConditions,
    attributes: ['device_id', 'device_model'],
    group: ['device_id', 'device_model'],
    order: [[sequelize.fn('max', sequelize.col('recorded_at')), 'DESC']],
  });
  return result;
}

export async function deleteDevice ({ id: deviceId, start_date: startDate, end_date: endDate }) {
  const where = { device_id: deviceId || 'blank' };
  if (startDate && endDate && new Date(startDate) && new Date(endDate)) {
    where.recorded_at = { [Op.between]: [new Date(startDate), new Date(endDate)] };
  }
  const result = await LocationModel.destroy({ where });
  return result;
}
