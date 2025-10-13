// src/utils/auth.ts
import bcrypt from "bcryptjs";
import { generateToken, verifyToken } from "./jwt";

interface LoginResult {
  success: boolean;
  message?: string;
  token?: string;
}

const USERS = [
  {
    username: "voter1",
    passwordHash: "$2b$10$YqmB8M9gnTElFO0tRiU0P.4fdkZhoKHfMelzvjhax6PL36CIRmipy", // "voter123"
  },
];

export async function login(username: string, password: string): Promise<LoginResult> {
  const user = USERS.find((u) => u.username === username);
  if (!user) return { success: false, message: "User not found" };

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return { success: false, message: "Invalid password" };

  // Generate a token
  const token = generateToken({ username });
  sessionStorage.setItem("token", token);

  return { success: true, token };
}

// ✅ Logout
export function logout() {
  sessionStorage.removeItem("token");
}

// ✅ Check if user still logged in
export function getCurrentUser() {
  const token = sessionStorage.getItem("token");
  if (!token) return null;
  return verifyToken(token);
}
