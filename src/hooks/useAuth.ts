import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, ApiResponse } from "@/lib/api-client";
import { z } from "zod";

// Zod Schemas for Validation
const loginSchema = z.object({
  identifier: z.string().min(1, "Username/Email is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginCredentials = z.infer<typeof loginSchema>;

export function useLogin() {
  return useMutation({
    mutationFn: async (creds: LoginCredentials) => {
      // Validate first
      loginSchema.parse(creds);
      return apiClient<ApiResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(creds),
      });
    },
  });
}

// TODO: Add useLogout, useSession once we have consistent endpoints
