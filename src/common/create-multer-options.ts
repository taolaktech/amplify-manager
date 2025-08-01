import { memoryStorage, Options } from 'multer';
import { BadRequestException } from '@nestjs/common';
/**
 * Returns Multer options with custom file size and allowed MIME types.
 * @param maxSize Maximum file size in bytes (e.g., 2MB = 2 * 1024 * 1024)
 * @param allowedMimeTypes Array of allowed MIME types (e.g., ['image/png', 'image/jpeg'])
 */
export function createMulterOptions(
  maxSize: number,
  allowedMimeTypes: string[],
): Options {
  return {
    storage: memoryStorage(),
    limits: {
      fileSize: maxSize,
    },
    fileFilter: (req, file, cb) => {
      if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(
          new BadRequestException(
            `Invalid file type. Only ${allowedMimeTypes.join(', ')} allowed.`,
          ) as any,
          false,
        );
      }
    },
  };
}
