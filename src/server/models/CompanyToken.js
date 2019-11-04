import CompanyModel from '../database/CompanyModel';

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
  const result = await CompanyModel.findAll({
    where: whereConditions,
    attributes: ['id', 'company_token'],
    order: [['created_at', 'DESC']],
    raw: true,

  });
  return result;
}
