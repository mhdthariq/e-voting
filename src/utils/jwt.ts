// utils/jwt.ts
import jwt from "jsonwebtoken";

const SECRET_KEY = "blockvote_secret_key"; // (only for demo)

// Encode to Base64 (fake JWT)
export function generateToken(payload: object) {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify({ ...payload, exp: Date.now() + 60 * 60 * 1000 })); // 1 hour expiry
  const signature = btoa("blockvote_secret_key");
  return `${header}.${body}.${signature}`;
}

// Verify the fake token
export function verifyToken(token: string) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp < Date.now()) return null; // expired
    return payload;
  } catch (err) {
    return null;
  }
}
