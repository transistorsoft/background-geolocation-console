import {
  filterByCompany,
} from '../libs/utils';
import CompanyModel from '../database/CompanyModel';

const adminCompanyToken = process.env.ADMIN_TOKEN;

export async function getCompanyTokens ({ company_token: companyToken }) {
  if (!filterByCompany) {
    return [
      {
        company_token: 'bogus',
      },
    ];
  }
  const isAdmin = !!adminCompanyToken && companyToken === adminCompanyToken;
  const whereConditions = isAdmin ? {} : { company_token: companyToken };
  const result = await CompanyModel.findAll({
    where: whereConditions,
    attributes: ['id', 'company_token'],
    order: [['created_at', 'DESC']],
    raw: true,

  });
  return result;
}
