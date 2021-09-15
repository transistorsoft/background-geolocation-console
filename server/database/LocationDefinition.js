import Sequelize from 'sequelize';

export default {
  id: {
    type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true,
  },
  uuid: { type: Sequelize.TEXT },
  latitude: { type: Sequelize.DOUBLE },
  longitude: { type: Sequelize.DOUBLE },
  data: { type: Sequelize.TEXT },
  recorded_at: { type: Sequelize.DATE },
  created_at: { type: Sequelize.DATE },
  company_id: { type: Sequelize.INTEGER },
  device_id: { type: Sequelize.INTEGER },
};
