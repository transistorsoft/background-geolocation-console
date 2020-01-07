import crypto from 'crypto';
import { Router } from 'express';

import { decrypt, isEncryptedRequest } from '../libs/RNCrypto';
import { sign } from '../libs/jwt';
import {
  AccessDeniedError,
  checkAuth,
  isDDosCompany,
  isProduction,
  RegistrationRequiredError,
  return1Gbfile,
} from '../libs/utils';
import {
  deleteDevice,
  findOrCreate,
  getDevice,
  getDevices,
} from '../models/Device';
import {
  createLocation,
  deleteLocations,
  getLatestLocation,
  getLocations,
  getStats,
} from '../models/Location';
import { getOrgs } from '../models/Org';

const router = new Router();

// curl -v -X POST http://localhost:9000/v2/register \
//  -d '{"company_token":"test","device_id":"test"}' \
//  -H 'Content-Type: application/json'
router.post('/register', async (req, res) => {
  const {
    org, uuid, model, manufacturer, version, framework,
  } = req.body;

  // eslint-disable-next-line no-console
  console.info(
    'POST /register '.green,
    'org'.green,
    org,
    'uuid'.green,
    uuid,
    'model'.green,
    model,
    manufacturer,
    'version'.green,
    version,
    'framework'.green,
    framework,
  );

  if (!org) {
    return res.status(500).send({ message: 'Organization identifier empty' });
  }

  if (!uuid || !model || !manufacturer || !version) {
    return res.status(500).send({ message: 'Device info is missing' });
  }

  try {
    const device = await findOrCreate(org, {
      uuid,
      model,
      framework,
      version,
    });

    const jwtInfo = {
      org,
      deviceId: device.id,
      model,
    };

    const accessToken = sign(jwtInfo);
    const refreshToken = crypto
      .createHash('md5')
      .update(accessToken)
      .digest('hex');

    return res.send({
      accessToken,
      refreshToken,
      expires: -1,
    });
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      return res.status(403).send({ error: err.message });
    }
    // eslint-disable-next-line no-console
    console.error('/register', err);
    return res.status(500).send(!isProduction ? err : err.message);
  }
});

router.all('/refresh_token', checkAuth, async (req, res) => {
  const {
    org, deviceId, model,
  } = req.jwt;
  const jwtInfo = {
    org,
    deviceId,
    model,
  };
  // eslint-disable-next-line no-console
  console.info(
    'auth:refresh'.green,
    'org:name'.green,
    org,
    'device:id'.green,
    deviceId,
  );
  try {
    const accessToken = sign(jwtInfo);
    const refreshToken = crypto
      .createHash('md5')
      .update(accessToken)
      .digest('hex');

    return res.send({
      accessToken,
      refreshToken,
      expires: -1,
    });
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      return res.status(403).send({ error: err.message });
    }
    // eslint-disable-next-line no-console
    console.error('/register', req.body, err);
    return res.status(500).send(!isProduction ? err : err.message);
  }
});

// curl -v http://localhost:9000/v2/company_tokens \
//   -H 'Authorization: Bearer ey...Pg'
//
router.get('/company_tokens', checkAuth, async (req, res) => {
  const { org } = req.jwt;
  try {
    const orgTokens = await getOrgs({ company_token: org });
    res.send(orgTokens);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('/company_tokens', err);
    res.status(500).send({ error: err.message });
  }
});

router.get('/devices', checkAuth, async (req, res) => {
  try {
    const { deviceId } = req.jwt;
    const device = await getDevice({ id: deviceId });
    const devices = await getDevices({ company_id: device.company_id });
    res.send(devices || []);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('/devices', err);
    res.status(500).send({ error: err.message });
  }
});

