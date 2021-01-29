import Sequelize from 'sequelize';

import definedSequelizeDb from './define-sequelize-db.js';

const CompanyModel = definedSequelizeDb
  ? definedSequelizeDb.define(
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
    { timestamps: false },
  )
  : {};

CompanyModel.associate = models => {
  models.Company.hasMany(models.Device, { foreignKey: 'company_id' });
  models.Company.hasMany(models.Location, { foreignKey: 'company_id' });
};

export default CompanyModel;
