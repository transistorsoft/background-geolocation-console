import crypto from "crypto";

export default class RNCrypto {

	static isEncryptedRequest(req) {
		let contentType = req.get('Content-Type');
    return (contentType && (contentType.indexOf('application/octet-stream') === 0));
	}

	/**
	* Decrypt base64-encoded, RNCrypto encrypted data
	* @param {String} data Base64-encoded text.
	* @return {String} decrypted JSON
	*/
	static decrypt (data) {

		// Decryption password.  Same as used by BackgroundGeolocation SDK to encrypt.
		let password = process.env.ENCRYPTION_PASSWORD;


		// Decode base64 data from HTTP body.
		let buffer = Buffer.from(data, 'base64');
		// Byte 0 is version of encryption spec (3)
		let version = buffer[0];
		if (version != 3) {
			console.log('RNCrypto error:  Unknown version %s'.red, version);
			return null;
		}
		// Byte 1 is options (1 = password encryption)
		let options = buffer[1];
		// Bytes 2-9 is Password Salt
		let passwordSalt = buffer.slice(2, 10);
		// Bytes 10-17 is HMAC Salt
		let hmacSalt = buffer.slice(10, 18);
		// Bytes 18-33 is Initialization Vector.
		let iv = buffer.slice(18, 34);
		// Bytes 34-(n-32) is the actual encrypted data.
		let cipher = buffer.slice(34, buffer.length-32);

		// Generate pbkdf2 encryption key using password and password salt
		let encryptionKey = crypto.pbkdf2Sync(password, passwordSalt, 10000, 32, 'sha1');

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
		var decipher = crypto.createDecipheriv('aes-256-cbc', encryptionKey, iv);

		try {
		  // Decrypt the binary data in cipher
		  var json = decipher.update(cipher, 'binary', 'utf-8');
		  json += decipher.final('utf-8');
		  var data = JSON.parse(json);
		  return Array.isArray(data) ? data : [data];
		} catch(e) {
		  console.error('[decrypt] ERROR: ', e);
		  return null;
		}
	}
}
