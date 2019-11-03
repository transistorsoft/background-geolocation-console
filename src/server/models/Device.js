import DeviceModel from '../database/DeviceModel';
import LocationModel from '../database/LocationModel';
import { Op } from 'sequelize';

const filterByCompany = !!process.env.SHARED_DASHBOARD;

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
