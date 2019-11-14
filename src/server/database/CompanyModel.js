import Sequelize from 'sequelize';
import Promise from 'bluebird';
import definedSequelizeDb from './define-sequelize-db';
import LocationModel from './LocationModel';

const CompanyModel = definedSequelizeDb.define(
  'companies',
  {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    company_token: { type: Sequelize.TEXT },
    created_at: { type: Sequelize.DATE },
  },
  {
    timestamps: false,
    hooks: {
      async afterSync (name, callback) {
        const count = await CompanyModel.count();
        if (count) {
          return callback && callback();
        }
        const companies = await LocationModel.findAll({
          attributes: ['company_token'],
          where: { company_id: null },
          group: ['company_token'],
          order: [['company_token']],
          skipLocked: true,
          raw: true,
        });
        const result = await CompanyModel.bulkCreate(companies, { returning: true, raw: true });
        const queries = result.map(x => LocationModel.update(
          {
            company_id: x.id,
          },
          {
            where: { company_token: x.company_token },
            raw: true,
          },
        ));
        await Promise.reduce(queries, (p, q) => q, 0);
        callback && callback();
      },
    },
  }
);

export default CompanyModel;
