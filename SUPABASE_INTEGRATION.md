# 🚀 Supabase Integration Guide for BlockVote

**Version**: 1.0  
**Last Updated**: November 2025  
**Purpose**: Complete guide for integrating Supabase services into BlockVote

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Supabase Services Used](#supabase-services-used)
- [Setup Instructions](#setup-instructions)
- [Email Verification with Supabase Auth](#email-verification-with-supabase-auth)
- [Profile Image Storage](#profile-image-storage)
- [Image Optimization (WebP Conversion)](#image-optimization-webp-conversion)
- [Settings Pages Implementation](#settings-pages-implementation)
- [Environment Configuration](#environment-configuration)
- [API Integration](#api-integration)
- [Security Best Practices](#security-best-practices)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

This guide covers integrating Supabase services into BlockVote for:
1. **Email Verification**: Using Supabase Auth for secure email verification
2. **File Storage**: Using Supabase Storage buckets for profile images
3. **Image Optimization**: Converting uploaded images to WebP format
4. **User Settings**: Implementing profile management with photo uploads

### Why Supabase?

- **Email Service**: Built-in email verification and authentication
- **Storage**: Scalable file storage with CDN delivery
- **Real-time**: WebSocket support for live updates (future feature)
- **PostgreSQL**: Can migrate from SQLite to Supabase PostgreSQL
- **Free Tier**: Generous free tier for development and small deployments

## 📦 Prerequisites

Before starting, ensure you have:

- [x] Supabase account (create at [supabase.com](https://supabase.com))
- [x] Node.js 18+ installed
- [x] BlockVote project set up
- [x] Basic understanding of React and Next.js

## 🛠 Supabase Services Used

### 1. Supabase Auth (Email Verification)
- Email/password authentication
- Email verification workflow
- Magic link authentication (optional)
- Password reset functionality

### 2. Supabase Storage (Profile Images)
- Public bucket for profile photos
- Image upload and retrieval
- CDN delivery
- Access control policies

### 3. Edge Functions (Image Optimization - Optional)
- WebP conversion
- Image resizing
- Thumbnail generation

## 📝 Setup Instructions

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in project details:
   - **Name**: `blockvote` or your preferred name
   - **Database Password**: Generate a strong password
   - **Region**: Choose closest to your users
4. Click "Create new project"
5. Wait for project to be provisioned (1-2 minutes)

### Step 2: Get Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following:
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **anon/public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **service_role key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (keep secret!)

### Step 3: Install Supabase Client

```bash
npm install @supabase/supabase-js
```

### Step 4: Configure Environment Variables

Add to your `.env` file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Email Configuration (Supabase handles this automatically)
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_NAME=BlockVote

# Image Storage Configuration
SUPABASE_STORAGE_BUCKET=profile-images
MAX_IMAGE_SIZE=5242880
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/webp,image/gif
```

### Step 5: Create Supabase Client

Create `src/lib/supabase/client.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client-side Supabase client (uses anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side Supabase client (uses service role key)
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
```

## 📧 Email Verification with Supabase Auth

### Approach 1: Hybrid Mode (Recommended)

Keep your existing JWT authentication but use Supabase only for email verification.

#### Implementation

**1. Update User Registration Endpoint** (`/api/auth/register/voter`):

```typescript
import { supabaseAdmin } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const { fullName, email, username, password, studentId } = await request.json();
    
    // Create user in your database (existing code)
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        username,
        passwordHash: hashedPassword,
        studentId: studentId || null,
        role: "VOTER",
        status: "INACTIVE",
        emailVerified: false,
      },
    });

    // Send verification email via Supabase
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email: email,
      options: {
        data: {
          userId: user.id,
          username: username,
          fullName: fullName,
        },
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email`,
      }
    });

    if (error) {
      console.error('Supabase email error:', error);
      // Fallback: Still register user, notify admin
    }

    return NextResponse.json({
      success: true,
      message: "Registration successful! Please check your email to verify your account.",
      userId: user.id,
    }, { status: 201 });

  } catch (error) {
    // Error handling
  }
}
```

**2. Create Email Verification Page** (`/app/auth/verify-email/page.tsx`):

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      // Get the token from URL hash (Supabase magic link)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      if (!accessToken) {
        setStatus('error');
        setMessage('Invalid verification link');
        return;
      }

      try {
        // Set Supabase session
        const { data: { user }, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken!,
        });

        if (error) throw error;

        // Activate user in your database
        const response = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.user_metadata?.userId,
            email: user?.email,
          }),
        });

        if (response.ok) {
          setStatus('success');
          setMessage('Email verified successfully! Redirecting to login...');
          setTimeout(() => router.push('/auth/login'), 3000);
        } else {
          throw new Error('Failed to verify email');
        }
      } catch (error) {
        setStatus('error');
        setMessage('Email verification failed');
      }
    };

    verifyEmail();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        {status === 'verifying' && (
          <>
            <div className="text-center">
              <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
              <h2 className="mt-6 text-2xl font-bold text-gray-900">Verifying your email...</h2>
            </div>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="text-center">
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="mt-6 text-2xl font-bold text-gray-900">Email Verified!</h2>
              <p className="mt-2 text-sm text-gray-600">{message}</p>
            </div>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-center">
              <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="mt-6 text-2xl font-bold text-gray-900">Verification Failed</h2>
              <p className="mt-2 text-sm text-gray-600">{message}</p>
              <button
                onClick={() => router.push('/auth/login')}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Go to Login
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

**3. Create Verification Handler** (`/app/api/auth/verify-email/route.ts`):

```typescript
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/database/client';

export async function POST(request: NextRequest) {
  try {
    const { userId, email } = await request.json();

    // Activate user account
    await prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
        status: 'ACTIVE',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Verification failed' },
      { status: 500 }
    );
  }
}
```

### Approach 2: Full Supabase Auth (Alternative)

Migrate completely to Supabase Auth and sync with your database.

## 🖼️ Profile Image Storage

### Step 1: Create Storage Bucket

1. In Supabase dashboard, go to **Storage**
2. Click "Create a new bucket"
3. Bucket name: `profile-images`
4. **Public bucket**: ✅ Yes (for easy CDN access)
5. Click "Create bucket"

### Step 2: Set Up Storage Policies

In Supabase dashboard, go to **Storage** → **Policies**:

```sql
-- Allow anyone to read profile images
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-images');

-- Allow authenticated users to upload their own images
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'profile-images' AND auth.role() = 'authenticated');

-- Allow users to update their own images
CREATE POLICY "User Update Own Image"
ON storage.objects FOR UPDATE
USING (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own images
CREATE POLICY "User Delete Own Image"
ON storage.objects FOR DELETE
USING (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### Step 3: Create Image Upload Service

Create `src/lib/supabase/storage.ts`:

```typescript
import { supabase } from './client';

export interface UploadImageOptions {
  userId: number;
  file: File;
  folder?: string;
}

export interface UploadImageResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

/**
 * Upload profile image to Supabase Storage
 */
export async function uploadProfileImage(
  options: UploadImageOptions
): Promise<UploadImageResult> {
  try {
    const { userId, file, folder = 'avatars' } = options;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.',
      };
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        success: false,
        error: 'File size exceeds 5MB limit.',
      };
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}_${Date.now()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('profile-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('profile-images')
      .getPublicUrl(filePath);

    return {
      success: true,
      url: publicUrl,
      path: filePath,
    };
  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: 'Failed to upload image',
    };
  }
}

/**
 * Delete profile image from Supabase Storage
 */
export async function deleteProfileImage(filePath: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from('profile-images')
      .remove([filePath]);

    return !error;
  } catch (error) {
    console.error('Delete error:', error);
    return false;
  }
}

/**
 * Get public URL for an image
 */
export function getImageUrl(filePath: string): string {
  const { data } = supabase.storage
    .from('profile-images')
    .getPublicUrl(filePath);

  return data.publicUrl;
}
```

## 🎨 Image Optimization (WebP Conversion)

### Client-Side WebP Conversion

Create `src/lib/utils/imageOptimizer.ts`:

```typescript
export interface OptimizeImageOptions {
  file: File;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export interface OptimizedImage {
  file: File;
  dataUrl: string;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
}

/**
 * Convert image to WebP format and optimize
 */
export async function optimizeImage(
  options: OptimizeImageOptions
): Promise<OptimizedImage> {
  const { file, maxWidth = 800, maxHeight = 800, quality = 0.8 } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;

      img.onload = () => {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Draw and optimize
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to WebP
        canvas.toBlob(
          async (blob) => {
            if (!blob) {
              reject(new Error('Failed to create blob'));
              return;
            }

            // Create File from Blob
            const optimizedFile = new File(
              [blob],
              file.name.replace(/\.[^/.]+$/, '.webp'),
              { type: 'image/webp' }
            );

            // Get data URL for preview
            const dataUrl = canvas.toDataURL('image/webp', quality);

            resolve({
              file: optimizedFile,
              dataUrl,
              originalSize: file.size,
              optimizedSize: blob.size,
              compressionRatio: ((file.size - blob.size) / file.size) * 100,
            });
          },
          'image/webp',
          quality
        );
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}
```

## ⚙️ Settings Pages Implementation

### User Settings Page

Create `src/app/settings/page.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { uploadProfileImage, deleteProfileImage } from '@/lib/supabase/storage';
import { optimizeImage } from '@/lib/utils/imageOptimizer';

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Load user data
  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    // Fetch from your API
    const response = await fetch('/api/auth/me');
    const data = await response.json();
    setUser(data.user);
    setFormData({
      ...formData,
      username: data.user.username,
      fullName: data.user.fullName || '',
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      // Optimize image
      const optimized = await optimizeImage({ file });
      
      // Upload to Supabase
      const result = await uploadProfileImage({
        userId: user.id,
        file: optimized.file,
      });

      if (result.success) {
        // Update user profile in database
        await fetch('/api/user/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profileImage: result.url,
            profileImagePath: result.path,
          }),
        });

        setPreview(result.url);
        alert('Profile photo updated successfully!');
      } else {
        alert(result.error || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload image');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          fullName: formData.fullName,
        }),
      });

      if (response.ok) {
        alert('Profile updated successfully!');
      } else {
        alert('Failed to update profile');
      }
    } catch (error) {
      alert('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.newPassword !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/user/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });

      if (response.ok) {
        alert('Password changed successfully!');
        setFormData({
          ...formData,
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to change password');
      }
    } catch (error) {
      alert('Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage your profile, security, and preferences
          </p>
        </div>

        {/* Profile Photo */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Profile Photo</h2>
          <div className="flex items-center space-x-6">
            <div className="h-24 w-24 rounded-full bg-gray-200 overflow-hidden">
              {(preview || user?.profileImage) ? (
                <img
                  src={preview || user?.profileImage}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-3xl text-gray-400">
                  {user?.fullName?.charAt(0) || user?.username?.charAt(0) || '?'}
                </div>
              )}
            </div>
            <div>
              <label className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                {loading ? 'Uploading...' : 'Upload Photo'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={loading}
                  className="hidden"
                />
              </label>
              <p className="mt-2 text-sm text-gray-500">
                JPG, PNG, or WebP. Max 5MB. Will be converted to WebP.
              </p>
            </div>
          </div>
        </div>

        {/* Profile Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Profile Information</h2>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Username</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                disabled={user?.role === 'ORGANIZATION'} // Organizations can't change username
              />
              {user?.role === 'ORGANIZATION' && (
                <p className="mt-1 text-sm text-gray-500">
                  Organizations cannot change their username
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Full Name</label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
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
              <label className="block text-sm font-medium text-gray-700">Current Password</label>
              <input
                type="password"
                value={formData.currentPassword}
                onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">New Password</label>
              <input
                type="password"
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                required
                minLength={8}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
```

## 🔐 Security Best Practices

### 1. Environment Variables

Never expose sensitive keys:
- ✅ `NEXT_PUBLIC_SUPABASE_URL` - Safe to expose
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Safe to expose
- ❌ `SUPABASE_SERVICE_ROLE_KEY` - **NEVER** expose client-side

### 2. Row Level Security (RLS)

Always enable RLS on Supabase tables for production.

### 3. File Upload Validation

- Validate file types (whitelist approach)
- Limit file sizes (5MB recommended)
- Scan for malware (use Supabase Edge Functions)
- Sanitize filenames

### 4. Image Optimization

- Always optimize images before storage
- Use WebP for better compression
- Generate thumbnails for previews
- Set appropriate cache headers

## 🐛 Troubleshooting

### Issue: "Failed to fetch from Supabase"

**Solution**: Check your Supabase URL and keys in `.env`

### Issue: "Storage bucket not found"

**Solution**: Create the bucket in Supabase dashboard

### Issue: "Upload failed: Policy violation"

**Solution**: Check your storage policies

### Issue: "Email not sending"

**Solution**: 
1. Check Supabase email settings
2. Verify email templates
3. Check spam folder
4. Enable email auth in Supabase dashboard

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Storage Guide](https://supabase.com/docs/guides/storage)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Image Optimization Guide](https://web.dev/uses-webp-images/)

## 🎯 Next Steps

After completing this integration:

1. Test email verification flow
2. Test image upload and optimization
3. Implement settings pages for all user types
4. Set up monitoring and error tracking
5. Configure production environment
6. Test with real users

---

**Last Updated**: November 2025  
**Maintainer**: BlockVote Development Team  
**License**: MIT
