import * as Location from './models/Location';
import * as Org from './models/Org';
import * as Device from './models/Device';
async function main() {
  const locationDefaults = {
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

  // create
  for (let o = 0; o < 5; o++) {
    const orgName = o !== 4 ? 'o' + o : 'transistor-test';
    const deviceId = 'd1';
    const company = await Org.findOrCreate({ org: orgName });
    const device = await Device.findOrCreate(orgName, { device_id: deviceId });
    for (let k = 0; k < 10500; k++) {
      const time = new Date().getTime() - Math.random() * 90 * 1000 * 86400;
      const location = { ...locationDefaults, timestamp: new Date(time).toISOString() };
      await Location.createLocation(location, device, company);
    }
  }

  // cap
  for (let o = 0; o < 5; o++) {
    const orgName = o !== 4 ? 'o' + o : 'transistor-test';
    const deviceId = 'd1';
    const company = await Org.findOrCreate({ org: orgName });
    const device = await Device.findOrCreate(orgName, { device_id: deviceId });
    const statsBefore = await Location.getStats(orgName);
    await Location.removeOld({ org: orgName });
    const statsAfter = await Location.getStats(orgName);
    console.info(orgName, {statsBefore, statsAfter});
  }

}
main();
