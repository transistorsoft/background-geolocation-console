import { Router } from 'express';

import { findOrCreate, getDevices, getDevice, deleteDevice } from '../models/Device';
import { getCompanyTokens } from '../models/CompanyToken';
import { isEncryptedRequest, decrypt } from '../libs/RNCrypto';
import {
  AccessDeniedError,
  RegistrationRequiredError,
  checkAuth,
  isProduction,
  isDDosCompany,
  return1Gbfile,
} from '../libs/utils';
import {
  createLocation,
  deleteLocations,
  getLatestLocation,
  getLocations,
  getStats,
} from '../models/Location';
import { sign } from '../libs/jwt';

const router = new Router();

// curl -v -X POST http://localhost:9000/v2/register \
//  -d '{"company_token":"test","device_id":"test"}' \
//  -H 'Content-Type: application/json'
router.post('/register', async function (req, res) {
  const {
    org: org,
    uuid: uuid,
    model: model,
    manufacturer: manufacturer,
    version = version,
    framework = framework
  } = req.body;

  console.log("POST /register %s".green, JSON.stringify(req.body, null, 2));

  if (!org) {
    return res.status(500).send({ message: 'Organization identifier empty' });
  }

  if (!uuid || !model || !manufacturer || !version) {
    return res.status(500).send({ message: 'Device info is missing' });
  }

  try {
    const device = await findOrCreate(org, {
      uuid,
      model,
      framework,
      version
    });

    const jwtInfo = {
      org: org,
      deviceId: device.id,
      model: model,
    };

    const jwt = sign(jwtInfo);

    return res.send({
      accessToken: jwt,
      refreshToken: "AAAAbbbbCCCCddddEEEEffffGGGGhhhhiiiiJJJJ", // TODO
      expires: -1      // TODO
    });
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      return res.status(403).send({ error: err.message });
    }
    console.error('/register', req.body, err);
    return res.status(500).send(!isProduction ? err : err.message);
  }
});

router.get('/company_tokens', checkAuth, async function (req, res) {
  const { company: companyToken } = req.jwt;
  try {
    const companyTokens = await getCompanyTokens({ company_token: companyToken });
    res.send(companyTokens);
  } catch (err) {
    console.error('/company_tokens', err);
    res.status(500).send({ error: err.message });
  }
});

router.get('/devices', checkAuth, async function (req, res) {
  try {
    const { deviceId } = req.jwt;
    const device = await getDevice({ id: deviceId });
    const devices = await getDevices({
      company_id: device.company_id,
    });
    res.send(devices);
  } catch (err) {
    console.error('/devices', err);
    res.status(500).send({ error: err.message });
  }
});

router.delete('/devices/:id', checkAuth, async function (req, res) {
  const { deviceId } = req.jwt;
  const device = await getDevice({ id: deviceId });
  const {
    id,
    end_date: endDate,
    start_date: startDate,
  } = req.params;
  try {
    await deleteDevice({
      id,
      end_date: endDate,
      start_date: startDate,
    });
    res.send({ success: true });
  } catch (err) {
    console.error(`/devices/${id}`, req.query, err);
    res.status(500).send({ error: err.message });
  }
});

router.get('/stats', checkAuth, async function (req, res) {
  try {
    const stats = await getStats();
    res.send(stats);
  } catch (err) {
    console.error('/stats', err);
    res.status(500).send({ error: err.message });
  }
});

router.get('/locations/latest', checkAuth, async function (req, res) {
  const { deviceId } = req.jwt;
  const device = await getDevice({ id: deviceId });
  const {
    device_id: id,
  } = req.query;
  try {
    const latest = await getLatestLocation({
      device_id: id,
      company_id: device.company_id,

    });
    res.send(latest);
  } catch (err) {
    console.error('/locations/latest', req.query, err);
    res.status(500).send({ error: err.message });
  }
});

/**
 * GET /locations
 */
router.get('/locations', checkAuth, async function (req, res) {
  const { deviceId } = req.jwt;

  const device = await getDevice({ id: deviceId });

  const {
    end_date: endDate,
    start_date: startDate,
  } = req.params;
  try {
    const locations = await getLocations({
      start_date: startDate,
      end_date: endDate,
      company_id: device.company_id,
    });
    res.send(locations);
  } catch (err) {
    console.error('/locations', req.query, err);
    res.status(500).send({ error: err.message });
  }
});

router.post('/test/unauthorized', checkAuth, async function(req, res) {
  console.log('Simulate unauthorized'.green);
  return res.status(401).send();
});

