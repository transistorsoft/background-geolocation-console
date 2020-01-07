import jwt from 'jsonwebtoken';
import rsaGen from 'keypair';

export const signOptions = {
  issuer: 'transistorsoft',
  subject: 'info@transistorsoft.com',
  audience: 'client',
};

const keys = !process.env.JWT_PRIVATE_KEY ? rsaGen() : {};
export const privateKey = process.env.JWT_PRIVATE_KEY || keys.private;
export const publicKey = process.env.JWT_PUBLIC_KEY || keys.public;

export const getKeys = () => {
  const result = {
    private: privateKey,
    public: publicKey,
  };

  return result;
};

/*
  issuer: "Authorizaxtion/Resource/This server",
  subject: "iam@user.me",
  audience: "Client_Identity" // this should be provided by client
*/
export const sign = (payload, { issuer, subject } = signOptions) => {
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

export const verify = (token, { issuer, subject } = signOptions) => {
  const options = {
    issuer,
    subject,
    audience: /.*/gim,
    // expiresIn: '782d',
    algorithm: ['RS256'],
  };
  return jwt.verify(token, keys.public, options);
};

export const decode = token => jwt.decode(token, { complete: true });
