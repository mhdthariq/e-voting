import { supabase } from './client';
import { optimizeImage } from '@/lib/utils/imageOptimizer';

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
 * Automatically converts to WebP before uploading
 */
export async function uploadProfileImage(
  options: UploadImageOptions
): Promise<UploadImageResult> {
  try {
    const { userId, file, folder = 'avatars' } = options;

    // Optimize image to WebP
    const optimized = await optimizeImage({
      file,
      maxWidth: 800,
      maxHeight: 800,
      quality: 0.8
    });

    // Use the optimized file
    const fileToUpload = optimized.file;

    // Validate file size (5MB max) - check optimized size
    const maxSize = 5 * 1024 * 1024;
    if (fileToUpload.size > maxSize) {
      return {
        success: false,
        error: 'File size exceeds 5MB limit.',
      };
    }

    // Generate unique filename with .webp extension
    const fileName = `${userId}_${Date.now()}.webp`;
    const filePath = `${folder}/${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('profile-images')
      .upload(filePath, fileToUpload, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'image/webp'
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

export interface UploadCandidateImageOptions {
  candidateId: number;
  electionId: number;
  file: File;
}

/**
 * Upload candidate image to Supabase Storage
 * Automatically converts to WebP before uploading
 */
export async function uploadCandidateImage(
  options: UploadCandidateImageOptions
): Promise<UploadImageResult> {
  try {
    const { candidateId, electionId, file } = options;

    // Optimize image to WebP
    const optimized = await optimizeImage({
      file,
      maxWidth: 800,
      maxHeight: 800,
      quality: 0.8
    });

    // Use the optimized file
    const fileToUpload = optimized.file;

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (fileToUpload.size > maxSize) {
      return {
        success: false,
        error: 'File size exceeds 5MB limit.',
      };
    }

    // Generate unique filename
    const fileName = `election_${electionId}/candidate_${candidateId}_${Date.now()}.webp`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('candidate-images')
      .upload(fileName, fileToUpload, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'image/webp'
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
      .from('candidate-images')
      .getPublicUrl(fileName);

    return {
      success: true,
      url: publicUrl,
      path: fileName,
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
 * Delete candidate image from Supabase Storage
 */
export async function deleteCandidateImage(filePath: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from('candidate-images')
      .remove([filePath]);

    return !error;
  } catch (error) {
    console.error('Delete error:', error);
    return false;
  }
}
