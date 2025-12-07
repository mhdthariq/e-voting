// Removed unused toast import

/**
 * Standard API Response Interface
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  details?: any;
}

/**
 * Custom Error Class for API Rejections
 */
export class ApiError extends Error {
  public details: any;
  public status: number;

  constructor(message: string, status: number, details?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

/**
 * API Fetch Wrapper
 * Handles Authorization headers, JSON parsing, and Error normalization.
 */
export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  
  // Auto-inject token from localStorage (client-side only check)
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("accessToken");
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  let data: any;
  try {
    data = await response.json();
  } catch (e) {
    // If not JSON, it's likely a 500 or auth redirect
    throw new ApiError("Invalid response format", response.status);
  }

  if (!response.ok) {
    throw new ApiError(data.message || data.error || "Request failed", response.status, data.details);
  }

  return data as T; // Expecting the full ApiResponse<T> or just T? Usually T.
  // Wait, our backend returns { success, data, message }.
  // Let's assume the caller expects the full wrapped object, or we unwrap it?
  // Our backend returns { success: true, user: ... } for login.
  // It's inconsistent. Normalized wrapper suggests returning `data` as T.
  
  // For this project, let's return the RAW JSON so the calling hook can decide, 
  // but we THROW on !ok.
  return data;
}
