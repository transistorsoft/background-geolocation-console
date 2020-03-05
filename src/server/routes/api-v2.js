import crypto from 'crypto';
import { Router } from 'express';

import { decrypt, isEncryptedRequest } from '../libs/RNCrypto';
import { sign, verify } from '../libs/jwt';
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
  create,
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
    const {
      company_id: companyId,
      id: deviceId,
    } = await findOrCreate(org, {
      framework,
      model,
      uuid,
      version,
    });

    const jwtInfo = {
      companyId,
      deviceId,
      model,
      org,
      uuid,
    };

    const accessToken = sign(jwtInfo);
    const refreshToken = crypto
      .createHash('md5')
      .update(accessToken)
      .digest('hex');

    return res.send({
      accessToken,
      expires: -1,
      refreshToken,
    });
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      return res.status(403).send({ error: err.message });
    }
    // eslint-disable-next-line no-console
    console.error('v2', '/register', err);
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
  let { companyId } = req.jwt;
  !companyId && ({ company_id: companyId } = await getDevice({ id: deviceId, org }) || {});
  const jwtInfo = {
    companyId,
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
    const accessToken = sign(jwtInfo);
    const refreshToken = crypto
      .createHash('md5')
      .update(accessToken)
      .digest('hex');

    return res.send({
      accessToken,
      expires: -1,
      refreshToken,
    });
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      return res.status(403).send({ error: err.message });
    }
    // eslint-disable-next-line no-console
    console.error('v2', '/register', req.body, err);
    return res.status(500).send(!isProduction ? err : err.message);
  }
});

// curl -v http://localhost:9000/v2/company_tokens \
//   -H 'Authorization: Bearer ey...Pg'
//
router.get('/company_tokens', checkAuth(verify), async (req, res) => {
  const { org } = req.jwt;
  try {
    const orgTokens = await getOrgs({ org });
    res.send(orgTokens);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('v2', '/company_tokens', err);
    res.status(500).send({ error: err.message });
  }
});

router.get('/devices', checkAuth(verify), async (req, res) => {
  try {
    const { org } = req.jwt;
    const devices = await getDevices({ org });
    res.send(devices || []);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('v2', '/devices', err);
    res.status(500).send({ error: err.message });
  }
});

router.delete('/devices/:id', checkAuth(verify), async (req, res) => {
  const { org } = req.jwt;
  const {
    id,
    end_date: endDate,
    start_date: startDate,
  } = req.params;

  // eslint-disable-next-line no-console
  console.info(
    'devices:delete'.green,
    'device:id'.green,
    id,
    JSON.stringify(req.query),
  );

  try {
    await deleteDevice({
      end_date: endDate,
      id,
      org,
      start_date: startDate,
    });
    res.send({ success: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('v2', `DELETE /devices/${id}`, id, req.query, err);
    res.status(500).send({ error: err.message });
  }
});

router.get('/stats', checkAuth(verify), async (req, res) => {
  try {
    const stats = await getStats();
    res.send(stats);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('v2', '/stats', err);
    res.status(500).send({ error: err.message });
  }
});

router.get('/locations/latest', checkAuth(verify), async (req, res) => {
  const { org } = req.jwt;
  let { deviceId } = req.jwt;
  ({ device_id: deviceId = deviceId } = req.query);
  let { companyId } = req.jwt;
  !companyId && ({ company_id: companyId } = await getDevice({ id: deviceId, org }) || {});
  // eslint-disable-next-line no-console
  console.info(
    'locations:latest'.green,
    'org:name'.green,
    org,
    companyId,
    'device:id'.green,
    deviceId,
    JSON.stringify(req.query),
  );
  try {
    const latest = await getLatestLocation({
      device_id: +deviceId,
      company_id: +companyId,
    });
    return res.send(latest);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('v2', '/locations/latest', req.query, err);
    return res.status(500).send({ error: err.message });
  }
});

/**
 * GET /locations
 */
router.get('/locations', checkAuth(verify), async (req, res) => {
  const { org } = req.jwt;
  let { deviceId } = req.jwt;
  ({ device_id: deviceId = deviceId } = req.query);
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
    console.error('v2', '/locations', req.query, err);
    res.status(500).send({ error: err.message });
  }
});

/**
 * POST /locations
 */
router.post('/locations', checkAuth(verify), async (req, res) => {
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
  const data = isEncryptedRequest(req)
    ? decrypt(body.toString())
    : body;
  const device = await getDevice({ id: deviceId, org });

  // Can happen if Device is deleted from Dashboard but a JWT is still posting locations for it.
  if (!device) {
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

  if (isDDosCompany(org)) {
    return return1Gbfile(res);
  }

  data.device = device;

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
    console.error('v2', 'POST /locations', body, err);
    return res.status(500).send({ error: err.message });
  }
});

/**
 * POST /locations
 */
router.post('/locations/:company_token', checkAuth(verify), async (req, res) => {
  const { deviceId, org } = req.jwt;
  let { companyId } = req.jwt;
  !companyId && ({ company_id: companyId } = await getDevice({ id: deviceId, org }) || {});

  // eslint-disable-next-line no-console
  console.info(
    'locations:post'.green,
    'org:name'.green,
    org,
    'device:id'.green,
    deviceId,
  );

  if (isDDosCompany(org)) {
    return return1Gbfile(res);
  }

  const data = isEncryptedRequest(req)
    ? decrypt(req.body.toString())
    : req.body;
  data.company_token = org;

  try {
    await create(data);
    return res.send({ success: true });
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      return res.status(403).send({ error: err.toString() });
    }
    // eslint-disable-next-line no-console
    console.error(`POST /locations/${org}`, err);
    return res.status(500).send({ error: err.message });
  }
});

router.delete('/locations', checkAuth(verify), async (req, res) => {
  try {
    const { deviceId, org } = req.jwt;
    let { companyId } = req.jwt;
    !companyId && ({ company_id: companyId } = await getDevice({ id: deviceId, org }) || {});

    // eslint-disable-next-line no-console
    console.info(
      'locations:delete'.green,
      'org:name'.green,
      org,
      'device:id'.green,
      deviceId,
      JSON.stringify(req.query),
    );

    const { start_date: startDate, end_date: endDate } = req.query;

    await deleteLocations({
      companyId,
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
