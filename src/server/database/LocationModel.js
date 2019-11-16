import Sequelize from 'sequelize';

import definition from './LocationDefinition';
import definedSequelizeDb from './define-sequelize-db';

if (process.env.DATABASE_URL) {
  definition.provider =
    definition.geofence =
      definition.extras = {
        type: Sequelize.JSONB,
      };
}

const LocationModel = definedSequelizeDb.define(
  'locations',
  definition,
  {
    timestamps: false,
    indexes: [
      { fields: ['recorded_at'] },
      { fields: ['device_id'] },
      { fields: ['company_id', 'device_id', 'recorded_at'] },
    ],
  }
);

export default LocationModel;
