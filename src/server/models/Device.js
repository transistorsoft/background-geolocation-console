import LocationModel from '../database/LocationModel';
import sequelize from 'sequelize';

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

export async function deleteDevice (deviceId) {
  await LocationModel.destroy({ where: { device_id: deviceId || 'blank' } });
}
