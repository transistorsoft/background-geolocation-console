import fs from 'fs';
import { stringify } from 'querystring';
import { Router } from 'express';
import { isEncryptedRequest, decrypt } from '../libs/RNCrypto';
import {
  AccessDeniedError,
  isDDosCompany,
  return1Gbfile,
} from '../libs/utils';
import { getDevices, deleteDevice } from '../models/Device';
import { getCompanyTokens } from '../models/CompanyToken';
import {
  createLocation,
  deleteLocations,
  getLatestLocation,
  getLocations,
  getStats,
} from '../models/Location';

const router = new Router();

/**
 * GET /company_tokens
 */
router.get('/company_tokens', async function (req, res) {
  try {
    console.log('GET /company_tokens\n'.green);
    const companyTokens = await getCompanyTokens(req.query);
    res.send(companyTokens);
  } catch (err) {
    console.info('err: ', err);
    res.status(500).send({ error: 'Something failed!' });
  }
});

/**
 * GET /devices
 */
router.get('/devices', async function (req, res) {
  try {
    console.log('GET /devices\n'.green);
    const devices = await getDevices(req.query);
    res.send(devices);
  } catch (err) {
    console.info('err: ', err);
    res.status(500).send({ error: 'Something failed!' });
  }
});

router.delete('/devices/:id', async function (req, res) {
  try {
    console.log(`DELETE /devices/${req.params.id}?${stringify(req.query)}\n`.green);
    await deleteDevice({ ...req.query, id: req.params.id });
    res.send({ success: true });
  } catch (err) {
    console.info('err: ', err);
    res.status(500).send({ error: 'Something failed!' });
  }
});

router.get('/stats', async function (req, res) {
  try {
    console.log('GET /stats\n'.green);
    const stats = await getStats();
    res.send(stats);
  } catch (err) {
    console.info('err: ', err);
    res.status(500).send({ error: 'Something failed!' });
  }
});

router.get('/locations/latest', async function (req, res) {
  console.log('GET /locations %s'.green, JSON.stringify(req.query));
  try {
    const latest = await getLatestLocation(req.query);
    res.send(latest);
  } catch (err) {
    console.info('err: ', err);
    res.status(500).send({ error: 'Something failed!' });
  }
});

/**
 * GET /locations
 */
router.get('/locations', async function (req, res) {
  console.log('GET /locations %s'.green, JSON.stringify(req.query));

  try {
    const locations = await getLocations(req.query);
    res.send(locations);
  } catch (err) {
    console.info('err: ', err);
    res.status(500).send({ error: 'Something failed!' });
  }
});

/**
 * POST /locations
 */
router.post('/locations', async function (req, res) {
  const { body } = req;
  const data = isEncryptedRequest(req)
    ? decrypt(body.toString())
    : body;
  const locations = Array.isArray(data) ? data : (data ? [data] : []);

  if (locations.find(({ company_token: companyToken }) => isDDosCompany(companyToken))) {
    return return1Gbfile(res);
  }
  var auth = req.get('Authorization');
  console.log('POST /locations\n%s'.green, JSON.stringify(req.headers, null, 2));
  console.log('Authorization: %s'.green, auth);
  console.log('%s\n'.yellow, JSON.stringify(locations, null, 2));

  try {
    await createLocation(locations);
    res.send({ success: true });
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      return res.status(403).send({ error: err.toString() });
    }
    console.error('err: ', err);
    res.status(500).send({ error: 'Something failed!' });
  }
});

/**
 * POST /locations
 */
router.post('/locations/:company_token', async function (req, res) {
  const { company_token: companyToken } = req.params;

  if (isDDosCompany(companyToken)) {
    return return1Gbfile(res);
  }

  const auth = req.get('Authorization');

  const data = (isEncryptedRequest(req)) ? decrypt(req.body.toString()) : req.body;
  data.company_token = companyToken;

  console.log(`POST /locations/${companyToken}\n%s`.green, JSON.stringify(req.headers, null, 2));
  console.log('Authorization: %s'.green, auth);
  console.log('%s\n'.yellow, JSON.stringify(data, null, 2));

  try {
    await createLocation(data);

    res.send({ success: true });
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      return res.status(403).send({ error: err.toString() });
    }
    console.error('err: ', err);
    res.status(500).send({ error: 'Something failed!' });
  }
});

router.delete('/locations', async function (req, res) {
  console.log('---------------------------------------------------------------------');
  console.log('- DELETE /locations', JSON.stringify(req.query));

  try {
    await deleteLocations(req.query);

    res.send({ success: true });
    res.status(500).send({ error: 'Something failed!' });
  } catch (err) {
    console.info('err: ', err);
    res.status(500).send({ error: 'Something failed!' });
  }
});

router.post('/locations_template', async function (req, res) {
  console.log('POST /locations_template\n%s\n'.green, JSON.stringify(req.body, null, 2));

  res.set('Retry-After', 5);
  res.send({ success: true });
});

router.post('/configure', async function (req, res) {
  console.log('/configure');

  var response = {
    access_token: 'e7ebae5e-4bea-4d63-8f28-8a104acd2f4c',
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: '2a69e1cd-d7db-44f6-87fc-3d66c4505ee4',
    scope: 'openid+email+profile+phone+address+group',
  };
  res.send(response);
});

/**
 * Fetch iOS simulator city_drive route
 */
router.get('/data/city_drive', async function (req, res) {
  console.log('GET /data/city_drive.json'.green);
  fs.readFile('./data/city_drive.json', 'utf8', function (_err, data) {
    res.send(data);
  });
});

export default router;
