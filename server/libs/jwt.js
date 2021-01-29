import jwt from 'jsonwebtoken';
import forge from 'node-forge';

import {
  JWT_PRIVATE_KEY,
  JWT_PUBLIC_KEY,
  developerJWTkey,
} from '../config.js';

export const signOptions = {
  issuer: 'transistorsoft',
  subject: 'info@transistorsoft.com',
  audience: 'client',
};

export const fix = str => `${str.replace(/\r/g, '')}\n`;

export const getPublicKey = privateKey => {
  // convert PEM-formatted private key to a Forge private key
  const forgePrivateKey = forge.pki.privateKeyFromPem(privateKey);

  // get a Forge public key from the Forge private key
  const forgePublicKey = forge.pki.setRsaPublicKey(forgePrivateKey.n, forgePrivateKey.e);

  // convert the Forge public key to a PEM-formatted public key
  const publicKey = forge.pki.publicKeyToPem(forgePublicKey);

  // convert the Forge public key to an OpenSSH-formatted public key for authorized_keys
  // const sshPublicKey = forge.ssh.publicKeyToOpenSSH(forgePublicKey);
  return fix(publicKey);
};

const keys = !JWT_PRIVATE_KEY
  ? (
    developerJWTkey
  )
  : { private: JWT_PRIVATE_KEY || '', public: JWT_PUBLIC_KEY || '' };

keys.public = keys.public || JWT_PUBLIC_KEY || '';
keys.private = keys.private || JWT_PRIVATE_KEY || '';

keys.public = keys.public.replace(/\\n/mg, '\n');
keys.private = keys.private.replace(/\\n/mg, '\n');

export const { public: publicKey, private: privateKey } = keys;

/*
  issuer: "Authorizaxtion/Resource/This server",
  subject: "iam@user.me",
  audience: "Client_Identity" // this should be provided by client
*/
export const sign = (payload, pKey = privateKey || keys.private, { issuer, subject } = signOptions) => {
  const audience = payload.audience || payload.org || 'unknown';
  // Token signing options
  const options = {
    issuer,
    subject,
    audience: Array.isArray(audience)
      ? audience.filter(Boolean).map(x => `${x}`).join(', ')
      : `${audience}`,
    // expiresIn: '782d',
    algorithm: 'RS256',
  };
  return jwt.sign(payload, pKey, options);
};

export const verify = (token, pKey = publicKey || keys.public, { issuer, subject } = signOptions) => {
  const options = {
    issuer,
    subject,
    audience: /.*/gim,
    // expiresIn: '782d',
    algorithm: 'RS256',
  };
  const result = jwt.verify(token, pKey, options);
  return result;
};

export const decode = (
  token,
  pKey = publicKey || keys.public,
) => jwt.decode(token, { complete: true, publicKey: pKey });
