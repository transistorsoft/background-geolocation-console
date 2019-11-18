import { Router } from 'express';

import { findOrCreate, getDevices, getDevice, deleteDevice } from '../models/Device';
import { getCompanyTokens } from '../models/CompanyToken';
import RNCrypto from '../libs/RNCrypto';
import {
  AccessDeniedError,
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
    company_token: companyToken,
    device_id: deviceUuid,
    device_model: model = 'UNKNOWN',
    framework = null,
    version = null,
  } = req.body;
  const jwtInfo = {
    // company: companyToken,
    deviceUuid: deviceUuid,
    model: model,
  };

  if (!companyToken) {
    return res.status(500).send({ message: 'Company Name is empty' });
  }

  if (!deviceUuid) {
    return res.status(500).send({ message: 'Device Id is empty' });
  }

  try {
    const device = await findOrCreate(
      companyToken,
      {
        model,
        id: deviceUuid,
        framework,
        version,
      }
    );
    // jwtInfo.companyId = device.company_id;
    jwtInfo.deviceId = device.id;
    const jwt = sign(jwtInfo);

    return res.send({
      jwt,
      device,
    });
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      return res.status(403).send({ error: err.message });
    }
    console.error('/register', req.body, err);
    return res.status(500).send(!isProduction ? err : err.message);
  }
});
// curl -v http://localhost:9000/v2/company_tokens \
//   -H 'Authorization: Bearer ey...Pg'
//
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
      company_id: device.company_id,
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

/**
 * POST /locations
 */
router.post('/locations', checkAuth, async function (req, res) {
  const { deviceId } = req.jwt;
  const { body } = req;
  const device = await getDevice({ id: deviceId });
  const data = RNCrypto.isEncryptedRequest(req)
    ? RNCrypto.decrypt(body.toString())
    : body;
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

  try {
    await createLocation(locations, device);
    res.send({ success: true });
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      return res.status(403).send({ error: err.toString() });
    }
    console.error('POST /locations', body, err);
    res.status(500).send({ error: err.message });
  }
});

/**
 * POST /locations
 */
router.post('/locations/:company_token', checkAuth, async function (req, res) {
  const { deviceId } = req.jwt;
  const device = await getDevice({ id: deviceId });
  if (isDDosCompany(device.company_token)) {
    return return1Gbfile(res);
  }

  const data = (RNCrypto.isEncryptedRequest(req))
    ? RNCrypto.decrypt(req.body.toString())
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
