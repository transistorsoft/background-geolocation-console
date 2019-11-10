import fs from 'fs';
import { Router } from 'express';
import {
  AccessDeniedError,
} from '../libs/utils';
import { getDevices, deleteDevice } from '../models/Device';
import { getCompanyTokens } from '../models/CompanyToken';
import {
  createLocation,
  deleteLocations,
  getLatestLocation,
  getLocations,
  getStats,
  isDDosCompany,
  return1Gbfile,
} from '../models/Location';

const router = new Router();
/**
 * GET /company_tokens
 */
router.get('/company_tokens', async function (req, res) {
  try {
    const companyTokens = await getCompanyTokens(req.query);
    res.send(companyTokens);
  } catch (err) {
    console.error('/company_tokens', err);
    res.status(500).send({ error: 'Something failed!' });
  }
});

/**
 * GET /devices
 */
router.get('/devices', async function (req, res) {
  try {
    const devices = await getDevices(req.query);
    res.send(devices);
  } catch (err) {
    console.error('/devices', err);
    res.status(500).send({ error: 'Something failed!' });
  }
});

router.delete('/devices/:id', async function (req, res) {
  const { id } = req.params;
  try {
    await deleteDevice({ ...req.query, id });
    res.send({ success: true });
  } catch (err) {
    console.error(`/devices/${id}`, req.query, err);
    res.status(500).send({ error: 'Something failed!' });
  }
});

router.get('/stats', async function (req, res) {
  try {
    const stats = await getStats();
    res.send(stats);
  } catch (err) {
    console.error('/stats', err);
    res.status(500).send({ error: 'Something failed!' });
  }
});

router.get('/locations/latest', async function (req, res) {
  try {
    const latest = await getLatestLocation(req.query);
    res.send(latest);
  } catch (err) {
    console.error('/locations/latest', req.query, err);
    res.status(500).send({ error: 'Something failed!' });
  }
});

/**
 * GET /locations
 */
router.get('/locations', async function (req, res) {
  try {
    const locations = await getLocations(req.query);
    res.send(locations);
  } catch (err) {
    console.error('/locations', req.query, err);
    res.status(500).send({ error: 'Something failed!' });
  }
});

/**
 * POST /locations
 */
router.post('/locations', async function (req, res) {
  const { body } = req;
  const locations = Array.isArray(body) ? body : (body ? [body] : []);

  if (locations.find(({ company_token: companyToken }) => isDDosCompany(companyToken))) {
    return return1Gbfile(res);
  }
  const auth = req.get('Authorization');
  console.log('POST /locations\n%s'.green, JSON.stringify(req.headers, null, 2));
  console.log('Authorization: %s'.green, auth);
  console.log('%s\n'.yellow, JSON.stringify(req.body, null, 2));

  try {
    await createLocation(locations);
    res.send({ success: true });
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      return res.status(403).send({ error: err.toString() });
    }
    console.error('POST /locations', body, err);
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

  var auth = req.get('Authorization');

  console.log(`POST /locations/${companyToken}\n%s`.green, JSON.stringify(req.headers, null, 2));
  console.log('Authorization: %s'.green, auth);
  console.log('%s\n'.yellow, JSON.stringify(req.body, null, 2));

  req.body.company_token = companyToken;

  try {
    await createLocation(req.body);
    res.send({ success: true });
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      return res.status(403).send({ error: err.toString() });
    }
    console.error(`POST /locations${companyToken}`, err);
    res.status(500).send({ error: 'Something failed!' });
  }
});

router.delete('/locations', async function (req, res) {
  console.log('---------------------------------------------------------------------');
  console.log('- DELETE /locations', JSON.stringify(req.query));
  try {
    await deleteLocations(req.query);
    res.send({ success: true });
  } catch (err) {
    console.info('DELETE /locations', req.query, err);
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
