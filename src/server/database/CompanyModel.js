import Sequelize from 'sequelize';
import definedSequelizeDb from './define-sequelize-db';

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
    updated_at: { type: Sequelize.DATE },
  },
  {
    timestamps: false,
  }
);

export default CompanyModel;