router.delete('/devices/:id', checkAuth, async (req, res) => {
  const { deviceId } = req.jwt;

  // eslint-disable-next-line no-console
  console.info(
    'devices:delete'.green,
    'device:id'.green,
    deviceId,
    JSON.stringify(req.query),
  );

  const {
    id, end_date: endDate, start_date: startDate,
  } = req.params;
  try {
    await deleteDevice({
      id: deviceId,
      end_date: endDate,
      start_date: startDate,
    });
    res.send({ success: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`/devices/${id}`, deviceId, req.query, err);
    res.status(500).send({ error: err.message });
  }
});

router.get('/stats', checkAuth, async (req, res) => {
  try {
    const stats = await getStats();
    res.send(stats);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('/stats', err);
    res.status(500).send({ error: err.message });
  }
});

router.get('/locations/latest', checkAuth, async (req, res) => {
  const { deviceId, org } = req.jwt;
  const device = await getDevice({ id: deviceId });
  // eslint-disable-next-line no-console
  console.info(
    'locations:latest'.green,
    'org:name'.green,
    org,
    'device:id'.green,
    deviceId,
    JSON.stringify(req.query),
  );
  try {
    const latest = await getLatestLocation({
      device_id: deviceId,
      company_id: device.company_id,
    });
    res.send(latest);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('/locations/latest', req.query, err);
    res.status(500).send({ error: err.message });
  }
});

/**
 * GET /locations
 */
router.get('/locations', checkAuth, async (req, res) => {
  const { deviceId, org } = req.jwt;
  // eslint-disable-next-line no-console
  console.info(
    'locations:get'.green,
    'org:name'.green,
    org,
    'device:id'.green,
    deviceId,
    JSON.stringify(req.query),
  );
  const device = await getDevice({ id: deviceId });
  const { end_date: endDate, start_date: startDate } = req.params;
  try {
    const locations = await getLocations({
      start_date: startDate,
      end_date: endDate,
      company_id: device.company_id,
    });
    res.send(locations);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('/locations', req.query, err);
    res.status(500).send({ error: err.message });
  }
});

/**
 * POST /locations
 */
router.post('/locations', checkAuth, async (req, res) => {
  const { deviceId, org } = req.jwt;
  // eslint-disable-next-line no-console
  console.info(
    'locations:post'.green,
    'org:name'.green,
    org,
    'device:id'.green,
    deviceId,
  );
  const { body } = req;
  const device = await getDevice({ id: deviceId });
  const data = isEncryptedRequest(req) ? decrypt(body.toString()) : body;

  // Can happen if Device is deleted from Dashboard but a JWT is still posting locations for it.
  if (device == null) {
    // eslint-disable-next-line no-console
    console.error(
      'Device ID %s not found.  Was it deleted from dashboard?'.red,
      deviceId,
    );
    return res.status(410).send({
      error: 'DEVICE_ID_NOT_FOUND',
      background_geolocation: ['stop'],
    });
  }

  const array = Array.isArray(data) ? data : data ? [data] : [];
  const locations = array.map(x => ({
    ...x,
    company_id: device.company_id,
    device_id: deviceId,
    company_token: device.company_token,
  }));

  if (isDDosCompany(device.company_token)) {
    return return1Gbfile(res);
  }

  try {
    await createLocation(locations, device);
    return res.send({ success: true });
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      return res.status(403).send({ error: err.toString() });
    }
    if (err instanceof RegistrationRequiredError) {
      return res.status(406).send({ error: err.toString() });
    }
    // eslint-disable-next-line no-console
    console.error('POST /locations', body, err);
    return res.status(500).send({ error: err.message });
  }
});

/**
 * POST /locations
 */
router.post('/locations/:company_token', checkAuth, async (req, res) => {
  const { deviceId, org } = req.jwt;

  // eslint-disable-next-line no-console
  console.info(
    'locations:post'.green,
    'org:name'.green,
    org,
    'device:id'.green,
    deviceId,
  );

  const device = await getDevice({ id: deviceId });
  if (isDDosCompany(device.company_token)) {
    return return1Gbfile(res);
  }

  const data = isEncryptedRequest(req)
    ? decrypt(req.body.toString())
    : req.body;
  data.company_token = device.company_token;

  try {
    await createLocation(
      {
        ...data,
        company_id: device.company_id,
        company_token: device.company_token,
      },
      device,
    );
    return res.send({ success: true });
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      return res.status(403).send({ error: err.toString() });
    }
    // eslint-disable-next-line no-console
    console.error(`POST /locations${device.company_token}`, err);
    return res.status(500).send({ error: err.message });
  }
});

router.delete('/locations', checkAuth, async (req, res) => {
  try {
    const { deviceId, org } = req.jwt;

    // eslint-disable-next-line no-console
    console.info(
      'locations:delete'.green,
      'org:name'.green,
      org,
      'device:id'.green,
      deviceId,
      JSON.stringify(req.query),
    );

    const device = await getDevice({ id: deviceId });
    const { start_date: startDate, end_date: endDate } = req.query;

    await deleteLocations({
      companyId: device.company_id,
      deviceId,
      end_date: endDate,
      start_date: startDate,
    });
    res.send({ success: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.info('DELETE /locations', req.query, err);
    res.status(500).send({ error: err.message });
  }
});

export default router;
