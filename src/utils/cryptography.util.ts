import crypto from 'crypto';

/**
 * ## encryptToAes256Cbc
 * 
 * Encrypts data using AES-256-CBC algorithm.
 * 
 * @description Performs symmetric encryption using the AES algorithm with a 256-bit key
 * in Cipher Block Chaining (CBC) mode. CBC mode requires an initialization vector (IV)
 * to ensure that identical plaintext blocks encrypt to different ciphertext blocks.
 * 
 * The function:
 * 
 * 1. Creates a cipher using the provided key and IV
 * 2. Encrypts the input data
 * 3. Returns the ciphertext as a hexadecimal string
 * 
 * For maximum security, each encryption operation should use a unique, random IV.
 * 
 * @param encryptionKey - 32-byte encryption key as a 64-character hex string.
 * @param ivString - 16-byte initialization vector as a 32-character hex string.
 * @param data - Plaintext string to encrypt.
 * 
 * @returns Encrypted data as a hex string.
 * 
 * @throws If parameters are invalid or encryption fails.
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
 * Decrypts AES-256-CBC encrypted data.
 * 
 * @description Decrypts data that was previously encrypted with the encryptToAes256Cbc
 * function. This function performs the reverse operation, converting encrypted hexadecimal
 * data back to the original plaintext.
 * 
 * The function:
 * 
 * 1. Creates a decipher using the provided key and IV
 * 2. Decrypts the input data
 * 3. Returns the original plaintext string
 * 
 * The same key and IV used for encryption must be provided for successful decryption.
 * 
 * Note: This implementation does not include authentication. Consider using authenticated
 * encryption modes for sensitive data requiring integrity verification.
 * 
 * @param encryptionKey - 32-byte encryption key as a 64-character hex string.
 * @param ivString - 16-byte initialization vector as a 32-character hex string.
 * @param encryptedData - Encrypted data as a hex string.
 * 
 * @returns Original plaintext string.
 * @throws If parameters are invalid or decryption fails.
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
