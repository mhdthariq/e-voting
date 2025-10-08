import crypto from "crypto";

/**
 * Cryptographic utilities for BlockVote blockchain security
 * Implements double SHA-256, digital signatures, and canonical serialization
 * to prevent hash injection, collision, and length extension attacks
 */

export class CryptoUtils {
  /**
   * Canonical serialization to ensure deterministic hashing
   * Prevents hash injection by maintaining consistent field order
   */
  static canonicalSerializeBlock(block: {
    index: number;
    previousHash: string;
    merkleRoot: string;
    timestamp: Date;
    electionId: number;
    nonce: number;
  }): Buffer {
    const data = [
      block.index.toString(),
      block.previousHash,
      block.merkleRoot,
      block.timestamp.toISOString(),
      block.electionId.toString(),
      block.nonce.toString(),
    ].join("|");

    return Buffer.from(data, "utf8");
  }

  /**
   * Canonical serialization for vote transactions
   */
  static canonicalSerializeVote(vote: {
    voteId: string;
    electionId: number;
    voterPublicKey: string;
    candidateId: number;
    timestamp: Date;
  }): Buffer {
    const data = [
      vote.voteId,
      vote.electionId.toString(),
      vote.voterPublicKey,
      vote.candidateId.toString(),
      vote.timestamp.toISOString(),
    ].join("|");

    return Buffer.from(data, "utf8");
  }

  /**
   * Double SHA-256 hashing to prevent length extension attacks
   * First hash prevents manipulation, second hash provides additional security
   */
  static doubleSha256(buffer: Buffer): string {
    const firstHash = crypto.createHash("sha256").update(buffer).digest();
    const secondHash = crypto
      .createHash("sha256")
      .update(firstHash)
      .digest("hex");
    return secondHash;
  }

  /**
   * Single SHA-256 for non-critical operations
   */
  static sha256(data: string | Buffer): string {
    return crypto.createHash("sha256").update(data).digest("hex");
  }

