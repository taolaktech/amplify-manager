import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Credentials, UploadService } from 'src/common/file-upload';
import { IUploadedFiles } from 'src/common/interfaces/file.interface';
import { BrandAsset, BrandAssetDoc, BusinessDoc } from 'src/database/schema';
import { UpsertBrandAssetDto } from './dto/upsert-brand-asset.dto';
import { AppConfigService } from 'src/config/config.service';

// Define a type for the upload results

@Injectable()
export class BrandAssetService {
  private readonly logger = new Logger(BrandAssetService.name);
  private awsCredentials: Credentials;

  constructor(
    @InjectModel('business')
    private readonly businessModel: Model<BusinessDoc>,
    @InjectModel('brand-assets')
    private readonly brandAssetModel: Model<BrandAssetDoc>,
    private readonly uploadService: UploadService,
    private readonly configService: AppConfigService,
  ) {
    this.awsCredentials = {
      accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      region: this.configService.get('AWS_REGION'),
      bucketName: this.configService.get('S3_BUCKET'),
    };
  }

  /**
   * Retrieves the brand asset for a specified user.
   *
   * @param userId - The unique identifier of the user whose brand asset is to be retrieved.
   * @returns A promise that resolves to the BrandAsset object associated with the user.
   * @throws NotFoundException - If no brand asset profile is found for the specified user.
   *
   * This method also generates public URLs for the primary logo, secondary logo, and brand guide
   * if their respective keys are present in the brand asset.
   */
  async getBrandAsset(userId: Types.ObjectId): Promise<BrandAsset> {
    const business = await this.businessModel.findOne({ userId });
    if (!business) {
      throw new InternalServerErrorException(
        'Business not found for this user.',
      );
    }

    let brandAsset = await this.brandAssetModel.findOne({
      belongsTo: business._id,
    });

    if (!brandAsset) {
      brandAsset = await this.brandAssetModel.create({
        belongsTo: business._id,
      });
      business.brandAssets = [brandAsset._id as Types.ObjectId];
      await business.save();
    }

    // Regenerate URLs only for assets that exist
    const urlGenerationPromises: Promise<void>[] = [];

    if (brandAsset.primaryLogoKey) {
      urlGenerationPromises.push(
        this.uploadService
          .getPublicUrl(brandAsset.primaryLogoKey, this.awsCredentials)
          .then((url) => {
            brandAsset.primaryLogoUrl = url;
          }),
      );
    }
    if (brandAsset.secondaryLogoKey) {
      urlGenerationPromises.push(
        this.uploadService
          .getPublicUrl(brandAsset.secondaryLogoKey, this.awsCredentials)
          .then((url) => {
            brandAsset.secondaryLogoUrl = url;
          }),
      );
    }
    if (brandAsset.brandGuideKey) {
      urlGenerationPromises.push(
        this.uploadService
          .getPublicUrl(brandAsset.brandGuideKey, this.awsCredentials)
          .then((url) => {
            brandAsset.brandGuideUrl = url;
          }),
      );
    }

    await Promise.all(urlGenerationPromises);
    await brandAsset.save();

    return brandAsset;
  }

