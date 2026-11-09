import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class WhatsAppEncryptionService {
  private readonly algorithm = 'aes-256-cbc';
  private readonly secretKey: Buffer;

  constructor() {
    const secret = process.env.JWT_SECRET || 'dev-jwt-secret-key-at-least-32-characters-long-matabai';
    // Derive exactly 32 bytes key using SHA-256
    this.secretKey = crypto.createHash('sha256').update(secret).digest();
  }

  /**
   * Encrypts plaintext access token into iv:hex_ciphertext
   */
  encrypt(text: string): string {
    if (!text) return '';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.secretKey, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypts iv:hex_ciphertext back to plaintext token
   */
  decrypt(cipherText: string): string {
    if (!cipherText) return '';
    try {
      const parts = cipherText.split(':');
      if (parts.length !== 2 || !parts[0] || !parts[1]) {
        // Not encrypted or legacy format; return safely
        return cipherText;
      }
      const ivHex = parts[0];
      const encryptedHex = parts[1];
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv(this.algorithm, this.secretKey, iv);
      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch {
      // In case of invalid key/corrupted token, return as-is
      return cipherText;
    }
  }
}
