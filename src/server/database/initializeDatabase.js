import {
  isPostgres,
  isProduction,
} from '../config.js';

import definedSequelizeDb from './define-sequelize-db.js';
import Location from './LocationModel.js';
import Device from './DeviceModel.js';
import Company from './CompanyModel.js';

const syncOptions = { logging: true };

/**
 * Init / create location table
 */
export default async function initializeDatabase() {
  if (!definedSequelizeDb) {
    // eslint-disable-next-line no-console
    console.warn('definedSequelizeDb undefined');
    return;
  }

  Device.associate({
    Location, Device, Company,
  });
  Company.associate({
    Location, Device, Company,
  });
  Location.associate({
    Location, Device, Company,
  });

  try {
    await definedSequelizeDb.authenticate();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Unable to connect to the database:', err);
  }

  if (isProduction && isPostgres) {
    return;
  }
  try {
    await Company.sync(syncOptions);
    await Device.sync(syncOptions);
    await Location.sync(syncOptions);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Unable to sync database:', err);
  }
}
