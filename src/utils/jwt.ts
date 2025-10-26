// utils/jwt.ts
import jwt from "jsonwebtoken";

const SECRET_KEY = "process.env.JWT_SECRET"; 

if (!SECRET_KEY) {
  throw new Error("❌ Missing JWT_SECRET in environment variables");
}

/**
 * Securely generates a JWT using jsonwebtoken
 * @param payload - Object payload to sign
 * @returns A signed JWT string
 */
export function generateToken(payload: object): string {
  return jwt.sign(payload, SECRET_KEY, { expiresIn: "1h" });
}

/**
 * Verifies and decodes a JWT
 * @param token - JWT string
 * @returns Decoded payload or null if invalid
 */
export function verifyToken(token: string): object | null {
  try {
    return jwt.verify(token, SECRET_KEY) as object;
  } catch {
    return null;
  }
}