  /**
   * Generate cryptographic key pair for digital signatures
   * Using RSA for better Node.js compatibility
   */
  static generateKeyPair(): { publicKey: string; privateKey: string } {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: "spki",
        format: "pem",
      },
      privateKeyEncoding: {
        type: "pkcs8",
        format: "pem",
      },
    });

    return { publicKey, privateKey };
  }

  /**
   * Sign data using RSA private key
   * Creates tamper-proof digital signature
   */
  static signData(data: Buffer, privateKeyPem: string): string {
    const sign = crypto.createSign("RSA-SHA256");
    sign.update(data);
    sign.end();

    const signature = sign.sign(privateKeyPem);
    return signature.toString("hex");
  }

  /**
   * Verify digital signature using RSA public key
   * Ensures data integrity and authenticity
   */
  static verifySignature(
    data: Buffer,
    signature: string,
    publicKeyPem: string,
  ): boolean {
    try {
      const verify = crypto.createVerify("RSA-SHA256");
      verify.update(data);
      verify.end();

      const signatureBuffer = Buffer.from(signature, "hex");
      return verify.verify(publicKeyPem, signatureBuffer);
    } catch (error) {
      console.error("Signature verification failed:", error);
      return false;
    }
  }

  /**
   * Hash vote transaction for blockchain storage
   */
  static hashVote(vote: {
    voteId: string;
    electionId: number;
    voterPublicKey: string;
    candidateId: number;
    timestamp: Date;
  }): string {
    const serialized = this.canonicalSerializeVote(vote);
    return this.doubleSha256(serialized);
  }

  /**
   * Hash block for blockchain storage
   */
  static hashBlock(block: {
    index: number;
    previousHash: string;
    merkleRoot: string;
    timestamp: Date;
    electionId: number;
    nonce: number;
  }): string {
    const serialized = this.canonicalSerializeBlock(block);
    return this.doubleSha256(serialized);
  }

  /**
   * Generate cryptographically secure random string
   * Used for voter credentials and vote IDs
   */
  static generateSecureRandom(length: number = 32): string {
    return crypto.randomBytes(length).toString("hex");
  }

  /**
   * Generate random password for voters
   */
  static generatePassword(length: number = 12): string {
    const charset =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let password = "";

    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, charset.length);
      password += charset[randomIndex];
    }

    return password;
  }

  /**
   * Generate unique vote ID
   */
  static generateVoteId(): string {
    const timestamp = Date.now().toString();
    const random = this.generateSecureRandom(16);
    return this.sha256(timestamp + random);
  }

  /**
   * HMAC-SHA256 for additional security where needed
   */
  static hmacSha256(data: string, key: string): string {
    return crypto.createHmac("sha256", key).update(data).digest("hex");
  }

  /**
   * Encrypt sensitive data (like private keys)
   */
  static encrypt(text: string, password: string): string {
    const algorithm = "aes-256-cbc";
    const key = crypto.scryptSync(password, "salt", 32);
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    return iv.toString("hex") + ":" + encrypted;
  }

  /**
   * Decrypt sensitive data
   */
  static decrypt(encryptedText: string, password: string): string {
    const algorithm = "aes-256-cbc";
    const key = crypto.scryptSync(password, "salt", 32);

    const [ivHex, encrypted] = encryptedText.split(":");
    const iv = Buffer.from(ivHex, "hex");

    const decipher = crypto.createDecipheriv(algorithm, key, iv);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }

  /**
   * Validate hash format and strength
   */
  static isValidHash(hash: string): boolean {
    // SHA-256 produces 64 character hex string
    return /^[a-f0-9]{64}$/i.test(hash);
  }

  /**
   * Check if hash meets proof-of-work difficulty requirement
   */
  static meetsProofOfWork(hash: string, difficulty: number): boolean {
    const target = "0".repeat(difficulty);
    return hash.startsWith(target);
  }

  /**
   * Time-constant string comparison to prevent timing attacks
   */
  static constantTimeEquals(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Generate deterministic hash for consistent ordering
   */
  static deterministicHash(items: string[]): string {
    // Sort items for consistent ordering
    const sortedItems = [...items].sort();
    const combined = sortedItems.join("");
    return this.sha256(combined);
  }

  /**
   * Validate RSA public key format
   */
  static isValidPublicKey(publicKeyPem: string): boolean {
    try {
      // Try to create a key object to validate format
      crypto.createPublicKey(publicKeyPem);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate RSA private key format
   */
  static isValidPrivateKey(privateKeyPem: string): boolean {
    try {
      // Try to create a key object to validate format
      crypto.createPrivateKey(privateKeyPem);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Blockchain-specific security validation
 */
export class BlockchainSecurity {
  /**
   * Validate block hash integrity
   */
  static validateBlockHash(block: {
    index: number;
    previousHash: string;
    merkleRoot: string;
    timestamp: Date;
    electionId: number;
    nonce: number;
    hash: string;
  }): boolean {
    const expectedHash = CryptoUtils.hashBlock(block);
    return CryptoUtils.constantTimeEquals(block.hash, expectedHash);
  }

  /**
   * Validate vote signature
   */
  static validateVoteSignature(vote: {
    voteId: string;
    electionId: number;
    voterPublicKey: string;
    candidateId: number;
    timestamp: Date;
    signature: string;
  }): boolean {
    const voteData = CryptoUtils.canonicalSerializeVote(vote);
    return CryptoUtils.verifySignature(
      voteData,
      vote.signature,
      vote.voterPublicKey,
    );
  }

  /**
   * Check for potential hash injection attempts
   */
  static detectHashInjection(hash: string, originalData: Buffer): boolean {
    const recomputedHash = CryptoUtils.doubleSha256(originalData);
    return !CryptoUtils.constantTimeEquals(hash, recomputedHash);
  }

  /**
   * Validate proof-of-work
   */
  static validateProofOfWork(hash: string, difficulty: number): boolean {
    return (
      CryptoUtils.isValidHash(hash) &&
      CryptoUtils.meetsProofOfWork(hash, difficulty)
    );
  }
}
