import {
  DeleteObjectCommand,
  GetObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Upload } from '@aws-sdk/lib-storage';
import { Readable } from 'node:stream';
// import { ContentTypes } from './constants/content-types';
import { TopLevelFolder, topLevelFolders } from './constants/buckets';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { AppConfigService } from 'src/config/config.service';

export interface Credentials {
  /**
   * optional endpoint property  use for local testing
   */
  endpoint?: string;
  /**
   * bucket name
   */
  bucketName: string;
  /**
   * this is the AWS_UPLOAD
   */
  // basePath: string;
  /**
   * Base URL to AWS resource
   */
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

interface UploadResult {
  url: string;
  key: string;
  mimeType: string;
}

/**
 * an injectable class for uploading streams of file
 * to amazon S3 and getting the url of the uploaded file
 */
@Injectable()
export class UploadService {
  private logger = new Logger(UploadService.name);
  private client: S3Client;
  private bucketName: string;
  /**
   * this is the AWS_UPLOAD
   */
  // private basePath: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly config: AppConfigService,
  ) {}

  private initializeClient(credentials: Credentials) {
    this.bucketName = credentials.bucketName;
    // this.basePath = credentials.basePath;

    this.client = new S3Client({
      // endpoint: `http://${this.bucketName}.s3.amazonaws.com/`,
      // The endpoint is typically for the service, not including the bucket.
      // For localstack/minio, it would be e.g., 'http://localhost:4566'
      endpoint: credentials.endpoint,
      region: credentials.region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
      },
      forcePathStyle: true, // when using localstack or minio
    });
  }

  private generateS3Key(
    businessId: string,
    assetType: string,
    originalFilename: string,
  ): string {
    const uniqueId = uuidv4();
    const extension = path.extname(originalFilename);
    // e.g., logos/user_123/d1b2c3d4-e5f6-a7b8-c9d0-e1f2a3b4c5d6.png
    return `${assetType}/${businessId}/${uniqueId}${extension}`;
  }

  /**
   * Uploads a file to an S3 bucket.
   *
   * @param file - The file to be uploaded, represented as an Express.Multer.File.
   * @param userId - The ID of the user uploading the file.
   * @param assetType - The type of asset being uploaded, either 'logo' or 'brand-guide'.
   * @param credentials - The credentials required to access the S3 bucket.
   * @param topLevelFolder - The top-level folder under which the file will be stored.
   * @returns A promise that resolves to an UploadResult containing the URL and key of the uploaded file, as well as its MIME type.
   *
   * @throws Error if the S3 client is not initialized or if the upload fails.
   */
  async uploadFile(
    file: Express.Multer.File,
    businessId: string,
    assetType: string,
    credentials: Credentials,
    topLevelFolder: TopLevelFolder,
  ): Promise<UploadResult> {
    if (!this.client) {
      this.logger.log('Initializing S3 Client.....');
      this.initializeClient(credentials);
    }

    // Convert buffer to stream
    const stream = Readable.from(file.buffer);
    // Generate key
    const generatedKey = this.generateS3Key(
      businessId,
      assetType,
      file.originalname,
    );
    const folderPath = topLevelFolders[topLevelFolder]; // e.g., 'brand-assets'
    let fullKey = path.normalize(`${folderPath}/${generatedKey}`);
    // replace all backslashes with forward slashes
    fullKey = fullKey.replace(/\\/g, '/');

    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: this.bucketName,
        Key: fullKey,
        Body: stream,
        ContentType: file.mimetype,
      },
      queueSize: 4,
      partSize: 1024 * 1024 * 5,
      leavePartsOnError: false,
    });

    await upload.done();
    this.logger.log(`::: completed file upload :::`);

    const url = await this.getPresignedSignedUrl(fullKey);
    return {
      url,
      key: fullKey,
      mimeType: file.mimetype,
    };
  }

  /**
   * Retrieves a public URL for the specified file key from S3.
   *
   * This method initializes the S3 client if it has not been initialized yet,
   * and then generates a presigned URL for the given key.
   *
   * @param key - The key of the file in S3 for which the public URL is requested.
   * @param credentials - The credentials required to access the S3 service.
   * @returns A promise that resolves to the public URL of the specified file.
   */
  async getPublicUrl(key: string, credentials: Credentials): Promise<string> {
    if (!this.client) {
      this.logger.log('Initializing S3 Client for URL generation.....');
      this.initializeClient(credentials);
    }
    return this.getPresignedSignedUrl(key);
  }

  /**
   * Retrieves actual url from S3.
   *
   * Generates an s3 url of the key
   *
   * @param key - The key of the file in S3 for which the public URL is requested.
   * @param credentials - The credentials required to access the S3 service.
   * @returns A promise that resolves to the public URL of the specified file.
   */
  getUrl(key: string): string {
    return `https://${this.config.get('S3_BUCKET')}.s3.${this.config.get('AWS_REGION')}.amazonaws.com/${key}`;
  }

  /**
   * Generates a presigned URL for accessing an object in the specified S3 bucket.
   *
   * @param key - The key of the object in the S3 bucket for which the presigned URL is generated.
   * @returns A promise that resolves to the presigned URL, valid for 48 hours.
   * @throws Error if the URL generation fails.
   */
  private async getPresignedSignedUrl(key: string) {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const url = await getSignedUrl(this.client, command, {
        expiresIn: 60 * 60 * 48, // 48 hours
      });

      return url;
    } catch (error) {
      throw Error(error);
    }
  }

  async deleteObject(key: string, credentials: Credentials): Promise<void> {
    if (!this.client) {
      this.logger.log('Initializing S3 Client for deletion.....');
      this.initializeClient(credentials);
    }

    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    try {
      await this.client.send(command);
      this.logger.log(`::: Successfully deleted object with key: ${key} :::`);
    } catch (error) {
      this.logger.error(
        `::: Failed to delete object with key: ${key} :::`,
        error,
      );
      // Depending on the desired behavior, you might want to re-throw
      throw new Error(`::: Could not delete file from S3. Key: ${key} :::`);
    }
  }
}