  /**
   * Updates the brand asset for a specific user.
   *
   * @param updateDto - The data transfer object containing the updated brand asset information.
   * @param files - An object containing the uploaded files associated with the brand asset.
   * @param userId - The unique identifier of the user to whom the brand asset belongs.
   * @returns A promise that resolves to the updated BrandAsset object.
   * @throws NotFoundException if the brand asset profile is not found for the user.
   * @throws InternalServerErrorException if there is an error during the update process.
   *
   * This method handles the uploading of new assets, the removal of existing assets,
   * and the cleanup of old assets in AWS S3. It also manages rollback in case of errors
   * during the update process.
   */
  async upsertBrandAsset(
    userId: Types.ObjectId,
    upsertDto: UpsertBrandAssetDto,
    files: IUploadedFiles,
  ): Promise<BrandAsset> {
    // 1. Find the existing document OR instantiate a new one if it doesn't exist.
    const business = await this.businessModel.findOne({ userId });
    if (!business) {
      throw new InternalServerErrorException(
        'Business not found for this user.',
      );
    }
    let brandAsset = await this.brandAssetModel.findOne({
      belongsTo: business._id,
    });
    if (!brandAsset) {
      this.logger.log(
        `No existing brand asset for user ${userId.toString()}. Creating new profile.`,
      );
      brandAsset = await this.brandAssetModel.create({
        belongsTo: business._id,
      });
      business.brandAssets = [brandAsset._id as Types.ObjectId];
      await business.save();
    }

    // keys to delete if remove flag is set
    const oldKeysToDelete: string[] = [];
    // keys to delete if failure occurs
    const newKeysToRollback: string[] = [];

    try {
      const processAsset = async (
        assetName: 'primaryLogo' | 'secondaryLogo' | 'brandGuide',
        assetType: 'logo' | 'brand-guide',
      ) => {
        const file = files[assetName]?.[0];
        const removeFlag: boolean =
          upsertDto[
            `remove${assetName.charAt(0).toUpperCase() + assetName.slice(1)}` // eg removePrimaryLogo
          ] || false;
        const urlField = `${assetName}Url`;
        const keyField = `${assetName}Key`;
        const mimeTypeField = `${assetName}MimeType`;
        const nameField = `${assetName}Name`;

        if (file) {
          console.log('idodoaoa');
          // Case: New file uploaded (Handles both add and replace)
          if (brandAsset[keyField]) {
            oldKeysToDelete.push(brandAsset[keyField]);
          }
          const result = await this.uploadService.uploadFile(
            file,
            business._id.toHexString(),
            assetType,
            this.awsCredentials,
            'brand-assets',
          );
          newKeysToRollback.push(result.key); // Track for rollback
          brandAsset[urlField] = result.url;
          brandAsset[keyField] = result.key;
          brandAsset[mimeTypeField] = result.mimeType;
          brandAsset[nameField] = file.originalname; // Store the original file name
        } else if (removeFlag) {
          // Case: Asset removal signaled
          if (brandAsset[keyField]) {
            oldKeysToDelete.push(brandAsset[keyField]);
          }
          brandAsset[urlField] = undefined;
          brandAsset[keyField] = undefined;
          brandAsset[mimeTypeField] = undefined;
          brandAsset[nameField] = undefined; // Store the original file name
        }
      };
      await Promise.all([
        processAsset('primaryLogo', 'logo'),
        processAsset('secondaryLogo', 'logo'),
        processAsset('brandGuide', 'brand-guide'),
      ]);

      // Apply DTO field updates (colors, fonts, etc.)

      brandAsset.set({
        primaryColor: upsertDto.primaryColor,
        secondaryColor: upsertDto.secondaryColor,
        primaryFont: upsertDto.primaryFont,
        secondaryFont: upsertDto.secondaryFont,
        toneOfVoice: upsertDto.toneOfVoice,
      } as Partial<BrandAsset>);

      await brandAsset.validate(); // Validate the document before saving

      // Save the document
      await brandAsset.save();

      // Post-Save Cleanup: Delete old files from S3 only after successful save
      if (oldKeysToDelete.length > 0) {
        const deletePromises = oldKeysToDelete.map((key) =>
          this.uploadService.deleteObject(key, this.awsCredentials),
        );
        // Fire and forget
        Promise.allSettled(deletePromises).catch((err) =>
          this.logger.error(`Failed to delete old S3 objects: ${err.message}`),
        );
      }

      return brandAsset;
    } catch (error) {
      // Rollback: Delete any NEW files that were uploaded during this failed attempt
      this.logger.error(
        `Failed to upsert brand asset for user ${userId.toString()}. Rolling back ${newKeysToRollback.length} new uploads. Error: ${error.message}`,
      );
      if (newKeysToRollback.length > 0) {
        const deletePromises = newKeysToRollback.map((key) =>
          this.uploadService.deleteObject(key, this.awsCredentials),
        );
        Promise.allSettled(deletePromises).catch((err) =>
          this.logger.error(
            `Failed to rollback new S3 uploads: ${err.message}`,
          ),
        );
      }
      throw new InternalServerErrorException(
        'Could not save brand asset. Please try again.',
      );
    }
  }
}
