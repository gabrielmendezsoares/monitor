import crypto from 'crypto';

/**
 * ## encryptToAes256Cbc
 * 
 * Encrypts plaintext using AES-256-CBC.
 *
 * @description
 * Performs symmetric encryption using the AES-256-CBC algorithm.
 * CBC mode requires a 16-byte initialization vector (IV) to ensure that
 * identical plaintext inputs produce different ciphertext outputs.
 *
 * The encryption process:
 * 
 * 1. Creates an AES-256-CBC cipher using the provided 256-bit key and IV.
 * 2. Encrypts the input data.
 * 3. Returns the encrypted result as a hexadecimal string.
 *
 * Each encryption should use a unique, random IV for security.
 *
 * @param encryptionKey - A 256-bit (32-byte) key as a 64-character hex string.
 * @param ivString - A 128-bit (16-byte) IV as a 32-character hex string.
 * @param data - Plaintext string to encrypt.
 *
 * @returns
 * Encrypted data as a hex string.
 *
 * @throws
 * If the key, IV, or data is invalid, or encryption fails.
 */
export const encryptToAes256Cbc = (
  encryptionKey: string,
  ivString: string,
  data: string
): string => {
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(encryptionKey, 'hex'),
    Buffer.from(ivString, 'hex')
  );
  
  return Buffer.concat(
    [
      cipher.update(data),
      cipher.final()
    ]
  ).toString('hex');
};

/**
 * ## decryptFromAes256Cbc
 * 
 * Decrypts AES-256-CBC encrypted hex data back to plaintext.
 *
 * @description
 * Reverses encryption performed by `encryptToAes256Cbc`, restoring the
 * original plaintext from hex-encoded ciphertext. Requires the same
 * encryption key and IV used during encryption.
 *
 * Note: This is unauthenticated decryption — data integrity is not verified.
 * Use authenticated encryption modes (e.g., AES-GCM) for tamper detection.
 *
 * @param encryptionKey - A 256-bit (32-byte) key as a 64-character hex string.
 * @param ivString - A 128-bit (16-byte) IV as a 32-character hex string.
 * @param encryptedData - Encrypted data as a hex string.
 *
 * @returns
 * Decrypted plaintext string.
 *
 * @throws
 * If the key, IV, or ciphertext is invalid, or decryption fails.
 */
export const decryptFromAes256Cbc = (
  encryptionKey: string, 
  ivString: string, 
  encryptedData: string
): string => {
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(encryptionKey, 'hex'),
    Buffer.from(ivString, 'hex')
  );
  
  return Buffer.concat(
    [
      decipher.update(Buffer.from(encryptedData, 'hex')),
      decipher.final()
    ]
  ).toString();
};
