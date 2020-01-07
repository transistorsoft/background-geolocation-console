export const server = 'http://localhost:9000';

export const regData = {
  org: 'test',
  uuid: 'uuid',
  model: 'model',
  framework: 'framework',
  manufacturer: 'manufacturer',
  version: '10',
};

export const location = {
  is_moving: false,
  uuid: '8a21f59c-c7d8-43ed-ac6d-8b23cea7c7d7',
  timestamp: '2019-11-17T19:14:25.776Z',
  odometer: 4616.5,
  coords: {
    latitude: 45.519264,
    longitude: -73.616931,
    accuracy: 15.2,
    speed: -1,
    heading: -1,
    altitude: 41.8,
  },
  activity: {
    type: 'still',
    confidence: 100,
  },
  battery: {
    is_charging: true,
    level: 0.92,
  },
  extras: { setCurrentPosition: true },
};
