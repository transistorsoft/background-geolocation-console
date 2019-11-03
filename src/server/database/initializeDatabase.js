import definedSequelizeDb from './define-sequelize-db';
import LocationModel from './LocationModel';
import DeviceModel from './DeviceModel';
import CompanyModel from './CompanyModel';

const isProduction = process.env.NODE_ENV !== 'production';
const syncOptions = {
  logging: !isProduction,
  hooks: true,
  force: false,
  alter: true,
};

/**
 * Init / create location table
 */
export default async function initializeDatabase () {
  try {
    await definedSequelizeDb.authenticate();
  } catch (err) {
    console.log('Unable to connect to the database:', err);
  }
  try {
    await LocationModel.sync(syncOptions);
    await CompanyModel.sync(syncOptions);
    await DeviceModel.sync(syncOptions);
  } catch (err) {
    console.log('Unable to sync database:', err);
  }
}
