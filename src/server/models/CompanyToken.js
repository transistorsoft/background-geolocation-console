import LocationModel from '../database/LocationModel';
import { literal } from 'sequelize';

const filterByCompany = !!process.env.SHARED_DASHBOARD;
const adminCompanyToken = process.env.ADMIN_TOKEN;

export async function getCompanyTokens (params) {
  if (!filterByCompany) {
    return [
      {
        company_token: 'bogus',
      },
    ];
  }
  const isAdmin = params.company_token === adminCompanyToken && adminCompanyToken;
  const whereConditions = isAdmin ? {} : { company_token: params.company_token };
  const result = await LocationModel.findAll({
    where: whereConditions,
    attributes: ['company_token'],
    group: ['company_token'],
    order: literal('company_token asc'),
  });
  return result;
}
