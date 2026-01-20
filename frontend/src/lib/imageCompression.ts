/**
 * Compress an image file to reduce its size before upload
 * @param file - The original image file
 * @param maxSizeMB - Maximum size in MB (default: 1MB)
 * @param maxWidthOrHeight - Maximum width or height in pixels (default: 1920)
 * @param quality - JPEG quality 0-1 (default: 0.8)
 * @returns Compressed image file
 */
export async function compressImage(
    file: File,
    maxSizeMB: number = 1,
    maxWidthOrHeight: number = 1920,
    quality: number = 0.8
): Promise<File> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const img = new Image();

            img.onload = () => {
                // Calculate new dimensions
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidthOrHeight) {
                        height = Math.round((height * maxWidthOrHeight) / width);
                        width = maxWidthOrHeight;
                    }
                } else {
                    if (height > maxWidthOrHeight) {
                        width = Math.round((width * maxWidthOrHeight) / height);
                        height = maxWidthOrHeight;
                    }
                }

                // Create canvas and draw resized image
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }

                // Draw image with better quality
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, width, height);

                // Convert to blob
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error('Failed to compress image'));
                            return;
                        }

                        // Check if compressed size is acceptable
                        const compressedSizeMB = blob.size / 1024 / 1024;

                        if (compressedSizeMB > maxSizeMB && quality > 0.1) {
                            // Try again with lower quality
                            const newQuality = quality * 0.8;
                            console.log(`Image still too large (${compressedSizeMB.toFixed(2)}MB), reducing quality to ${newQuality.toFixed(2)}`);
                            compressImage(file, maxSizeMB, maxWidthOrHeight, newQuality)
                                .then(resolve)
                                .catch(reject);
                            return;
                        }

                        // Create new file from blob
                        const compressedFile = new File(
                            [blob],
                            file.name.replace(/\.\w+$/, '.jpg'), // Force JPEG extension
                            {
                                type: 'image/jpeg',
                                lastModified: Date.now(),
                            }
                        );

                        console.log(`Image compressed: ${(file.size / 1024 / 1024).toFixed(2)}MB -> ${compressedSizeMB.toFixed(2)}MB`);
                        resolve(compressedFile);
                    },
                    'image/jpeg',
                    quality
                );
            };

            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };

            img.src = e.target?.result as string;
        };

        reader.onerror = () => {
            reject(new Error('Failed to read file'));
        };

        reader.readAsDataURL(file);
    });
}

/**
 * Check if a file is an image
 */
export function isImageFile(file: File): boolean {
    return file.type.startsWith('image/');
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}
