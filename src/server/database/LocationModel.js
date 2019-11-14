import Sequelize from 'sequelize';
import definedSequelizeDb from './define-sequelize-db';

const LocationModel = definedSequelizeDb.define(
  'locations',
  {
    id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
    company_token: { type: Sequelize.TEXT },
    uuid: { type: Sequelize.TEXT },
    device_id: { type: Sequelize.TEXT },
    device_model: { type: Sequelize.TEXT },
    latitude: { type: Sequelize.DOUBLE },
    longitude: { type: Sequelize.DOUBLE },
    accuracy: { type: Sequelize.INTEGER },
    altitude: { type: Sequelize.REAL },
    speed: { type: Sequelize.REAL },
    heading: { type: Sequelize.REAL },
    odometer: { type: Sequelize.REAL },
    event: { type: Sequelize.TEXT },
    activity_type: { type: Sequelize.TEXT },
    activity_confidence: { type: Sequelize.INTEGER },
    battery_level: { type: Sequelize.REAL },
    battery_is_charging: { type: Sequelize.BOOLEAN },
    is_moving: { type: Sequelize.BOOLEAN },
    geofence: { type: Sequelize.TEXT },
    provider: { type: Sequelize.TEXT },
    extras: { type: Sequelize.TEXT },
    recorded_at: { type: Sequelize.DATE },
    created_at: { type: Sequelize.DATE },
    company_id: { type: Sequelize.INTEGER },
    // , references: { model: 'companies' }
    device_ref_id: { type: Sequelize.INTEGER },
    // , references: { model: 'devices' }
  },
  {
    timestamps: false,
    indexes: [
      { fields: ['recorded_at'] },
      { fields: ['company_token'] },
      { fields: ['device_id'] },
      { fields: ['company_id', 'device_id'] },
      { fields: ['company_id', 'device_ref_id', 'recorded_at'] },
    ],
  }
);

export default LocationModel;
