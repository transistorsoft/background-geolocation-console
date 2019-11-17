import {
  isAdmin,
  filterByCompany,
} from '../libs/utils';
import CompanyModel from '../database/CompanyModel';

export async function getCompanyTokens ({ company_token: companyToken }) {
  if (!filterByCompany) {
    return [
      {
        id: 1,
        company_token: 'bogus',
      },
    ];
  }
  const whereConditions = isAdmin(companyToken) ? {} : { company_token: companyToken };
  const result = await CompanyModel.findAll({
    where: whereConditions,
    attributes: ['id', 'company_token'],
    order: [['updated_at', 'DESC']],
    raw: true,

  });
  return result;
}

export async function findOrCreate ({ company_token: companyToken }) {
  const now = new Date();
  const [company] = await CompanyModel.findOrCreate({
    where: { company_token: companyToken },
    defaults: { created_at: now, company_token: companyToken, updated_at: now },
    raw: true,
  });
  return company;
};