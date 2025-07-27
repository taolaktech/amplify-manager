import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Credentials, UploadService } from 'src/common/file-upload';
import { IUploadedFiles } from 'src/common/interfaces/file.interface';
import { BrandAsset, BrandAssetDoc } from 'src/database/schema';
import { CreateBrandDto } from './dto/create-brand-asset.dto';
import { UpdateBrandAssetDto } from './dto/update-brand-asset.dto';

// Define a type for the upload results
type UploadResultWithField = {
  field: 'primaryLogo' | 'secondaryLogo' | 'brandGuide';
  url: string;
  key: string;
  mimeType: string;
};

@Injectable()
export class BrandAssetService {
  private readonly logger = new Logger(BrandAssetService.name);

  constructor(
    @InjectModel('brand-assets')
    private readonly brandAssetModel: Model<BrandAssetDoc>,
    private readonly uploadService: UploadService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Creates a new brand asset for a user.
   *
   * This method checks if the user has already created a brand asset. If so, it throws a ConflictException.
   * It uploads the provided files (primary logo, secondary logo, and brand guide) to AWS S3 and saves the
   * corresponding URLs and metadata in the database.
   *
   * @param createBrandDto - The data transfer object containing brand asset details.
   * @param files - An object containing uploaded files, including primaryLogo, secondaryLogo, and brandGuide.
   * @param userId - The ID of the user creating the brand asset.
   * @returns A Promise that resolves to the newly created BrandAsset object.
   * @throws ConflictException - If the user already has a brand asset.
   * @throws InternalServerErrorException - If an error occurs during the creation process.
   */
  async createBrandAsset(
    createBrandDto: CreateBrandDto,
    files: IUploadedFiles,
    userId: Types.ObjectId,
  ): Promise<BrandAsset> {
    // check if user has created a brand asset before
    const existingBrandAsset = await this.brandAssetModel.findOne({
      belongsTo: userId,
    });

    if (existingBrandAsset) {
      throw new ConflictException(
        'User already has a brand asset, please update using the update  endpoint',
      );
    }

    const uploadedKeys: string[] = [];
    const awsCredentials: Credentials = {
      accessKeyId: this.configService.get('aws.accessKeyId') as string,
      secretAccessKey: this.configService.get('aws.secretAccessKey') as string,
      region: this.configService.get('aws.region') as string,
      bucketName: this.configService.get('aws.bucket') as string,
      awsUrl: this.configService.get('aws.url') as string,
    };

    try {
      const uploadPromises: Promise<UploadResultWithField>[] = [];

      if (files.primaryLogo?.[0]) {
        const file = files.primaryLogo[0];
        uploadPromises.push(
          this.uploadService
            .uploadFile(
              file,
              userId.toHexString(),
              'logo',
              awsCredentials,
              'brand-assets',
            )
            .then((result) => ({ field: 'primaryLogo', ...result })),
        );
      }

      if (files.secondaryLogo?.[0]) {
        const file = files.secondaryLogo[0];
        uploadPromises.push(
          this.uploadService
            .uploadFile(
              file,
              userId.toHexString(),
              'logo',
              awsCredentials,
              'brand-assets',
            )
            .then((result) => ({ field: 'secondaryLogo', ...result })),
        );
      }

      if (files.brandGuide?.[0]) {
        const file = files.brandGuide[0];
        uploadPromises.push(
          this.uploadService
            .uploadFile(
              file,
              userId.toHexString(),
              'brand-guide',
              awsCredentials,
              'brand-assets',
            )
            .then((result) => ({ field: 'brandGuide', ...result })),
        );
      }

      const uploadResults = await Promise.all(uploadPromises);

      // Prepare data for MongoDB document
      const brandAssetData: Partial<BrandAsset> = {
        ...createBrandDto,
        belongsTo: userId,
      };

      for (const result of uploadResults) {
        uploadedKeys.push(result.key); // Collect all keys for potential rollback

        switch (result.field) {
          case 'primaryLogo':
            brandAssetData.primaryLogoUrl = result.url;
            brandAssetData.primaryLogoKey = result.key;
            brandAssetData.primaryLogoMimeType = result.mimeType;
            break;
          case 'secondaryLogo':
            brandAssetData.secondaryLogoUrl = result.url;
            brandAssetData.secondaryLogoKey = result.key;
            brandAssetData.secondaryLogoMimeType = result.mimeType;
            break;
          case 'brandGuide':
            brandAssetData.brandGuideUrl = result.url;
            brandAssetData.brandGuideKey = result.key;
            brandAssetData.brandGuideMimeType = result.mimeType;
            break;
        }
      }

      // Create and save the final database record
      const newBrandAsset = new this.brandAssetModel(brandAssetData);
      await newBrandAsset.save();

      return newBrandAsset;
    } catch (error) {
      const message =
        error?.message ||
        'Could not create brand asset due to an internal error. Please try again.';

      this.logger.error(
        `Failed to create brand asset for user ${userId.toString()}. Rolling back ${uploadedKeys.length} uploads. Error: ${error.message}`,
      );

      // If any error occurs, attempt to delete all files that were just uploaded
      if (uploadedKeys.length > 0) {
        const deletePromises = uploadedKeys.map((key) =>
          this.uploadService.deleteObject(key, awsCredentials),
        );
        await Promise.allSettled(deletePromises); // Use allSettled to ensure all deletions are attempted
      }

      throw new InternalServerErrorException(message);
    }
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
  async updateBrandAsset(
    updateDto: UpdateBrandAssetDto,
    files: IUploadedFiles,
    userId: Types.ObjectId,
  ): Promise<BrandAsset> {
    const brandAsset = await this.brandAssetModel.findOne({
      belongsTo: userId,
    });
    if (!brandAsset) {
      throw new NotFoundException(
        'Brand asset profile not found for this user.',
      );
    }

    const awsCredentials: Credentials = {
      accessKeyId: this.configService.get('aws.accessKeyId') as string,
      secretAccessKey: this.configService.get('aws.secretAccessKey') as string,
      region: this.configService.get('aws.region') as string,
      bucketName: this.configService.get('aws.bucket') as string,
      awsUrl: this.configService.get('aws.url') as string,
    };

    // track old keys to delete after updating new assets successfully
    const oldKeysToDelete: string[] = [];
    /*
     * variable to track the new keys of the assets
     * in case the overall process fails to complete
     * which we will use to delete the assets
     */
    const newKeysToRollback: string[] = [];

    try {
      // Handle File Replacements and Removals

      // Helper function to manage asset logic
      const processAsset = async (
        assetName: 'primaryLogo' | 'secondaryLogo' | 'brandGuide',
        assetType: 'logo' | 'brand-guide',
      ) => {
        const file = files[assetName]?.[0];
        const removeFlag =
          updateDto[
            `remove${assetName.charAt(0).toUpperCase() + assetName.slice(1)}`
          ]; // get the boolean value of the remove flag of the asset e.g removePrimaryLogo
        const urlField = `${assetName}Url`; // e.g primaryLogoUrl
        const keyField = `${assetName}Key`; // e.g primaryLogoKey
        const mimeTypeField = `${assetName}MimeType`; // e.g primaryLogoMimeType

        if (file) {
          // Case 1: New file uploaded (Replace or Add)
          if (brandAsset[keyField]) {
            // Add the old key to the list of keys to delete e.g primaryLogoKey from the DB
            oldKeysToDelete.push(brandAsset[keyField]);
          }
          const result = await this.uploadService.uploadFile(
            file,
            userId.toHexString(),
            assetType,
            awsCredentials,
            'brand-assets',
          );
          newKeysToRollback.push(result.key);
          brandAsset[urlField] = result.url;
          brandAsset[keyField] = result.key;
          brandAsset[mimeTypeField] = result.mimeType;
        } else if (removeFlag) {
          // Case 2: Asset removal signaled
          if (brandAsset[keyField]) {
            oldKeysToDelete.push(brandAsset[keyField]);
          }
          brandAsset[urlField] = undefined;
          brandAsset[keyField] = undefined;
          brandAsset[mimeTypeField] = undefined;
        }
      };

      // Process all assets concurrently
      await Promise.all([
        processAsset('primaryLogo', 'logo'),
        processAsset('secondaryLogo', 'logo'),
        processAsset('brandGuide', 'brand-guide'),
      ]);

      // assign updated DTO fields to brandAsset object
      Object.assign(brandAsset, updateDto);

      const updatedBrandAsset = await brandAsset.save();

      // cleanup old S3 objects if any exists
      if (oldKeysToDelete.length > 0) {
        this.logger.log(
          `Cleaning up ${oldKeysToDelete.length} old S3 objects.`,
        );
        const deletePromises = oldKeysToDelete.map((key) =>
          this.uploadService.deleteObject(key, awsCredentials),
        );
        await Promise.allSettled(deletePromises);
      }

      return updatedBrandAsset;
    } catch (error) {
      this.logger.error(
        `Failed to update brand asset for user ${userId.toString()}. Rolling back ${newKeysToRollback.length} new uploads. Error: ${error.message}`,
      );

      // Rollback any new files that were uploaded before the error
      if (newKeysToRollback.length > 0) {
        const deletePromises = newKeysToRollback.map((key) =>
          this.uploadService.deleteObject(key, awsCredentials),
        );
        await Promise.allSettled(deletePromises);
      }

      throw new InternalServerErrorException(
        'Could not update brand asset. Please try again.',
      );
    }
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
    const brandAsset = await this.brandAssetModel
      .findOne({ belongsTo: userId })
      .lean();

    if (!brandAsset) {
      throw new NotFoundException(
        'Brand asset profile not found for this user.',
      );
    }

    const awsCredentials: Credentials = {
      accessKeyId: this.configService.get('aws.accessKeyId') as string,
      secretAccessKey: this.configService.get('aws.secretAccessKey') as string,
      region: this.configService.get('aws.region') as string,
      bucketName: this.configService.get('aws.bucket') as string,
      awsUrl: this.configService.get('aws.url') as string,
    };

    // Regenerate URLs only for assets that exist
    const urlGenerationPromises: Promise<void>[] = [];

    if (brandAsset.primaryLogoKey) {
      urlGenerationPromises.push(
        this.uploadService
          .getPublicUrl(brandAsset.primaryLogoKey, awsCredentials)
          .then((url) => {
            brandAsset.primaryLogoUrl = url;
          }),
      );
    }
    if (brandAsset.secondaryLogoKey) {
      urlGenerationPromises.push(
        this.uploadService
          .getPublicUrl(brandAsset.secondaryLogoKey, awsCredentials)
          .then((url) => {
            brandAsset.secondaryLogoUrl = url;
          }),
      );
    }
    if (brandAsset.brandGuideKey) {
      urlGenerationPromises.push(
        this.uploadService
          .getPublicUrl(brandAsset.brandGuideKey, awsCredentials)
          .then((url) => {
            brandAsset.brandGuideUrl = url;
          }),
      );
    }

    await Promise.all(urlGenerationPromises);

    return brandAsset;
  }
}
