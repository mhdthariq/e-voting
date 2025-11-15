'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { uploadProfileImage, deleteProfileImage } from '@/lib/supabase/storage';
import { optimizeImage, formatFileSize } from '@/lib/utils/imageOptimizer';
import { isSupabaseConfigured } from '@/lib/supabase/client';

interface User {
  id: number;
  username: string;
  email: string;
  fullName?: string;
  role: 'ADMIN' | 'ORGANIZATION' | 'VOTER';
  profileImage?: string;
  profileImagePath?: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [supabaseEnabled, setSupabaseEnabled] = useState(false);

  const [profileData, setProfileData] = useState({
    username: '',
    fullName: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    setSupabaseEnabled(isSupabaseConfigured());
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setProfileData({
          username: data.user.username || '',
          fullName: data.user.fullName || '',
        });
        setPreview(data.user.profileImage);
      } else {
        router.push('/auth/login');
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      router.push('/auth/login');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!supabaseEnabled) {
      setMessage({
        type: 'error',
        text: 'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env file.',
      });
      return;
    }

    setUploadProgress(true);
    setMessage(null);

    try {
      // Optimize image to WebP
      const optimized = await optimizeImage({ 
        file,
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.8
      });

      console.log(`Image optimized: ${formatFileSize(optimized.originalSize)} → ${formatFileSize(optimized.optimizedSize)} (${optimized.compressionRatio.toFixed(1)}% smaller)`);

      // Delete old image if exists
      if (user?.profileImagePath) {
        await deleteProfileImage(user.profileImagePath);
      }

      // Upload to Supabase
      const result = await uploadProfileImage({
        userId: user!.id,
        file: optimized.file,
      });

      if (result.success) {
        // Update user profile in database
        const response = await fetch('/api/user/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profileImage: result.url,
            profileImagePath: result.path,
          }),
        });

        if (response.ok) {
          setPreview(result.url);
          setUser(prev => prev ? { ...prev, profileImage: result.url, profileImagePath: result.path } : null);
          setMessage({
            type: 'success',
            text: 'Profile photo updated successfully!',
          });
        } else {
          throw new Error('Failed to update profile in database');
        }
      } else {
        throw new Error(result.error || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to upload image',
      });
    } finally {
      setUploadProgress(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: profileData.username,
          fullName: profileData.fullName,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: 'Profile updated successfully!',
        });
        setUser(prev => prev ? { ...prev, ...profileData } : null);
      } else {
        throw new Error(data.message || 'Failed to update profile');
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to update profile',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({
        type: 'error',
        text: 'New passwords do not match',
      });
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setMessage({
        type: 'error',
        text: 'Password must be at least 8 characters long',
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/user/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: 'Password changed successfully!',
        });
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        throw new Error(data.message || 'Failed to change password');
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to change password',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const isOrganization = user.role === 'ORGANIZATION';

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage your profile, security, and preferences
            </p>
          </div>
          <button
            onClick={() => router.back()}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            ← Back
          </button>
        </div>

        {/* Messages */}
        {message && (
          <div
            className={`rounded-md p-4 ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            <p
              className={`text-sm ${
                message.type === 'success' ? 'text-green-800' : 'text-red-800'
              }`}
            >
              {message.text}
            </p>
          </div>
        )}

        {/* Profile Photo */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            {isOrganization ? 'Organization Logo' : 'Profile Photo'}
          </h2>
          <div className="flex items-center space-x-6">
            <div className="h-24 w-24 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
              {preview ? (
                <img
                  src={preview}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-3xl font-bold text-gray-400">
                  {user.fullName?.charAt(0) || user.username?.charAt(0) || '?'}
                </div>
              )}
            </div>
            <div className="flex-1">
              <label
                className={`cursor-pointer inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 ${
                  uploadProgress || !supabaseEnabled ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {uploadProgress ? 'Uploading...' : 'Upload Photo'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadProgress || !supabaseEnabled}
                  className="hidden"
                />
              </label>
              <p className="mt-2 text-sm text-gray-500">
                JPG, PNG, GIF or WebP. Max 5MB. Auto-converted to WebP.
              </p>
              {!supabaseEnabled && (
                <p className="mt-1 text-sm text-amber-600">
                  ⚠️ Supabase not configured. Image upload disabled.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Profile Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            {isOrganization ? 'Organization Information' : 'Profile Information'}
          </h2>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Username {isOrganization && <span className="text-gray-500">(locked)</span>}
              </label>
              <input
                type="text"
                value={profileData.username}
                onChange={(e) =>
                  setProfileData({ ...profileData, username: e.target.value })
                }
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                disabled={isOrganization}
                required
              />
              {isOrganization && (
                <p className="mt-1 text-sm text-gray-500">
                  Organizations cannot change their username for security reasons
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                {isOrganization ? 'Organization Name' : 'Full Name'}
              </label>
              <input
                type="text"
                value={profileData.fullName}
                onChange={(e) =>
                  setProfileData({ ...profileData, fullName: e.target.value })
                }
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email (read-only)</label>
              <input
                type="email"
                value={user.email}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                disabled
              />
              <p className="mt-1 text-sm text-gray-500">
                Email cannot be changed. Contact support if needed.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Role (read-only)</label>
              <input
                type="text"
                value={user.role}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                disabled
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Change Password */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Change Password</h2>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Current Password
              </label>
              <input
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, currentPassword: e.target.value })
                }
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">New Password</label>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, newPassword: e.target.value })
                }
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
                minLength={8}
              />
              <p className="mt-1 text-sm text-gray-500">
                At least 8 characters with uppercase, lowercase, and numbers
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Confirm New Password
              </label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                }
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>

        {/* Danger Zone */}
        <div className="bg-white shadow rounded-lg p-6 border-2 border-red-200">
          <h2 className="text-lg font-medium text-red-900 mb-4">Danger Zone</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Delete Account</h3>
              <p className="mt-1 text-sm text-gray-500">
                Once you delete your account, there is no going back. Please be certain.
              </p>
              <button
                type="button"
                onClick={() => alert('This feature is not yet implemented')}
                className="mt-3 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm"
              >
                Delete My Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
