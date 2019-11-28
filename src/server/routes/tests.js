import { Router } from 'express';

// import { isEncryptedRequest, decrypt } from '../libs/RNCrypto';
import {
  AccessDeniedError,
  RegistrationRequiredError,
} from '../libs/utils';

const router = new Router();

router.post('/test/locations/500', async function (req, res) {
  res.status(500).send({ message: 'Dummy error response' });
});

router.post('/test/register', async function (req, res) {
  res.status(200).send({ accessToken: 'Dummy access token' });
});

router.post('/test/status/:status', async function (req, res) {
  const { status } = req.params;
  res.status(+status).send({ message: `Dummy error response with ${status}`, status });
});

router.post('/test/error/403/AccessDeniedError', async function (req, res) {
  res.status(403).send({ error: new AccessDeniedError('Dummy error').toString() });
});

router.post('/test/error/406/RegistrationRequiredError', async function (req, res) {
  res.status(406).send({ error: new RegistrationRequiredError('Dummy error').toString() });
});

export default router;
