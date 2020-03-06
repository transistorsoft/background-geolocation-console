import CompanyModel from '../database/CompanyModel';
import { hydrate } from '../libs/utils';
import { desc } from '../config';

export async function getOrgs({ org }, isAdmin) {
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

export async function findOrCreate({ org }) {
  const now = new Date();
  const [company] = await CompanyModel.findOrCreate({
    where: { company_token: org },
    defaults: {
      company_token: org,
      created_at: now,
      updated_at: now,
    },
    raw: true,
  });
  return company;
}

export const findOne = async ({ org }) => {
  const company = await CompanyModel.findOne({
    where: { company_token: org },
    raw: true,
  });
  return company;
};
