import Sequelize from 'sequelize';
import Promise from 'bluebird';
import definedSequelizeDb from './define-sequelize-db';
import LocationModel from './LocationModel';

const DeviceModel = definedSequelizeDb.define(
  'devices',
  {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    company_id: { type: Sequelize.INTEGER },
    // , references: { model: 'companies' }
    company_token: { type: Sequelize.TEXT },
    device_id: { type: Sequelize.TEXT },
    device_model: { type: Sequelize.TEXT },
    created_at: { type: Sequelize.DATE },
  },
  {
    timestamps: false,
    indexes: [
      { fields: ['device_id'] },
      { fields: ['company_id'] },
      { fields: ['company_token'] },
    ],
    hooks: {
      async afterSync (name, callback) {
        const count = await DeviceModel.count();
        if (count) {
          return callback && callback();
        }
        const locationsCount = await LocationModel.count();
        const step = 50000;
        for (let i = 0; i < locationsCount; i += step) {
          const devices = await LocationModel.findAll({
            attributes: [
              'company_id',
              'device_id',
              'device_model',
              'company_token',
            ],
            where: { device_ref_id: null },
            group: [
              'company_id',
              'device_id',
              'device_model',
              'company_token',
            ],
            order: [['company_id'], ['device_id']],
            limit: step,
            offset: step * i,
            skipLocked: true,
            raw: true,
          });
          const result = await DeviceModel.bulkCreate(devices, { returning: true, raw: true });
          const queries = result.map(x => LocationModel.update(
            {
              device_ref_id: x.id,
            },
            {
              where: {
                company_id: x.company_id,
                device_id: x.device_id,
              },
              raw: true,
            },
          ));
          await Promise.reduce(queries, (p, q) => q, 0);
        }
        callback && callback();
      },
    },
  }
);

export default DeviceModel;
