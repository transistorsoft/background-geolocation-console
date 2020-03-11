import crypto from 'crypto';
import { Router } from 'express';

import { decrypt, isEncryptedRequest } from '../libs/RNCrypto';
import {
  createUser, serviceApp, verify,
} from '../firebase';
import {
  AccessDeniedError,
  checkAuth,
  isAdmin,
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
  create,
  deleteLocations,
  getLatestLocation,
  getLocations,
  getStats,
} from '../firebase/Location';

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
    const company = await findOrCreate(org, {
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
      companyId: company.id,
    };

    await createUser(org);
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

router.get('/company_tokens', checkAuth(verify), async (req, res) => {
  const { org } = req.jwt;
  try {
    const orgTokens = await getOrgs({ org }, isAdmin(req.jwt));
    res.send(orgTokens);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('v3', '/company_tokens', err);
    res.status(500).send({ error: err.message });
  }
});

router.get('/devices', checkAuth(verify), async (req, res) => {
  const { org, admin } = req.jwt;
  const { company_id: orgId } = req.query;
  try {
    const devices = await getDevices({ org: !admin ? org : orgId });
    res.send(devices || []);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('v3', '/devices', err);
    res.status(500).send({ error: err.message });
  }
});

router.delete('/devices/:id', checkAuth(verify), async (req, res) => {
  const { org, admin } = req.jwt;
  const { company_id: orgId } = req.query;
  const { id: deviceId } = req.params;

  // eslint-disable-next-line no-console
  console.info(
    'devices:delete'.green,
    'device:id'.green,
    deviceId,
    JSON.stringify(req.query),
  );

  const { end_date: endDate, start_date: startDate } = req.params;
  try {
    await deleteDevice({
      end_date: endDate,
      device_id: deviceId,
      org: admin ? orgId : admin,
      start_date: startDate,
    });
    res.send({ success: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('v3', `/devices/${deviceId}`, org, req.query, err);
    res.status(500).send({ error: err.message });
  }
});

router.get('/stats', checkAuth(verify), async (req, res) => {
  try {
    const stats = await getStats();
    res.send(stats);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('v3', '/stats', err);
    res.status(500).send({ error: err.message });
  }
});

router.get('/locations/latest', checkAuth(verify), async (req, res) => {
  const { org, admin } = req.jwt;
  const {
    company_id: orgId,
    device_id: deviceId,
  } = req.query;
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
      deviceId,
      org: admin ? orgId : org,
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
router.get('/locations', checkAuth(verify), async (req, res) => {
  const { org, admin } = req.jwt;
  const {
    company_id: orgId,
    device_id: deviceId,
  } = req.query;
  // eslint-disable-next-line no-console
  console.info(
    'locations:get'.green,
    'org:name'.green,
    admin ? orgId : org,
    'device:id'.green,
    deviceId,
    JSON.stringify(req.query),
  );
  const { end_date: endDate, start_date: startDate } = req.params;
  try {
    const locations = await getLocations({
      device_id: deviceId,
      end_date: endDate,
      org: admin ? orgId : org,
      start_date: startDate,
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
router.post('/locations', checkAuth(verify), async (req, res) => {
  const { org, uuid } = req.jwt;
  const { body } = req;
  const data = isEncryptedRequest(req)
    ? decrypt(body.toString())
    : body;
  // eslint-disable-next-line no-console
  console.info(
    'v3',
    'locations:post'.green,
    'org:name'.green,
    org,
    'device:id'.green,
    uuid,
  );
  const device = await getDevice({ device_id: uuid, org });

  // Can happen if Device is deleted from Dashboard but a JWT is still posting locations for it.
  if (!device) {
    // eslint-disable-next-line no-console
    console.error(
      'v3',
      'Device ID %s not found.  Was it deleted from dashboard?'.red,
      device.device_id,
    );
    return res.status(410).send({
      error: 'DEVICE_ID_NOT_FOUND',
      background_geolocation: ['stop'],
    });
  }

  if (isDDosCompany(org)) {
    return return1Gbfile(res);
  }

  try {
    await create(data);
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
router.post('/locations/:company_token', checkAuth(verify), async (req, res) => {
  const { org } = req.jwt;
  const { company_id: orgId } = req.params;

  // eslint-disable-next-line no-console
  console.info(
    'v3',
    'locations:post'.green,
    'org:name'.green,
    org,
    'device:id'.green,
  );

  if (isDDosCompany(org) || isDDosCompany(orgId)) {
    return return1Gbfile(res);
  }

  const data = isEncryptedRequest(req)
    ? decrypt(req.body.toString())
    : req.body;

  try {
    await create(data);
    return res.send({ success: true });
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      return res.status(403).send({ error: err.toString() });
    }
    // eslint-disable-next-line no-console
    console.error('v3', `POST /locations/${org}`, err);
    return res.status(500).send({ error: err.message });
  }
});

router.delete('/locations', checkAuth(verify), async (req, res) => {
  try {
    const { org, admin } = req.jwt;
    const { device_id: deviceId, company_id: orgId } = req.query;

    // eslint-disable-next-line no-console
    console.info(
      'locations:delete'.green,
      'org:name'.green,
      admin ? orgId : org,
      'device:id'.green,
      deviceId,
      JSON.stringify(req.query),
    );

    const { start_date: startDate, end_date: endDate } = req.query;

    await deleteLocations({
      org: admin ? orgId : org,
      device_id: deviceId,
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
      await createUser(login);
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
  const { org } = req.body || {};

  try {
    await createUser(org);

    const jwtInfo = { org, admin: false };
    const accessToken = await serviceApp.auth().createCustomToken(org, jwtInfo);
    return res.send({
      access_token: accessToken,
      token_type: 'Bearer',
      org,
    });
  } catch (e) {
    console.error('v3', '/jwt', e);
  }

  return res.status(401).send({ org, error: 'Await not public account and right password' });
});

export default router;
