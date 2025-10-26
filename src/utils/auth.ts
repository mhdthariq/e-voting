// src/utils/auth.ts

export interface LoginResult {
  success: boolean;
  message?: string;
  user?: UserInfo | null;
}

export interface UserInfo {
  id: string;
  email: string;
  username: string;
  role: "admin" | "organization" | "voter";
  status: string;
  createdAt: string;
  updatedAt?: string;
  permissions?: string[];
}

/**
 * Login - Authenticate user via backend
 * Backend handles JWT creation + HttpOnly cookies
 */
export async function login(identifier: string, password: string): Promise<LoginResult> {
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // ⬅ allows backend to set cookies
      body: JSON.stringify({ identifier, password }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      return { success: false, message: data.error || "Invalid credentials" };
    }

    // Optionally fetch the latest user info after login
    const user = await getCurrentUser();

    if (user) localStorage.setItem("user", JSON.stringify(user));

    return {
      success: true,
      message: data.message || "Login successful",
      user: user ?? null,
    };
  } catch (err) {
    console.error("Login error:", err);
    return { success: false, message: "Network or server error" };
  }
}

/**
 * Get current authenticated user via /api/auth/me
 */
export async function getCurrentUser(): Promise<UserInfo | null> {
  try {
    const res = await fetch("/api/auth/me", {
      method: "GET",
      credentials: "include", // sends cookies
    });

    if (!res.ok) return null;

    const data = await res.json();

    if (!data.success || !data.user) return null;

    return data.user;
  } catch (err) {
    console.error("Get current user failed:", err);
    return null;
  }
}

/**
 * Logout - calls backend to clear cookies and local storage
 */
export async function logout(): Promise<void> {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
  } catch (err) {
    console.error("Logout failed:", err);
  } finally {
    localStorage.removeItem("user");
  }
}

/**
 * Check if user is authenticated (based on /me or cached data)
 */
export async function isAuthenticated(): Promise<boolean> {
  const cached = localStorage.getItem("user");
  if (cached) return true;

  const user = await getCurrentUser();
  if (user) {
    localStorage.setItem("user", JSON.stringify(user));
    return true;
  }

  return false;
}
