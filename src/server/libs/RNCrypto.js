/* eslint-disable no-console */
import crypto from 'crypto';

export const isEncryptedRequest = req => {
  const contentType = req.get('Content-Type');
  const result = contentType && contentType.indexOf('application/octet-stream') === 0;

  return result;
};

/**
 * Decrypt base64-encoded, RNCrypto encrypted data
 * @param {String} data Base64-encoded text.
 * @return {String} decrypted JSON
 */
export const decrypt = data => {
  // Decryption password.  Same as used by BackgroundGeolocation SDK to encrypt.
  const password = process.env.ENCRYPTION_PASSWORD;
  // Decode base64 data from HTTP body.
  const buffer = Buffer.from(data, 'base64');
  // Byte 0 is version of encryption spec (3)
  const version = buffer[0];

  if (+version !== 3) {
    console.log('RNCrypto error:  Unknown version %s'.red, version);
    return null;
  }
  // Byte 1 is options (1 = password encryption)
  // const options = buffer[1];
  // Bytes 2-9 is Password Salt
  const passwordSalt = buffer.slice(2, 10);
  // Bytes 10-17 is HMAC Salt
  const hmacSalt = buffer.slice(10, 18);
  // Bytes 18-33 is Initialization Vector.
  const iv = buffer.slice(18, 34);
  // Bytes 34-(n-32) is the actual encrypted data.
  const cipher = buffer.slice(34, buffer.length - 32);

  // Generate pbkdf2 encryption key using password and password salt
  const encryptionKey = crypto.pbkdf2Sync(
    password,
    passwordSalt,
    10000,
    32,
    'sha1',
  );

  console.log('╔═════════════════════════════════════════════'.green);
  console.log('║ RNCrypto version %d'.green, version);
  console.log('╠═════════════════════════════════════════════'.green);
  console.log('╟─ passwordSalt %s Bytes'.green, passwordSalt.length);
  console.log('╟─ hmacSalt %s Bytes'.green, hmacSalt.length);
  console.log('╟─ iv %s Bytes'.green, iv.length);
  console.log('╟─ encryptionKey %s Bytes'.green, encryptionKey.length);
  console.log('╟─ cipher %s Bytes'.green, cipher.length);
  console.log('╚═════════════════════════════════════════════'.green);

  // Create aes-256-cbc Decryption instance.
  const decipher = crypto.createDecipheriv('aes-256-cbc', encryptionKey, iv);

  try {
    // Decrypt the binary data in cipher
    const json = decipher.update(cipher, 'binary', 'utf-8') + decipher.final('utf-8');

    return JSON.parse(json);
  } catch (e) {
    console.error('[decrypt] ERROR: ', e);
    return null;
  }
};