router.post('/tokens', async function (req, res) {
  console.log('Refresh token %s'.green);
  console.log('[headers] %s'.green, JSON.stringify(req.headers, null, 2));

  var form = {};
  req.busboy.on('field', (name, value) => {
    console.log('- name: ', name, value);
    form[name] = value;
  });
  req.busboy.on('finish', () => {
    console.log('[form] %s'.green, JSON.stringify(form, null, 0));

    let payload = {
      accessToken: {
        token: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJvcmciOiJUU0xvY2F0aW9uTWFuYWdlclRlc3RzIiwiZGV2aWNlSWQiOjc5LCJtb2RlbCI6ImlQaG9uZTEyLDMoeDg2XzY0KSIsImlhdCI6MTU3NDc4NjQ5MCwiYXVkIjoiVFNMb2NhdGlvbk1hbmFnZXJUZXN0cyIsImlzcyI6InRyYW5zaXN0b3Jzb2Z0Iiwic3ViIjoiaW5mb0B0cmFuc2lzdG9yc29mdC5jb20ifQ.XCN28PMTgnM22nbF2pmoC0nbskE__Hz6Sr82TRBHH3Y-uaDqJxol4UxeqK6t9ygyFigwHauWvwn-MrIIk9wxJ36TwA2bvbPIk5ASf_qkApDM0G3MiFIFuPRCdACT8LZOJb6PIN0pZ105J_aRno_8WpFX1xC1FKX4bVSCxfO9ldzd3hGXqC5wThH36CwKdwl1CJImq9iOmjEpJH7YAZDLI9bw2STB8OI4QSN0QauacIPUBXtEBHjlFx7cgnavTjyQzFeMh4AbUZoQt9JbaxcWAG19Cy_Xj8YDUO-aGxQz5shmB9HB0cPGJY3skNaCTDS8Nu8P1OSaVpqLbtyROyv4fw',
        expires: 3600
      },
      theRefreshTokenWithOddKey: 'fdb8fdbecf1d03ce5e6125c067733c0d51de209c'
    };
    console.log('[payload] %s'.green, JSON.stringify(payload, null, 2));
    res.status(200).send(payload);
  });
});


/**
 * POST /locations
 */
router.post('/locations', checkAuth, async function (req, res) {
  const { deviceId } = req.jwt;
  const { body } = req;
  const device = await getDevice({ id: deviceId });
  const data = isEncryptedRequest(req)
    ? decrypt(body.toString())
    : body;

  // Can happen if Device is deleted from Dashboard but a JWT is still posting locations for it.
  if (device == null) {
    console.error('Device ID %s not found.  Was it deleted from dashboard?'.red, deviceId);
    return res.status(410).send({error: 'DEVICE_ID_NOT_FOUND', background_geolocation: ['stop']});
  }

  const locations = (Array.isArray(data) ? data : (data ? [data] : []))
    .map(x => ({
      ...x,
      company_id: device.company_id,
      device_id: deviceId,
      company_token: device.company_token,
    }));

  if (isDDosCompany(device.company_token)) {
    return return1Gbfile(res);
  }

  console.log('%s\n'.yellow, JSON.stringify(data, null, 2));

  try {
    await createLocation(locations, device);
    res.send({ success: true });
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      return res.status(403).send({ error: err.toString() });
    } else if (err instanceof RegistrationRequiredError) {
      return res.status(406).send({ error: err.toString() });
    }
    console.error('POST /locations', body, err);
    res.status(500).send({ error: err.message });
  }
})

/**
 * POST /locations
 */
router.post('/locations/:company_token', checkAuth, async function (req, res) {
  const { deviceId } = req.jwt;
  const device = await getDevice({ id: deviceId });
  if (isDDosCompany(device.company_token)) {
    return return1Gbfile(res);
  }

  const data = (isEncryptedRequest(req))
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
      device
    );
    res.send({ success: true });
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      return res.status(403).send({ error: err.toString() });
    }
    console.error(`POST /locations${device.company_token}`, err);
    res.status(500).send({ error: err.message });
  }
});

router.delete('/locations', checkAuth, async function (req, res) {
  try {
    const { deviceId } = req.jwt;
    const device = await getDevice({ id: deviceId });
    const {
      deviceId: id,
      start_date: startDate,
      end_date: endDate,
    } = req.query;

    await deleteLocations({
      companyId: device.company_id,
      deviceId: id,
      end_date: endDate,
      start_date: startDate,
    });
    res.send({ success: true });
  } catch (err) {
    console.info('DELETE /locations', req.query, err);
    res.status(500).send({ error: err.message });
  }
});

export default router;
