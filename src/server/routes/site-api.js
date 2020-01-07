/* eslint-disable no-console */
import fs from 'fs';
import { Router } from 'express';

import { sign } from '../libs/jwt';
import { decrypt, isEncryptedRequest } from '../libs/RNCrypto';
import {
  AccessDeniedError,
  isAdmin,
  isDDosCompany,
  return1Gbfile,
} from '../libs/utils';
import { deleteDevice, getDevices } from '../models/Device';
import {
  createLocation,
  deleteLocations,
  getLatestLocation,
  getLocations,
  getStats,
} from '../models/Location';
import { getOrgs } from '../models/Org';

const router = new Router();

/**
 * GET /company_tokens
 */
router.get('/company_tokens', async (req, res) => {
  try {
    const orgs = await getOrgs(req.query);
    res.send(orgs);
  } catch (err) {
    console.error('/company_tokens', err);
    res.status(500).send({ error: 'Something failed!' });
  }
});

/**
 * GET /devices
 */
router.get('/devices', async (req, res) => {
  try {
    const devices = await getDevices(req.query);
    res.send(devices);
  } catch (err) {
    console.error('/devices', err);
    res.status(500).send({ error: 'Something failed!' });
  }
});

router.delete('/devices/:id', async (req, res) => {
  try {
    console.log(
      `DELETE /devices/${req.params.id}?${JSON.stringify(req.query)}\n`.green,
    );
    await deleteDevice({ ...req.query, id: req.params.id });
    res.send({ success: true });
  } catch (err) {
    console.error(
      '/devices',
      JSON.stringify(req.params),
      JSON.stringify(req.query),
      err,
    );
    res.status(500).send({ error: 'Something failed!' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const stats = await getStats();
    res.send(stats);
  } catch (err) {
    console.info('/stats', err);
    res.status(500).send({ error: 'Something failed!' });
  }
});

router.get('/locations/latest', async (req, res) => {
  console.log('GET /locations %s'.green, JSON.stringify(req.query));
  try {
    const latest = await getLatestLocation(req.query);
    res.send(latest);
  } catch (err) {
    console.info('/locations/latest', JSON.stringify(req.query), err);
    res.status(500).send({ error: 'Something failed!' });
  }
});

/**
 * GET /locations
 */
router.get('/locations', async (req, res) => {
  console.log('GET /locations %s'.green, JSON.stringify(req.query));

  try {
    const locations = await getLocations(req.query);
    res.send(locations);
  } catch (err) {
    console.info('get /locations', JSON.stringify(req.query), err);
    res.status(500).send({ error: 'Something failed!' });
  }
});

/**
 * POST /locations
 */
router.post('/locations', async (req, res) => {
  const { body } = req;
  const data = isEncryptedRequest(req) ? decrypt(body.toString()) : body;
  const locations = Array.isArray(data) ? data : data ? [data] : [];

  if (locations.find(({ company_token: org }) => isDDosCompany(org))) {
    return return1Gbfile(res);
  }

  try {
    await createLocation(locations);
    return res.send({ success: true });
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      return res.status(403).send({ error: err.toString() });
    }
    console.error('post /locations', err);
    return res.status(500).send({ error: 'Something failed!' });
  }
});

/**
 * POST /locations
 */
router.post('/locations/:company_token', async (req, res) => {
  const { company_token: org } = req.params;

  console.info('locations:post'.green, 'org:name'.green, org);

  if (isDDosCompany(org)) {
    return return1Gbfile(res);
  }

  const data = isEncryptedRequest(req)
    ? decrypt(req.body.toString())
    : req.body;
  data.company_token = org;

  try {
    await createLocation(data);

    return res.send({ success: true });
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      return res.status(403).send({ error: err.toString() });
    }
    console.error('post /locations', org, err);
    return res.status(500).send({ error: 'Something failed!' });
  }
});

router.delete('/locations', async (req, res) => {
  console.info('locations:delete:query'.green, JSON.stringify(req.query));

  try {
    await deleteLocations(req.query);

    res.send({ success: true });
    res.status(500).send({ error: 'Something failed!' });
  } catch (err) {
    console.info('delete /locations', JSON.stringify(req.query), err);
    res.status(500).send({ error: 'Something failed!' });
  }
});

router.post('/locations_template', async (req, res) => {
  console.log('POST /locations_template\n%s\n'.green, JSON.stringify(req.body));

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
  const { body: { org } } = req;

  if (isAdmin(org)) {
    const jwtInfo = { org };

    const accessToken = sign(jwtInfo);
    res.send({ accessToken });
  }

  return res.status(401).send({ org, error: 'Await not public account' });
});

/**
 * Fetch iOS simulator city_drive route
 */
router.get('/data/city_drive', async (req, res) => {
  console.log('GET /data/city_drive.json'.green);
  fs.readFile('./data/city_drive.json', 'utf8', (_err, data) => {
    res.send(data);
  });
});

export default router;
