"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

interface RegistrationFormData {
  organizationName: string;
  contactName: string;
  contactEmail: string;
  username: string;
  password: string;
  confirmPassword: string;
  description: string;
  website: string;
  phone: string;
  address: string;
}

interface RegistrationFormProps {
  onSuccess?: (data: RegistrationResponse) => void;
  redirectPath?: string;
}

interface RegistrationResponse {
  success: boolean;
  message?: string;
  registrationId?: string;
}

export default function RegistrationForm({
  onSuccess,
  redirectPath,
}: RegistrationFormProps) {
  const [formData, setFormData] = useState<RegistrationFormData>({
    organizationName: "",
    contactName: "",
    contactEmail: "",
    username: "",
    password: "",
    confirmPassword: "",
    description: "",
    website: "",
    phone: "",
    address: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const router = useRouter();

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear validation error when user starts typing
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
    setError(null);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Required fields
    if (!formData.organizationName.trim()) {
      errors.organizationName = "Organization name is required";
    }
    if (!formData.contactName.trim()) {
      errors.contactName = "Contact name is required";
    }
    if (!formData.contactEmail.trim()) {
      errors.contactEmail = "Contact email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.contactEmail)) {
      errors.contactEmail = "Please enter a valid email address";
    }
    if (!formData.username.trim()) {
      errors.username = "Username is required";
    } else if (formData.username.length < 3) {
      errors.username = "Username must be at least 3 characters";
    }
    if (!formData.password) {
      errors.password = "Password is required";
    } else if (formData.password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.password =
        "Password must contain at least one uppercase letter, one lowercase letter, and one number";
    }
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }
    if (!formData.description.trim()) {
      errors.description = "Organization description is required";
    }

    // Optional field validation
    if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
      errors.website =
        "Please enter a valid website URL (including http:// or https://)";
    }
    if (formData.phone && !/^\+?[\d\s\-\(\)]+$/.test(formData.phone)) {
      errors.phone = "Please enter a valid phone number";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data: RegistrationResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed");
      }

      if (data.success) {
        setSuccess(true);
        if (onSuccess) {
          onSuccess(data);
        }
        // Redirect after 3 seconds or immediately if redirectPath provided
        setTimeout(
          () => {
            router.push(redirectPath || "/auth/login");
          },
          redirectPath ? 0 : 3000,
        );
      } else {
        throw new Error(data.message || "Registration failed");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Registration failed";
      setError(errorMessage);
      console.error("Registration error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Registration Submitted!
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Your organization registration has been submitted successfully.
            </p>
            <div className="mt-4 bg-green-50 border border-green-200 rounded-md p-4">
              <div className="text-sm text-green-700">
                <p className="font-medium">What happens next?</p>
                <ul className="mt-2 list-disc list-inside space-y-1">
                  <li>Our admin team will review your registration</li>
                  <li>
                    You&apos;ll receive an email notification upon approval
                  </li>
                  <li>
                    Once approved, you can log in and start creating elections
                  </li>
                </ul>
              </div>
            </div>
            <div className="mt-6">
              <button
                onClick={() => router.push("/auth/login")}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
            <svg
              className="h-6 w-6 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 8h1m-1-4h1m4 4h1m-1-4h1"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Register Your Organization
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Join BlockVote to create secure, transparent elections
          </p>
        </div>

        {/* Registration Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
            <div className="grid grid-cols-1 gap-6">
              {/* Organization Information */}
              <div className="col-span-1">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Organization Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label
                      htmlFor="organizationName"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Organization Name *
                    </label>
                    <input
                      id="organizationName"
                      name="organizationName"
                      type="text"
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Your Organization Name"
                      value={formData.organizationName}
                      onChange={handleInputChange}
                      disabled={isLoading}
                    />
                    {validationErrors.organizationName && (
                      <p className="mt-1 text-sm text-red-600">
                        {validationErrors.organizationName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="username"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Username *
                    </label>
                    <input
                      id="username"
                      name="username"
                      type="text"
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Choose a unique username"
                      value={formData.username}
                      onChange={handleInputChange}
                      disabled={isLoading}
                    />
                    {validationErrors.username && (
                      <p className="mt-1 text-sm text-red-600">
                        {validationErrors.username}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-6">
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Organization Description *
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={3}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Describe your organization and its purpose..."
                    value={formData.description}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                  {validationErrors.description && (
                    <p className="mt-1 text-sm text-red-600">
                      {validationErrors.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Contact Information */}
              <div className="col-span-1">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Contact Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label
                      htmlFor="contactName"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Contact Person Name *
                    </label>
                    <input
                      id="contactName"
                      name="contactName"
                      type="text"
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Primary contact person"
                      value={formData.contactName}
                      onChange={handleInputChange}
                      disabled={isLoading}
                    />
                    {validationErrors.contactName && (
                      <p className="mt-1 text-sm text-red-600">
                        {validationErrors.contactName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="contactEmail"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Contact Email *
                    </label>
                    <input
                      id="contactEmail"
                      name="contactEmail"
                      type="email"
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="contact@organization.com"
                      value={formData.contactEmail}
                      onChange={handleInputChange}
                      disabled={isLoading}
                    />
                    {validationErrors.contactEmail && (
                      <p className="mt-1 text-sm text-red-600">
                        {validationErrors.contactEmail}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <div>
                    <label
                      htmlFor="phone"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Phone Number
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="+1 (555) 123-4567"
                      value={formData.phone}
                      onChange={handleInputChange}
                      disabled={isLoading}
                    />
                    {validationErrors.phone && (
                      <p className="mt-1 text-sm text-red-600">
                        {validationErrors.phone}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="website"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Website
                    </label>
                    <input
                      id="website"
                      name="website"
                      type="url"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="https://www.organization.com"
                      value={formData.website}
                      onChange={handleInputChange}
                      disabled={isLoading}
                    />
                    {validationErrors.website && (
                      <p className="mt-1 text-sm text-red-600">
                        {validationErrors.website}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-6">
                  <label
                    htmlFor="address"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Address
                  </label>
                  <textarea
                    id="address"
                    name="address"
                    rows={2}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Organization address..."
                    value={formData.address}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Account Security */}
              <div className="col-span-1">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Account Security
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="relative">
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Password *
                    </label>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      className="mt-1 block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Strong password (8+ characters)"
                      value={formData.password}
                      onChange={handleInputChange}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 top-6 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <svg
                          className="h-4 w-4 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="h-4 w-4 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.543 7-1.275 4.057-5.065 7-9.543 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      )}
                    </button>
                    {validationErrors.password && (
                      <p className="mt-1 text-sm text-red-600">
                        {validationErrors.password}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Confirm Password *
                    </label>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      disabled={isLoading}
                    />
                    {validationErrors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-600">
                        {validationErrors.confirmPassword}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Registration Failed
                  </h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                {isLoading ? (
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                ) : (
                  <svg
                    className="h-5 w-5 text-blue-500 group-hover:text-blue-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </span>
              {isLoading
                ? "Submitting Registration..."
                : "Register Organization"}
            </button>
          </div>

          {/* Additional Links */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <a
                href="/auth/login"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Sign in here
              </a>
            </p>
          </div>
        </form>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            By registering, you agree to our terms of service and privacy
            policy.
          </p>
        </div>
      </div>
    </div>
  );
}
