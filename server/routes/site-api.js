/* eslint-disable no-console */
import fs from 'fs';
import { Router } from 'express';
import 'colors';

import { sign, verify } from '../libs/jwt.js';
import { decrypt, isEncryptedRequest } from '../libs/RNCrypto.js';
import {
  AccessDeniedError,
  checkAuth,
  dataLogOn,
  getAuth,
  isAdmin,
  isAdminToken,
  isDDosCompany,
  isPassword,
  return1Gbfile,
} from '../libs/utils.js';
import { deleteDevice, getDevices } from '../models/Device.js';
import {
  create,
  deleteLocations,
  removeOld,
  getLatestLocation,
  getLocations,
  getStats,
} from '../models/Location.js';
import { withAuth, adminToken } from '../config.js';
import { getOrgs, findOne } from '../models/Org.js';

const router = new Router();

/**
 * GET /company_tokens
 */
router.get('/company_tokens', checkAuth(verify), async (req, res) => {
  try {
    const { org } = req.jwt;
    const orgs = await getOrgs({ org }, isAdmin(req.jwt));
    res.send(orgs);
  } catch (err) {
    console.error('v1', '/company_tokens', err);
    res.status(500).send({ error: 'Something failed!' });
  }
});

/**
 * GET /devices
 */
router.get('/devices', checkAuth(verify), async (req, res) => {
  const {
    companyId: orgId,
    org,
  } = req.jwt;
  const { company_id: companyId } = req.query;
  const admin = isAdmin(req.jwt);
  try {
    const devices = await getDevices(
      {
        companyId: admin ? companyId : orgId,
        org,
      },
      isAdmin(req.jwt),
    );
    res.send(devices);
  } catch (err) {
    console.error('v1', '/devices', err);
    res.status(500).send({ error: 'Something failed!' });
  }
});

router.delete('/devices/:id', checkAuth(verify), async (req, res) => {
  const {
    companyId,
    org,
  } = req.jwt;
  const admin = isAdmin(req.jwt);
  try {
    console.log(
      `DELETE /devices/${req.params.id}?${JSON.stringify(req.query)}\n`.green,
    );
    await deleteDevice(
      {
        ...req.query,
        id: req.params.id,
        org,
        companyId: !admin && companyId,
      },
      isAdmin(req.jwt),
    );
    res.send({ success: true });
  } catch (err) {
    console.error(
      'v1',
      '/devices',
      JSON.stringify(req.params),
      JSON.stringify(req.query),
      err,
    );
    res.status(500).send({ error: 'Something failed!' });
  }
});

router.get('/stats', checkAuth(verify), async (req, res) => {
  try {
    const stats = await getStats();
    res.send(stats);
  } catch (err) {
    console.info('/stats', err);
    res.status(500).send({ error: 'Something failed!' });
  }
});

router.get('/locations/latest', checkAuth(verify), async (req, res) => {
  const { org, companyId: orgId } = req.jwt;
  const { company_id: companyId = orgId, device_id: deviceId } = req.query;
  const admin = isAdmin(req.jwt);
  console.log('v1: GET /locations/latest %s'.green, org, companyId, deviceId);
  try {
    const latest = await getLatestLocation(
      {
        device_id: deviceId,
        org,
        company_id: admin ? companyId : orgId,
      },
      admin,
    );
    res.send(latest);
  } catch (err) {
    console.info('v1: /locations/latest', deviceId, err);
    res.status(500).send({ error: 'Something failed!' });
  }
});

/**
 * GET /locations
 */
router.get('/locations', checkAuth(verify), async (req, res) => {
  const { org, companyId: orgId } = req.jwt;
  const { company_id: companyId } = req.query;
  const admin = isAdmin(req.jwt);
  console.log('v1: GET /locations'.green, JSON.stringify(req.query));

  try {
    const locations = await getLocations(
      {
        ...req.query,
        org,
        company_id: admin ? companyId : orgId,
      },
      admin,
    );
    res.send(locations);
  } catch (err) {
    console.error('v1', 'GET /locations', JSON.stringify(req.query), err);
    res.status(500).send({ error: 'Something failed!' });
  }
});

/**
 * POST /locations
 */
