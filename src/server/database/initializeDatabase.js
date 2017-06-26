import definedSequelizeDb from './define-sequelize-db';
import LocationModel from './LocationModel';
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
    await LocationModel.sync();
  } catch (err) {
    console.log('Unable to sync database:', err);
  }
}
