import Sequelize from 'sequelize';

import definedSequelizeDb from './define-sequelize-db.js';

const DeviceModel = definedSequelizeDb
  ? definedSequelizeDb.define(
    'devices',
    {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      company_id: {
        type: Sequelize.INTEGER,
        references: { model: 'companies', key: 'id' },
      },
      // , references: { model: 'companies' }
      company_token: { type: Sequelize.TEXT },
      device_id: { type: Sequelize.TEXT },
      device_model: { type: Sequelize.TEXT },
      created_at: { type: Sequelize.DATE },
      framework: { type: Sequelize.TEXT },
      version: { type: Sequelize.TEXT },
      updated_at: { type: Sequelize.DATE },
    },
    {
      timestamps: false,
      indexes: [
        { fields: ['device_id'] },
        { fields: ['company_id'] },
        { fields: ['company_token'] },
      ],
    },
  )
  : {};

DeviceModel.associate = models => {
  models.Device.hasMany(models.Location, { foreignKey: 'device_id' });
};

export default DeviceModel;