router.post('/locations', getAuth(verify), async (req, res) => {
  const { body } = req;
  const data = isEncryptedRequest(req)
    ? decrypt(body.toString())
    : body;
  const { company_token: org } = data;

  if (isDDosCompany(org)) {
    return return1Gbfile(res);
  }

  dataLogOn && console.log('v1:post:locations'.yellow, org, JSON.stringify(data));

  try {
    await create(data, org);
    await removeOld(org);
    return res.send({ success: true });
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      return res.status(403).send({ error: err.toString() });
    }
    console.error('v1', 'post /locations', err);
    return res.status(500).send({ error: 'Something failed!' });
  }
});

/**
 * POST /locations
 */
router.post('/locations/:company_token', getAuth(verify), async (req, res) => {
  const { company_token: org } = req.params;

  console.info('v1:locations:post'.green, 'org:name'.green, org);

  if (isDDosCompany(org)) {
    return return1Gbfile(res);
  }

  const data = isEncryptedRequest(req)
    ? decrypt(req.body.toString())
    : req.body;

  dataLogOn && console.log(`v1:post:locations:${org}`.yellow, JSON.stringify(data));

  try {
    await create(data, org);
    await removeOld(org);

    return res.send({ success: true });
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      return res.status(403).send({ error: err.toString() });
    }
    console.error('v1', 'post /locations', org, err);
    return res.status(500).send({ error: 'Something failed!' });
  }
});

router.delete('/locations', checkAuth(verify), async (req, res) => {
  const { org, companyId: orgId } = req.jwt;
  const { company_id: companyId } = req.query;
  const admin = isAdmin(req.jwt);
  console.info('v1:locations:delete:query'.green, JSON.stringify(req.query));

  try {
    await deleteLocations(
      {
        ...req.query,
        companyId: admin ? companyId : orgId,
        org,
      },
      admin,
    );

    res.send({ success: true });
  } catch (err) {
    console.info('v1', 'delete /locations', JSON.stringify(req.query), err);
    res.status(500).send({ error: 'Something failed!' });
  }
});

router.post('/locations_template', async (req, res) => {
  console.log('v1:POST /locations_template\n%s\n'.green, JSON.stringify(req.body));

  res.set('Retry-After', 5);
  res.send({ success: true });
});

router.post('/configure', async (req, res) => {
  const response = {
    access_token: 'e7ebae5e-4bea-4d63-8f28-8a104acd2f4c',
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: '2a69e1cd-d7db-44f6-87fc-3d66c4505ee4',
    scope: 'openid+email+profile+phone+address+group',
  };
  res.send(response);
});

router.post('/auth', async (req, res) => {
  const { login, password } = req.body || {};

  try {
    if (isAdminToken(login) && isPassword(password)) {
      const jwtInfo = { org: login, admin: true };

      const accessToken = sign(jwtInfo);
      return res.send({
        access_token: accessToken,
        token_type: 'Bearer',
        org: login,
      });
    }
  } catch (e) {
    console.error('v1', '/auth', e);
  }

  return res.status(401)
    .send({ org: login, error: 'Await not public account and right password' });
});

router.post('/jwt', async (req, res) => {
  const { org } = req.body || {};

  try {
    let id;
    if (!isAdmin()) {
      ({ id } = await findOne({ org }) || {});

      if (!id) {
        return res.status(401).send({ org, error: 'Org not found' });
      }
    }

    const jwtInfo = {
      admin: isAdmin(),
      companyId: id || 0,
      org: withAuth ? org : (org || adminToken),
    };
    const accessToken = sign(jwtInfo);
    return res.send({
      access_token: accessToken,
      isAdmin,
      org,
      token_type: 'Bearer',
    });
  } catch (e) {
    console.error('v1', '/jwt', e);
  }

  return res.status(401).send({ org, error: 'Await not public account and right password' });
});

router.get('/env', async (req, res) => {
  res.json({
    GOOGLE_ANALYTICS_ID: process.env.GOOGLE_ANALYTICS_ID,
    GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
    GOOGLE_TAG_MANAGER_ID: process.env.GOOGLE_TAG_MANAGER_ID,
    GOOGLE_TAG_ID: process.env.GOOGLE_TAG_ID,
    PURE_CHAT_ID: process.env.PURE_CHAT_ID,
    FIREBASE: !!process.env.FIREBASE_URL,
    SHARED_DASHBOARD: !!process.env.SHARED_DASHBOARD
  });
});

/**
 * Fetch iOS simulator city_drive route
 */
router.get('/data/city_drive', async (req, res) => {
  console.log('v1: GET /data/city_drive.json'.green);
  fs.readFile('./data/city_drive.json', 'utf8', (_err, data) => {
    res.send(data);
  });
});

export default router;
