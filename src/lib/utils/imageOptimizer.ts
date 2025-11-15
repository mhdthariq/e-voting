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
 * This runs in the browser before uploading
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
        // Calculate new dimensions maintaining aspect ratio
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

        // Draw image on canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to WebP blob
        canvas.toBlob(
          async (blob) => {
            if (!blob) {
              reject(new Error('Failed to create blob'));
              return;
            }

            // Create File from Blob with .webp extension
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

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
