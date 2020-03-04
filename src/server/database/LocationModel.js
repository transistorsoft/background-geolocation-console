import Sequelize from 'sequelize';

import { isPostgres } from '../libs/utils';

import definition from './LocationDefinition';
import definedSequelizeDb from './define-sequelize-db';


if (isPostgres) {
  definition.data = { type: Sequelize.JSONB };
}

const LocationModel = definedSequelizeDb
  ? definedSequelizeDb.define('locations', definition, {
    timestamps: false,
    indexes: [
      { fields: ['recorded_at'] },
      { fields: ['device_id'] },
      { fields: ['company_id', 'device_id', 'recorded_at'] },
    ],
  })
  : {};

LocationModel.associate = models => {
  models.Location.belongsTo(models.Device, { foreignKey: 'device_id' });
  models.Location.belongsTo(models.Company, { foreignKey: 'company_id' });
};

export default LocationModel;
