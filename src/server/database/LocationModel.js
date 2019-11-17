import Sequelize from 'sequelize';

import definition from './LocationDefinition';
import definedSequelizeDb from './define-sequelize-db';

import {
  isPostgres,
} from '../libs/utils';

if (isPostgres) {
  definition.data = {
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
