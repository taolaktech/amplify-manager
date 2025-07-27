import { Injectable, PipeTransform } from '@nestjs/common';
import {
  FileValidationPipe,
  LOGO_VALIDATION_OPTIONS,
  BRAND_GUIDE_VALIDATION_OPTIONS,
} from './file-validation.pipe';
import { IUploadedFiles } from '../interfaces/file.interface';

@Injectable()
export class ValidationTransformPipe implements PipeTransform {
  transform(files: IUploadedFiles): IUploadedFiles {
    const logoValidation = new FileValidationPipe(LOGO_VALIDATION_OPTIONS);
    const brandGuideValidation = new FileValidationPipe(
      BRAND_GUIDE_VALIDATION_OPTIONS,
    );

    const validatedFiles: IUploadedFiles = {};

    if (files.primaryLogo?.[0]) {
      validatedFiles.primaryLogo = [
        logoValidation.transform(files.primaryLogo[0]),
      ];
    }

    if (files.secondaryLogo?.[0]) {
      validatedFiles.secondaryLogo = [
        logoValidation.transform(files.secondaryLogo[0]),
      ];
    }

    if (files.brandGuide?.[0]) {
      validatedFiles.brandGuide = [
        brandGuideValidation.transform(files.brandGuide[0]),
      ];
    }

    return validatedFiles;
  }
}
