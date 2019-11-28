import { Router } from 'express';

// import { isEncryptedRequest, decrypt } from '../libs/RNCrypto';
// import {
//   AccessDeniedError,
//   RegistrationRequiredError,
// } from '../libs/utils';

const router = new Router();

router.post('/test/locations/500', async function (req, res) {
  res.status(500).send({ message: 'Dummy error response' });
});

router.post('/test/register', async function (req, res) {
  res.status(200).send({ accessToken: 'Dummy access token' });
});

export default router;
