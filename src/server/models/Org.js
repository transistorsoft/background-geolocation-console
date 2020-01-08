import { desc } from '../libs/utils';
import CompanyModel from '../database/CompanyModel';


export async function getOrgs({ company_token: org }, isAdmin) {
  if (!isAdmin && !org) {
    return [
      {
        id: 1,
        company_token: 'bogus',
      },
    ];
  }

  const whereConditions = isAdmin ? {} : { company_token: org };
  const result = await CompanyModel.findAll({
    where: whereConditions,
    attributes: ['id', 'company_token'],
    order: [['updated_at', desc]],
    raw: true,
  });
  return result;
}

export async function findOrCreate({ company_token: org }) {
  const now = new Date();
  const [company] = await CompanyModel.findOrCreate({
    where: { company_token: org },
    defaults: {
      created_at: now, company_token: org, updated_at: now,
    },
    raw: true,
  });
  return company;
}
