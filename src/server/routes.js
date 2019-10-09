import fs from 'fs';
import { stringify } from 'querystring';
import { getDevices, deleteDevice } from './models/Device';
import { getCompanyTokens } from './models/CompanyToken';
import {
  AccessDeniedError,
  createLocation,
  deleteLocations,
  getLatestLocation,
  getLocations,
  getStats,
} from './models/Location';

var Routes = function (app) {
  /**
   * GET /company_tokens
   */
  app.get('/company_tokens', async function (req, res) {
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
  app.get('/devices', async function (req, res) {
    try {
      console.log('GET /devices\n'.green);
      const devices = await getDevices(req.query);
      res.send(devices);
    } catch (err) {
      console.info('err: ', err);
      res.status(500).send({ error: 'Something failed!' });
    }
  });

  app.delete('/devices/:id', async function (req, res) {
    try {
      console.log(`DELETE /devices/${req.params.id}?${stringify(req.query)}\n`.green);
      await deleteDevice({ ...req.query, id: req.params.id });
      res.send({ success: true });
    } catch (err) {
      console.info('err: ', err);
      res.status(500).send({ error: 'Something failed!' });
    }
  });

  app.get('/stats', async function (req, res) {
    try {
      console.log('GET /stats\n'.green);
      const stats = await getStats();
      res.send(stats);
    } catch (err) {
      console.info('err: ', err);
      res.status(500).send({ error: 'Something failed!' });
    }
  });

  app.get('/locations/latest', async function (req, res) {
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
  app.get('/locations', async function (req, res) {
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
  app.post('/locations', async function (req, res) {
    var auth = req.get('Authorization');
    console.log('POST /locations\n%s'.green, JSON.stringify(req.headers, null, 2));
    console.log('Authorization: %s'.green, auth);
    console.log('%s\n'.yellow, JSON.stringify(req.body, null, 2));

    try {
      await createLocation(req.body);
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
  app.post('/locations/:company_token', async function (req, res) {
    var auth = req.get('Authorization');

    console.log(`POST /locations/${req.params.company_token}\n%s`.green, JSON.stringify(req.headers, null, 2));
    console.log('Authorization: %s'.green, auth);
    console.log('%s\n'.yellow, JSON.stringify(req.body, null, 2));

    req.body.company_token = req.params.company_token;

    try {
      await createLocation(req.body);
      res.send({ success: true });
    } catch (err) {
      if (err instanceof AccessDeniedError) {
        return res.status(403).send({ error: err.toString() });
      }
      console.error('err: ', err);
      res.status(500).send({ error: 'Something failed!' });
    }
  });

  app.delete('/locations', async function (req, res) {
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

  app.post('/locations_template', async function (req, res) {
    console.log('POST /locations_template\n%s\n'.green, JSON.stringify(req.body, null, 2));
    res.set('Retry-After', 5);
    res.send({ success: true });
  });

  app.post('/configure', async function (req, res) {
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
  app.get('/data/city_drive', async function (req, res) {
    console.log('GET /data/city_drive.json'.green);
    fs.readFile('./data/city_drive.json', 'utf8', function (_err, data) {
      res.send(data);
    });
  });
};

module.exports = Routes;
