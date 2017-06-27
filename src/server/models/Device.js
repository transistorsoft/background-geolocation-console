import LocationModel from '../database/LocationModel';

export async function getDevices (conditions) {
  const result = await LocationModel.findAll({
    attributes: ['device_id', 'device_model'],
    group: ['device_id', 'device_model'],
    order: 'max(recorded_at) DESC',
  });
  return result;
}
