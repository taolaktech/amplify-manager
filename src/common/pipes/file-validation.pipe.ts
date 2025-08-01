// file-validation.pipe.ts
import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

export interface FileValidationOptions {
  maxSize: number;
  allowedMimeTypes: string[];
  required?: boolean;
}

@Injectable()
export class FileValidationPipe implements PipeTransform {
  constructor(private readonly options: FileValidationOptions) {}

  transform(file: Express.Multer.File): Express.Multer.File {
    if (!file && this.options.required) {
      throw new BadRequestException('File is required');
    }

    // Check file size
    if (file.size > this.options.maxSize) {
      const maxSizeMB = (this.options.maxSize / (1024 * 1024)).toFixed(1);
      throw new BadRequestException(
        `File size too large. Maximum allowed size is ${maxSizeMB}MB`,
      );
    }

    // Additional validation for corrupted files
    if (file && !this.isValidFileStructure(file)) {
      throw new BadRequestException({
        message: `File "${file.originalname}" appears to be corrupted or invalid`,
        code: 'FILE_CORRUPTED',
      });
    }

    // Check MIME type
    if (!this.options.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${this.options.allowedMimeTypes.join(', ')}`,
      );
    }

    return file;
  }

  private isValidFileStructure(file: Express.Multer.File): boolean {
    return file.buffer && file.buffer.length > 0;
  }
}

// File validation constants
export const LOGO_VALIDATION_OPTIONS: FileValidationOptions = {
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/svg+xml'],
  required: false,
};

export const BRAND_GUIDE_VALIDATION_OPTIONS: FileValidationOptions = {
  maxSize: 25 * 1024 * 1024, // 25MB
  allowedMimeTypes: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  ],
  required: false,
};
