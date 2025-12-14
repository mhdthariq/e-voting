/**
 * JWT Token Utilities for BlockVote Authentication
 * Provides secure JWT token generation, verification, and management
 * Uses 'jose' library for Edge Runtime compatibility
 */

import { SignJWT, jwtVerify, decodeJwt } from "jose";
import { log } from "@/utils/logger";

// JWT configuration from .env file
const JWT_CONFIG = {
  secret: process.env.JWT_SECRET!,
  expiresIn: process.env.JWT_EXPIRES_IN!,
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN!,
  issuer: process.env.JWT_ISSUER!,
  audience: process.env.JWT_AUDIENCE!,
};

// Validate required environment variables on startup
if (!JWT_CONFIG.secret) {
  throw new Error("JWT_SECRET is required in .env file");
}
// Ensure secret is long enough (jose requires minimal lengths for HS256 etc)
const SECRET_KEY = new TextEncoder().encode(JWT_CONFIG.secret);

// JWT Payload interface
export interface JwtPayload {
  userId: string;
  email: string;
  username: string;
  role: "admin" | "organization" | "voter";
  organizationName?: string;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
  [key: string]: unknown; // Allow for other jose claims
}

// Refresh token payload (minimal for security)
export interface RefreshTokenPayload {
  userId: string;
  tokenVersion: number;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
  [key: string]: unknown;
}

// Token response interface
export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // in seconds
  tokenType: "Bearer";
}

// Token verification result
export interface TokenVerificationResult {
  isValid: boolean;
  payload?: JwtPayload;
  error?: string;
  expired?: boolean;
}

/**
 * JWT Token Manager Class
 */
class JwtManager {
  /**
   * Generate access token for authenticated user
   */
  async generateAccessToken(
    payload: Omit<JwtPayload, "iat" | "exp" | "iss" | "aud">,
  ): Promise<string> {
    try {
      const expiresIn = this.normalizeExpirationTime(JWT_CONFIG.expiresIn);
      const token = await new SignJWT({ ...payload })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setIssuer(JWT_CONFIG.issuer)
        .setAudience(JWT_CONFIG.audience)
        .setExpirationTime(expiresIn)
        .sign(SECRET_KEY);

      log.auth("Access token generated", {
        userId: payload.userId,
        role: payload.role,
      });
      return token;
    } catch (error) {
      log.exception(error as Error, "AUTH", {
        operation: "generateAccessToken",
      });
      throw new Error("Failed to generate access token");
    }
  }

  /**
   * Generate refresh token for user
   */
  async generateRefreshToken(
    userId: string,
    tokenVersion: number = 1,
  ): Promise<string> {
    try {
      const expiresIn = this.normalizeExpirationTime(
        JWT_CONFIG.refreshExpiresIn,
      );
      const token = await new SignJWT({ userId, tokenVersion })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setIssuer(JWT_CONFIG.issuer)
        .setAudience(JWT_CONFIG.audience)
        .setExpirationTime(expiresIn)
        .sign(SECRET_KEY);

      log.auth("Refresh token generated", { userId, tokenVersion });
      return token;
    } catch (error) {
      log.exception(error as Error, "AUTH", {
        operation: "generateRefreshToken",
      });
      throw new Error("Failed to generate refresh token");
    }
  }

  /**
   * Generate both access and refresh tokens
   */
  async generateTokenPair(
    userPayload: Omit<JwtPayload, "iat" | "exp" | "iss" | "aud">,
    tokenVersion: number = 1,
  ): Promise<TokenResponse> {
    const accessToken = await this.generateAccessToken(userPayload);
    const refreshToken = await this.generateRefreshToken(
      userPayload.userId as string,
      tokenVersion,
    );

    // Calculate expiration time in seconds
    const expiresIn = this.getExpirationTime(JWT_CONFIG.expiresIn);

    return {
      accessToken,
      refreshToken,
      expiresIn,
      tokenType: "Bearer",
    };
  }

  /**
   * Verify and decode access token
   */
  async verifyAccessToken(token: string): Promise<TokenVerificationResult> {
    try {
      const { payload } = await jwtVerify(token, SECRET_KEY, {
        issuer: JWT_CONFIG.issuer,
        audience: JWT_CONFIG.audience,
      });

      return {
        isValid: true,
        payload: payload as unknown as JwtPayload,
      };
    } catch (error) {
      const isExpired = (error as { code?: string }).code === "ERR_JWT_EXPIRED";

      log.security("Access token verification failed", {
        error: (error as Error).message,
        expired: isExpired,
      });

      return {
        isValid: false,
        error: (error as Error).message,
        expired: isExpired,
      };
    }
  }

