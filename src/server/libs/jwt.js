import { readFileSync, existsSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import jwt from 'jsonwebtoken';
import rsaGen from 'keypair';

export const keyPath = resolve(__dirname, '..', '..', '..', 'keys');
export const privateKeyFile = resolve(keyPath, 'private.key');
export const publicKeyFile = resolve(keyPath, 'public.key');

export const signOptions = {
  issuer: 'transistorsoft',
  subject: 'info@transistorsoft.com',
  audience: 'client',
};

export const makeKeys = async () => {
  if (existsSync(privateKeyFile)) {
    return;
  }

  const keys = rsaGen();
  const options = { flag: 'w', encoding: 'utf8' };

  writeFileSync(privateKeyFile, keys.private, options);
  writeFileSync(publicKeyFile, keys.public, options);
};

export const getKeys = () => {
  const result = {};

  result.private = readFileSync(privateKeyFile, 'utf8');
  result.public = readFileSync(publicKeyFile, 'utf8');

  return result;
};

/*
  issuer: "Authorizaxtion/Resource/This server",
  subject: "iam@user.me",
  audience: "Client_Identity" // this should be provided by client
*/
export const sign = (payload, { issuer, subject, audience } = signOptions) => {
  const keys = getKeys();
  // Token signing options
  const options = {
    issuer,
    subject,
    audience: payload.audience || payload.org,
    // expiresIn: '782d',
    algorithm: 'RS256',
  };
  return jwt.sign(payload, keys.private, options);
};

export const verify = (token, { issuer, subject, audience } = signOptions) => {
  const keys = getKeys();
  const options = {
    issuer,
    subject,
    audience: /.*/img,
    // expiresIn: '782d',
    algorithm:  ['RS256'],
  };
  return jwt.verify(token, keys.public, options);
};

export const decode = (token) => {
  return jwt.decode(token, { complete: true });
};
