import imageCompression from 'browser-image-compression';

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Validates image file type and size
 * @param file - The file to validate
 * @returns Validation result with error message if invalid
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Please upload a JPG, PNG, WebP, or GIF image'
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'Image must be less than 5MB'
    };
  }

  return { valid: true };
}

/**
 * Crops and compresses image to square format
 * Returns File ready for upload
 * @param file - Original image file
 * @param cropArea - Crop coordinates (from react-easy-crop)
 * @returns Processed File ready for upload
 */
export async function processImage(
  file: File,
  cropArea: CropArea
): Promise<File> {
  // 1. Crop image using canvas
  const croppedBlob = await getCroppedImage(file, cropArea);

  // 2. Compress to optimize file size
  const compressedBlob = await imageCompression(croppedBlob, {
    maxSizeMB: 1,
    maxWidthOrHeight: 512,
    useWebWorker: true,
  });

  // 3. Create File with timestamp for cache busting
  const timestamp = Date.now();
  const fileName = `profile.${timestamp}.jpg`;
  return new File([compressedBlob], fileName, { type: 'image/jpeg' });
}

/**
 * Crops image using HTML5 Canvas
 * @param file - Original image file
 * @param cropArea - Crop coordinates
 * @returns Cropped image as Blob
 */
async function getCroppedImage(file: File, cropArea: CropArea): Promise<Blob> {
  const image = await createImage(URL.createObjectURL(file));
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  // Set canvas size to crop dimensions (square)
  canvas.width = cropArea.width;
  canvas.height = cropArea.height;

  // Draw the cropped portion of the image
  ctx.drawImage(
    image,
    cropArea.x,
    cropArea.y,
    cropArea.width,
    cropArea.height,
    0,
    0,
    cropArea.width,
    cropArea.height
  );

  // Convert canvas to Blob (JPEG format, 92% quality)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob from canvas'));
        }
      },
      'image/jpeg',
      0.92
    );
  });
}

/**
 * Creates an HTMLImageElement from a URL
 * @param url - Image URL (data URL or object URL)
 * @returns Promise that resolves with loaded image element
 */
function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', (error) => reject(error));
    img.src = url;
  });
}