  /**
   * Verify and decode refresh token
   */
  async verifyRefreshToken(token: string): Promise<{
    isValid: boolean;
    payload?: RefreshTokenPayload;
    error?: string;
  }> {
    try {
      const { payload } = await jwtVerify(token, SECRET_KEY, {
        issuer: JWT_CONFIG.issuer,
        audience: JWT_CONFIG.audience,
      });

      return {
        isValid: true,
        payload: payload as unknown as RefreshTokenPayload,
      };
    } catch (error) {
      log.security("Refresh token verification failed", {
        error: (error as Error).message,
      });

      return {
        isValid: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Extract token from Authorization header
   */
  extractTokenFromHeader(authorizationHeader?: string): string | null {
    if (!authorizationHeader) {
      return null;
    }

    const parts = authorizationHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return null;
    }

    return parts[1];
  }

  /**
   * Decode token without verification (for debugging/inspection)
   */
  decodeToken(token: string): JwtPayload | RefreshTokenPayload | null {
    try {
      return decodeJwt(token) as JwtPayload | RefreshTokenPayload;
    } catch (error) {
      log.exception(error as Error, "AUTH", { operation: "decodeToken" });
      return null;
    }
  }

  /**
   * Check if token is expired (without verification)
   */
  isTokenExpired(token: string): boolean {
    try {
      const decoded = decodeJwt(token);
      if (!decoded || !decoded.exp) {
        return true;
      }

      return Date.now() >= decoded.exp * 1000;
    } catch {
      return true;
    }
  }

  /**
   * Get remaining token lifetime in seconds
   */
  getTokenLifetime(token: string): number {
    try {
      const decoded = decodeJwt(token);
      if (!decoded || !decoded.exp) {
        return 0;
      }

      const remaining = decoded.exp - Math.floor(Date.now() / 1000);
      return Math.max(0, remaining);
    } catch {
      return 0;
    }
  }

  /**
   * Normalize expiration time to jose-compatible format
   */
  normalizeExpirationTime(expiresIn: string): string {
    // If already in correct format (e.g., "1h", "30d"), return as is
    if (/^\d+[smhd]$/.test(expiresIn)) {
      return expiresIn;
    }

    // If in seconds format (e.g., "3600"), convert to appropriate unit
    const seconds = parseInt(expiresIn, 10);
    if (!isNaN(seconds)) {
      if (seconds >= 86400 && seconds % 86400 === 0) {
        return `${seconds / 86400}d`;
      }
      if (seconds >= 3600 && seconds % 3600 === 0) {
        return `${seconds / 3600}h`;
      }
      if (seconds >= 60 && seconds % 60 === 0) {
        return `${seconds / 60}m`;
      }
      return `${seconds}s`;
    }

    // Default to 7 days
    return "7d";
  }

  /**
   * Convert expiration string to seconds
   */
  getExpirationTime(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      // Try parsing as direct seconds
      const seconds = parseInt(expiresIn, 10);
      if (!isNaN(seconds)) {
        return seconds;
      }
      return 604800; // Default to 7 days in seconds
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case "s":
        return value;
      case "m":
        return value * 60;
      case "h":
        return value * 60 * 60;
      case "d":
        return value * 24 * 60 * 60;
      default:
        return 604800;
    }
  }

  /**
   * Validate JWT configuration
   */
  validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!JWT_CONFIG.secret) {
      errors.push("JWT_SECRET must be set in .env file");
    }

    if (JWT_CONFIG.secret && JWT_CONFIG.secret.length < 32) {
      errors.push("JWT_SECRET should be at least 32 characters long");
    }

    if (!JWT_CONFIG.expiresIn.match(/^\d+[smhd]$/)) {
      errors.push("JWT_EXPIRES_IN must be in format: number + unit (s/m/h/d)");
    }

    if (!JWT_CONFIG.refreshExpiresIn.match(/^\d+[smhd]$/)) {
      errors.push(
        "JWT_REFRESH_EXPIRES_IN must be in format: number + unit (s/m/h/d)",
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

// Create singleton instance
const jwtManager = new JwtManager();

// Export convenience functions
export const auth = {
  /**
   * Generate token pair for user login
   */
  login: (
    userPayload: Omit<JwtPayload, "iat" | "exp" | "iss" | "aud">,
    tokenVersion?: number,
  ) => jwtManager.generateTokenPair(userPayload, tokenVersion),

  /**
   * Verify access token
   */
  verifyToken: (token: string) => jwtManager.verifyAccessToken(token),

  /**
   * Verify refresh token
   */
  verifyRefreshToken: (token: string) => jwtManager.verifyRefreshToken(token),

  /**
   * Extract token from request header
   */
  extractToken: (authHeader?: string) =>
    jwtManager.extractTokenFromHeader(authHeader),

  /**
   * Generate new access token from refresh token
   */
  refresh: async (
    refreshToken: string,
    getUserById: (id: number) => Promise<{
      id: number;
      email: string;
      username: string;
      role: string;
      organizationName?: string | null;
    } | null>,
  ) => {
    const refreshResult = await jwtManager.verifyRefreshToken(refreshToken);

    if (!refreshResult.isValid || !refreshResult.payload) {
      throw new Error("Invalid refresh token");
    }

    // Get user data to generate new access token
    const user = await getUserById(parseInt(refreshResult.payload.userId));
    if (!user) {
      throw new Error("User not found");
    }

    // Generate new access token
    const accessToken = await jwtManager.generateAccessToken({
      userId: user.id.toString(),
      email: user.email,
      username: user.username,
      role: user.role as "admin" | "organization" | "voter",
      organizationName: user.organizationName || undefined,
    });

    return {
      accessToken,
      expiresIn: jwtManager.getExpirationTime(JWT_CONFIG.expiresIn),
      tokenType: "Bearer" as const,
    };
  },

  /**
   * Check if token is expired
   */
  isExpired: (token: string) => jwtManager.isTokenExpired(token),

  /**
   * Get token remaining lifetime
   */
  getLifetime: (token: string) => jwtManager.getTokenLifetime(token),

  /**
   * Validate JWT configuration
   */
  validateConfig: () => jwtManager.validateConfig(),
};

// Export utilities
export { jwtManager, JWT_CONFIG };

// Default export
export default auth;
