import crypto from 'crypto';
import { Router } from 'express';
import 'colors';

import { decrypt, isEncryptedRequest } from '../libs/RNCrypto.js';
import { sign, verify } from '../libs/jwt.js';
import {
  AccessDeniedError,
  checkAuth,
  dataLogOn,
  isAdmin,
  isDDosCompany,
  RegistrationRequiredError,
  return1Gbfile,
} from '../libs/utils.js';
import { isProduction } from '../config.js';
import {
  deleteDevice,
  findOrCreate,
  getDevice,
  getDevices,
} from '../models/Device.js';
import {
  create,
  deleteLocations,
  getLatestLocation,
  getLocations,
  getStats,
  removeOld,
} from '../models/Location.js';
import { getOrgs } from '../models/Org.js';

const router = new Router();

// curl -v -X POST http://localhost:9000/v2/register \
//  -d '{"company_token":"test","device_id":"test"}' \
//  -H 'Content-Type: application/json'
router.post('/register', async (req, res) => {
  const {
    device_id: devId,
    device_model: deviceModel,
    framework,
    manufacturer,
    model,
    org,
    platform,
    uuid,
    version,
  } = req.body;

  // eslint-disable-next-line no-console
  console.info(
    'v2: POST /register '.green,
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
  dataLogOn && console.log(`v2:post:register:${org}`.yellow, JSON.stringify(req.body));

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
      model: deviceModel || model,
      platform,
      uuid: uuid || devId,
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
    'v2:auth:refresh'.green,
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

    const refreshExpiresIn = 12341234;

    return res.send({
      accessToken,
      expires: -1,
      refreshToken,
      refreshExpiresIn
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
    const orgTokens = await getOrgs({ org }, isAdmin(req.jwt));
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
    const devices = await getDevices({ org }, isAdmin(req.jwt));
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
    'v2:devices:delete'.green,
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
    'v2:locations:latest'.green,
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
    'v2:locations:get'.green,
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
  const device = await getDevice({ id: deviceId, org });

  // eslint-disable-next-line no-console
  console.info(
    'v2:locations:post'.green,
    'org:name'.green,
    org,
    'device:id'.green,
    deviceId,
  );

  // Can happen if Device is deleted from Dashboard but a JWT is still posting locations for it.
  if (!device) {
    // eslint-disable-next-line no-console
    console.error('Device ID %s not found.  Was it deleted from dashboard?'.red, deviceId);
    return res.status(410)
      .send({ error: 'DEVICE_ID_NOT_FOUND', background_geolocation: ['stop'] });
  }

  if (isDDosCompany(org)) {
    return return1Gbfile(res);
  }

  const { body } = req;
  const data = isEncryptedRequest(req)
    ? decrypt(body.toString())
    : body;
  // eslint-disable-next-line no-console
  dataLogOn && console.log('v2:post:locations'.yellow, org, JSON.stringify(data));

  try {
    await create(data, org, device);
    await removeOld(org);
    return res.send({ success: true });
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      if (err.cause === 'banned') {
        // Sends background-geolocation RPC commands back to the SDK to try and stop this device from spamming us.
        return res.status(403).send({
          error: 'BANNED',
          background_geolocation: [  // <-- Send an RPC
            ['setConfig', {maxRecordsToPersist: 0, debug: true}],
            ['stop'],
            ['ban', err.message]
          ]
        });
      } else {
        return res.status(403).send({ error: err.toString() });
      }
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
  const { company_token: orgId } = req.params;
  const device = await getDevice({ id: deviceId, org: org || orgId });

  // eslint-disable-next-line no-console
  console.info(
    'v2:locations:post'.green,
    'org:name'.green,
    org,
    'device:id'.green,
    deviceId,
  );

  // Can happen if Device is deleted from Dashboard but a JWT is still posting locations for it.
  if (!device) {
    console.error('Device ID %s not found.  Was it deleted from dashboard?'.red, deviceId);
    return res.status(410)
      .send({ error: 'DEVICE_ID_NOT_FOUND', background_geolocation: ['stop'] });
  }

  if (isDDosCompany(org || orgId)) {
    return return1Gbfile(res);
  }

  const data = isEncryptedRequest(req)
    ? decrypt(req.body.toString())
    : req.body;

  // eslint-disable-next-line no-console
  dataLogOn && console.log(`v2:post:locations:${orgId}`.yellow, JSON.stringify(data));

  try {
    await create(data, org || orgId, device);
    await removeOld(org || orgId);
    return res.send({ success: true });
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      return res.status(403).send({ error: err.toString() });
    }
    // eslint-disable-next-line no-console
    console.error(`v2: POST /locations/${org}`, err);
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
      'v2:locations:delete'.green,
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
    console.info('v2: DELETE /locations', req.query, err);
    res.status(500).send({ error: err.message });
  }
});

export default router;
