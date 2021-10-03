exports.server = `http://localhost:${process.env.PORT || 9000}`;

exports.regData = {
  framework: 'flutter',
  manufacturer: 'Apple',
  model: 'iPhone10,4(x86_64)',
  org: 'test',
  platform: '13.3',
  uuid: 'iPhone10-4(x86_64)-13-3',
  version: '2.0',
};

exports.location = {
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

exports.location2 = {
  is_moving: false,
  uuid: '03f4aa4c-ed00-4390-9e82-49f0c5799940',
  timestamp: '2020-03-12T19:26:12.020Z',
  timestampMeta: {
    time: 1584041172020,
    systemTime: 1584041176933,
    systemClockElaspsedRealtime: 584834172,
    elapsedRealtime: 584829260,
  },
  odometer: 6454829,
  coords: {
    latitude: 45.5192402,
    longitude: -73.6169874,
    accuracy: 15.9,
    speed: -1,
    heading: -1,
    altitude: 43.8,
  },
  activity: {
    type: 'still',
    confidence: 100,
  },
  battery: {
    is_charging: true,
    level: 0.98,
  },
  extras: { getCurrentPosition: true },
};
