import crypto from 'crypto';
import { Router } from 'express';
import 'colors';

import { decrypt, isEncryptedRequest } from '../libs/RNCrypto.js';
import {
  createUser,
  serviceApp,
  verify,
} from '../firebase/index.js';
import {
  adminToken,
  withAuth,
} from '../config.js';
import {
  AccessDeniedError,
  checkAuth,
  dataLogOn,
  isAdmin,
  isAdminToken,
  isDDosCompany,
  isPassword,
  RegistrationRequiredError,
  return1Gbfile,
} from '../libs/utils.js';
import { isProduction } from '../config.js';
import {
  deleteDevice,
  findOrCreate,
  getDevices,
  getDevice,
} from '../firebase/Device.js';
import {
  create,
  deleteLocations,
  getLatestLocation,
  getLocations,
  getStats,
} from '../firebase/Location.js';

import { getOrgs } from '../firebase/Org.js';

const router = new Router();

router.post('/register', async (req, res) => {
  const {
    framework,
    manufacturer,
    model,
    device_id: devId,
    device_model: deviceModel,
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

  // eslint-disable-next-line no-console
  dataLogOn && console.log(`v3:post:register:${org}`.yellow, JSON.stringify(req.body));

  if (!org) {
    return res.status(500).send({ message: 'Organization identifier empty' });
  }

  if (!uuid || !model || !manufacturer || !version) {
    return res.status(500).send({ message: 'Device info is missing' });
  }

  try {
    // eslint-disable-next-line no-unused-vars
    const device = await findOrCreate(
      org,
      {
        framework,
        model: deviceModel || model,
        uuid: uuid || devId,
        version,
      },
    );

    const jwtInfo = {
      deviceId: uuid,
      model,
      org,
      uuid,
      companyId: org,
    };

    await createUser({ org });
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
    const devices = await getDevices({ org: !admin ? org : orgId }, admin);
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
    company_id: orgId = org,
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
    device_id: deviceId = 'UNKNOWN',
  } = req.query;
  const name = admin ? orgId : org;
  // eslint-disable-next-line no-console
  console.info(
    'locations:get'.green,
    'org:name'.green,
    name,
    'device:id'.green,
    deviceId,
    JSON.stringify(req.query),
  );
  const { end_date: endDate, start_date: startDate } = req.params;
  try {
    const locations = await getLocations({
      device_id: deviceId,
      end_date: endDate,
      org: name,
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
  const device = await getDevice({ device_id: uuid, org });
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
  // eslint-disable-next-line no-console
  dataLogOn && console.log('v3:post:locations'.yellow, org, JSON.stringify(data));

  // Can happen if Device is deleted from Dashboard but a JWT is still posting locations for it.
  if (!device) {
    console.error('Device ID %s not found.  Was it deleted from dashboard?'.red, `Orgs\\${org}\\Devices\\${uuid}`);
    return res.status(410)
      .send({ error: 'DEVICE_ID_NOT_FOUND', background_geolocation: ['stop'] });
  }

  if (isDDosCompany(org)) {
    return return1Gbfile(res);
  }

  try {
    await create(data, org, device);
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
  const { org, uuid } = req.jwt;
  const { company_token: orgId } = req.params;
  const device = await getDevice({ device_id: uuid, org: orgId || org });

  // eslint-disable-next-line no-console
  console.info(
    'v3',
    'locations:post'.green,
    'org:name'.green,
    org || orgId,
    'device:id'.green,
    uuid,
  );
  if ((org && isDDosCompany(org)) || (orgId && isDDosCompany(orgId))) {
    return return1Gbfile(res);
  }

  const data = isEncryptedRequest(req)
    ? decrypt(req.body.toString())
    : req.body;

  // eslint-disable-next-line no-console
  dataLogOn && console.log(`v3:post:locations:${org}`.yellow, JSON.stringify(data));

  try {
    await create(data, orgId || org, device);
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
      await createUser({ org: login });
      const jwtInfo = { org: login, admin: true };
      const accessToken = await serviceApp.auth().createCustomToken(login, jwtInfo);
      return res.send({
        access_token: accessToken,
        token_type: 'Bearer',
        org: login,
      });
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('v3', '/auth', e);
  }

  return res.status(401).send({ org: login, error: 'Await not public account and right password' });
});

router.post('/jwt', async (req, res) => {
  const { org: inOrg } = req.body || {};
  const org = withAuth ? inOrg : adminToken;

  try {
    await createUser({ org });

    const jwtInfo = {
      admin: isAdmin(),
      companyId: org,
      org,
    };
    const accessToken = await serviceApp.auth().createCustomToken(org, jwtInfo);
    return res.send({
      access_token: accessToken,
      token_type: 'Bearer',
      org,
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('v3', '/jwt', e);
  }

  return res.status(401).send({ org, error: 'Await not public account' });
});

export default router;
