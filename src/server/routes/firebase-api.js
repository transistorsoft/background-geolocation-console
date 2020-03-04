import crypto from 'crypto';
import { Router } from 'express';

import { decrypt, isEncryptedRequest } from '../libs/RNCrypto';
import {
  AccessDeniedError,
  checkAuth,
  isAdminToken,
  isDDosCompany,
  isPassword,
  isProduction,
  RegistrationRequiredError,
  return1Gbfile,
} from '../libs/utils';
import {
  deleteDevice,
  findOrCreate,
  getDevice,
  getDevices,
} from '../firebase/Device';
import {
  createLocation,
  deleteLocations,
  getLatestLocation,
  getLocations,
  getStats,
} from '../firebase/Location';
import { serviceApp, verify } from '../firebase';
import { getOrgs } from '../firebase/Org';

const router = new Router();

router.post('/register', async (req, res) => {
  const {
    framework,
    manufacturer,
    model,
    org,
    uuid,
    version,
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
    await findOrCreate(org, {
      framework,
      model,
      uuid,
      version,
    });

    const jwtInfo = {
      deviceId: uuid,
      model,
      org,
      uuid,
    };

    try {
      await serviceApp.auth()
        .createUser({
          disabled: false,
          email: `${org}@bgc.com`,
          uid: org,
        });
    } catch (e) {
      if (e.code !== 'auth/uid-already-exists') {
        // eslint-disable-next-line no-console
        console.error('v3', 'createUser:error', e);
      }
    }
    const accessToken = await serviceApp.auth().createCustomToken(org, jwtInfo);
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
    console.error('v3', '/register', err);
    return res.status(500).send(!isProduction ? err : err.message);
  }
});

router.all('/refresh_token', checkAuth(verify), async (req, res) => {
  const {
    deviceId,
    model,
    org,
    uuid,
  } = req.jwt;
  const jwtInfo = {
    deviceId,
    model,
    org,
    uuid,
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
    const accessToken = await serviceApp.auth().createCustomToken(org, jwtInfo);
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
    console.error('v3', '/register', req.body, err);
    return res.status(500).send(!isProduction ? err : err.message);
  }
});

// curl -v http://localhost:9000/v2/company_tokens \
//   -H 'Authorization: Bearer ey...Pg'
//
router.get('/company_tokens', checkAuth, async (req, res) => {
  const { org } = req.jwt;
  try {
    const orgTokens = await getOrgs({ org });
    res.send(orgTokens);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('v3', '/company_tokens', err);
    res.status(500).send({ error: err.message });
  }
});

router.get('/devices', checkAuth, async (req, res) => {
  try {
    const { org } = req.jwt;
    // const device = await getDevice({ id: uuid, org });
    const devices = await getDevices({ org });
    res.send(devices || []);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('v3', '/devices', err);
    res.status(500).send({ error: err.message });
  }
});

router.delete('/devices/:id', checkAuth, async (req, res) => {
  const { uuid } = req.jwt;

  // eslint-disable-next-line no-console
  console.info(
    'devices:delete'.green,
    'device:id'.green,
    uuid,
    JSON.stringify(req.query),
  );

  const {
    id, end_date: endDate, start_date: startDate,
  } = req.params;
  try {
    await deleteDevice({
      id: uuid,
      end_date: endDate,
      start_date: startDate,
    });
    res.send({ success: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('v3', `/devices/${id}`, uuid, req.query, err);
    res.status(500).send({ error: err.message });
  }
});

router.get('/stats', checkAuth, async (req, res) => {
  try {
    const stats = await getStats();
    res.send(stats);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('v3', '/stats', err);
    res.status(500).send({ error: err.message });
  }
});

router.get('/locations/latest', checkAuth, async (req, res) => {
  const { deviceId, org } = req.jwt;
  const device = await getDevice({ id: deviceId, org });
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
    return res.send(latest);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('v3', '/locations/latest', req.query, err);
    return res.status(500).send({ error: err.message });
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
  const device = await getDevice({ id: deviceId, org });
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
    console.error('v3', '/locations', req.query, err);
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
    'v3',
    'locations:post'.green,
    'org:name'.green,
    org,
    'device:id'.green,
    deviceId,
  );
  const { body } = req;
  const device = await getDevice({ id: deviceId, org });
  const data = isEncryptedRequest(req) ? decrypt(body.toString()) : body;

  // Can happen if Device is deleted from Dashboard but a JWT is still posting locations for it.
  if (device == null) {
    // eslint-disable-next-line no-console
    console.error(
      'v3',
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
    console.error('v3', 'POST /locations', body, err);
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
    'v3',
    'locations:post'.green,
    'org:name'.green,
    org,
    'device:id'.green,
    deviceId,
  );

  const device = await getDevice({ id: deviceId, org });
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
    console.error('v3', `POST /locations${device.company_token}`, err);
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

    const device = await getDevice({ id: deviceId, org });
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
    console.info('v3', 'DELETE /locations', req.query, err);
    res.status(500).send({ error: err.message });
  }
});

router.post('/auth', async (req, res) => {
  const { login, password } = req.body || {};

  try {
    if (isAdminToken(login) && isPassword(password)) {
      const jwtInfo = { org: login, admin: true };

      const accessToken = await serviceApp.auth().createCustomToken(login, jwtInfo);
      return res.send({
        access_token: accessToken,
        token_type: 'Bearer',
        org: login,
      });
    }
  } catch (e) {
    console.error('v3', '/auth', e);
  }

  return res.status(401).send({ org: login, error: 'Await not public account and right password' });
});

router.post('/jwt', async (req, res) => {
  const {
    login,
    org,
    password,
  } = req.body || {};

  try {
    const token = org || login;
    const admin = isAdminToken(token) && isPassword(password);
    const jwtInfo = { org: token, admin };

    const accessToken = serviceApp.auth().createCustomToken(jwtInfo);
    return res.send({
      access_token: accessToken,
      token_type: 'Bearer',
      org: login,
    });
  } catch (e) {
    console.error('v3', '/jwt', e);
  }

  return res.status(401).send({ org: login, error: 'Await not public account and right password' });
});

export default router;
