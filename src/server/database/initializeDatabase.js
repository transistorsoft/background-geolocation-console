import definedSequelizeDb from './define-sequelize-db';
import Location from './LocationModel';
import Device from './DeviceModel';
import Company from './CompanyModel';

const isProduction = process.env.NODE_ENV === 'production';
const syncOptions = { logging: true };

/**
 * Init / create location table
 */
export default async function initializeDatabase() {
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

  if (isProduction && process.env.DATABASE_URL) {
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
