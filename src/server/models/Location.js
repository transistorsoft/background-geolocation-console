import LocationModel from '../database/LocationModel';
import { literal } from 'sequelize';

const filterByCompany = !!process.env.SHARED_DASHBOARD;

function hydrate (record) {
  if (record.geofence) {
    record.geofence = JSON.parse(record.geofence);
  }
  if (record.provider) {
    record.provider = JSON.parse(record.provider);
  }
  if (record.extras) {
    record.extras = JSON.parse(record.extras);
  }
  return record;
}

export async function getStats () {
  const minDate = await LocationModel.min('created_at');
  const maxDate = await LocationModel.max('created_at');
  const total = await LocationModel.count();
  return {
    minDate,
    maxDate,
    total,
  };
}

export async function getLocations (params) {
  var whereConditions = {};
  if (params.start_date && params.end_date) {
    whereConditions.recorded_at = { $between: [new Date(params.start_date), new Date(params.end_date)] };
  }
  whereConditions.device_id = params.device_id || '';
  if (filterByCompany) {
    whereConditions.company_token = params.company_token;
  }

  const rows = await LocationModel.findAll({
    where: whereConditions,
    order: literal('recorded_at DESC'),
  });
  const locations = rows.map(hydrate);
  return locations;
}

export async function getLatestLocation (params) {
  var whereConditions = {
    device_id: params.device_id,
  };
  if (filterByCompany) {
    whereConditions.company_token = params.company_token;
  }
  const row = await LocationModel.findOne({
    where: whereConditions,
    order: literal('recorded_at DESC'),
  });
  const result = row ? hydrate(row) : null;
  return result;
}
export async function createLocation (params) {
  if (Array.isArray(params)) {
    for (let location of params) {
      await createLocation(location);
    }
    return;
  }
  const location = params.location;
  const device = params.device || { model: 'UNKNOWN' };

  // Considering we're always working with locations array
  const locations = location.length ? location : [location];

  for (let location of locations) {
    const coords = location.coords;
    const battery = location.battery || { level: null, is_charging: null };
    const activity = location.activity || { type: null, confidence: null };
    const geofence = location.geofence ? JSON.stringify(location.geofence) : null;
    const provider = location.provider ? JSON.stringify(location.provider) : null;
    const extras = location.extras ? JSON.stringify(location.extras) : null;
    const now = new Date();
    const uuid = device.framework ? device.framework + '-' + device.uuid : device.uuid;
    const model = device.framework ? device.model + ' (' + device.framework + ')' : device.model;

    await LocationModel.create({
      uuid: location.uuid,
      company_token: params.company_token || null,
      device_id: uuid,
      device_model: model,
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy,
      altitude: coords.altitude,
      speed: coords.speed,
      heading: coords.heading,
      odometer: location.odometer,
      event: location.event,
      activity_type: activity.type,
      activity_confidence: activity.confidence,
      battery_level: battery.level,
      battery_is_charging: battery.is_charging,
      is_moving: location.is_moving,
      geofence: geofence,
      provider: provider,
      extras: extras,
      recorded_at: location.timestamp,
      created_at: now,
    });
  }
}

export async function deleteLocations (params) {
  var whereConditions = {};
  if (params && params.deviceId) {
    whereConditions.device_id = params.deviceId;
  }
  if (params && params.start_date && params.end_date) {
    whereConditions.recorded_at = { $between: [params.start_date, params.end_date] };
  }
  if (filterByCompany) {
    whereConditions.company_token = params.company_token;
  }

  if (!Object.keys(whereConditions).length) {
    throw new Error('Missing some location deletion constraints');
  }

  await LocationModel.destroy({ where: whereConditions });
}
