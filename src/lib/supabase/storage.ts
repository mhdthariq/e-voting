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
 * Works with SQLite database - only images are stored in Supabase
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

    if (error) {
      console.error('Delete error:', error);
      return false;
    }

    return true;
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
