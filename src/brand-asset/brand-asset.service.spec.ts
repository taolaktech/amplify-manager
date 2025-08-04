import { Test, TestingModule } from '@nestjs/testing';
import { BrandAssetService } from './brand-asset.service';
import { getModelToken } from '@nestjs/mongoose';
import { Readable } from 'stream';
import { UploadService } from '../common/file-upload';
import { AppConfigService } from '../config/config.service';
import { Types } from 'mongoose';
import {
  SupportedFonts,
  ToneOfVoice,
  UpsertBrandAssetDto,
} from './dto/upsert-brand-asset.dto';
import { IUploadedFiles } from 'src/common/interfaces/file.interface';
import { AppConfig } from 'src/config/config.schema';
import { InternalServerErrorException } from '@nestjs/common';

describe('BrandAssetService', () => {
  let service: BrandAssetService;
  const USER_ID = new Types.ObjectId('67f91497307aa82327ebca79');

  // Create stubs for your models and services
  const mockBusiness = {
    _id: new Types.ObjectId('78f91497307aa82327ebca79'),
    userId: USER_ID,
    save: jest.fn(),
    brandAssets: [],
  };

  const mockBrandAssetDoc = {
    _id: new Types.ObjectId(),
    set: jest.fn(),
    save: jest.fn(),
    validate: jest.fn(),
  };

  const mockUploadFileResult = () => {
    const randomNumber = Math.floor(Math.random() * 1000);
    const key = `s3/test-key/${randomNumber}`;
    return {
      key,
      url: `https://s3.test-amazonaws.com/${key}`,
      mimeType: 'image/png',
    };
  };

  const createMockFile = (
    fieldname: string,
    originalname: string,
    mimetype: string,
    bufferContent: string,
  ): Express.Multer.File => ({
    buffer: Buffer.from(bufferContent),
    originalname,
    mimetype,
    fieldname,
    size: bufferContent.length,
    encoding: '7bit',
    destination: '',
    filename: '',
    path: '',
    stream: Readable.from([bufferContent]),
  });

  const mockBusinessModel = {
    findOne: jest.fn().mockResolvedValue(mockBusiness),
  };

  const mockBrandAssetModel = {
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue(mockBrandAssetDoc),
  };

  const mockUploadService = {
    uploadFile: jest.fn().mockResolvedValue(mockUploadFileResult()),
    deleteObject: jest.fn().mockResolvedValue(true),
  };

  const mockAppConfigService = {
    get: jest.fn<any, [keyof AppConfig]>((key: keyof AppConfig) => {
      return process.env[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrandAssetService,
        { provide: getModelToken('business'), useValue: mockBusinessModel },
        {
          provide: getModelToken('brand-assets'),
          useValue: mockBrandAssetModel,
        },
        { provide: UploadService, useValue: mockUploadService },
        { provide: AppConfigService, useValue: mockAppConfigService },
      ],
    }).compile();

    service = module.get<BrandAssetService>(BrandAssetService);
    jest.clearAllMocks();
  });

  it('should upload 2 logos, 1 brand guide, save to db, and return the brand asset', async () => {
    const userId = USER_ID;
    const upsertDto = {
      primaryColor: '#000000',
      secondaryColor: '#ffffff',
      primaryFont: 'Arial' as SupportedFonts,
      secondaryFont: 'Times New Roman' as SupportedFonts,
      toneOfVoice: 'Friendly' as ToneOfVoice,
    };

    // Mock files

    const files: IUploadedFiles = {
      primaryLogo: [
        createMockFile(
          'primaryLogo',
          'primary.png',
          'image/png',
          'test-primary',
        ),
      ],
      secondaryLogo: [
        createMockFile(
          'secondaryLogo',
          'secondary.png',
          'image/png',
          'test-secondary',
        ),
      ],
      brandGuide: [
        createMockFile(
          'brandGuide',
          'guide.pdf',
          'application/pdf',
          'test-guide',
        ),
      ],
    };

    const result = await service.upsertBrandAsset(userId, upsertDto, files);

    // Expectations
    expect(result).toBe(mockBrandAssetDoc);
    expect(mockUploadService.uploadFile).toHaveBeenCalledTimes(3);
    expect(mockBrandAssetDoc.set).toHaveBeenCalledWith(
      expect.objectContaining({
        primaryColor: '#000000',
        secondaryColor: '#ffffff',
        primaryFont: 'Arial',
        secondaryFont: 'Times New Roman',
        toneOfVoice: 'Friendly',
      }),
    );
    expect(mockBrandAssetDoc.save).toHaveBeenCalled();
    expect(mockUploadService.deleteObject).not.toHaveBeenCalled(); // No delete on success
  });

  it('should upload logo, save to db and return', async () => {
    const userId = USER_ID;
    const upsertDto = {
      primaryColor: '#000000',
      secondaryColor: '#ffffff',
      primaryFont: 'Inter' as SupportedFonts,
      secondaryFont: 'Times New Roman' as SupportedFonts,
      toneOfVoice: 'Friendly' as ToneOfVoice,
    };

    // Mock files

    const files: IUploadedFiles = {
      primaryLogo: [
        createMockFile(
          'primaryLogo',
          'primary.png',
          'image/png',
          'test-primary',
        ),
      ],
    };

    const result = await service.upsertBrandAsset(userId, upsertDto, files);

    // Expectations
    expect(result).toBe(mockBrandAssetDoc);
    expect(mockUploadService.uploadFile).toHaveBeenCalledTimes(1); // only primary logo
    expect(mockBrandAssetDoc.set).toHaveBeenCalledWith(
      expect.objectContaining({
        primaryColor: '#000000',
        secondaryColor: '#ffffff',
        primaryFont: 'Inter',
        secondaryFont: 'Times New Roman',
        toneOfVoice: 'Friendly',
      }),
    );
    expect(mockBrandAssetDoc.save).toHaveBeenCalled();
    expect(mockUploadService.deleteObject).toHaveBeenCalledTimes(1); // delete old files on success
  });

  it('no files to upload, removePrimaryLogo, save to db and return', async () => {
    const userId = USER_ID;
    const upsertDto: UpsertBrandAssetDto = {
      primaryColor: '#000000',
      secondaryColor: '#ffffff',
      primaryFont: 'Inter' as SupportedFonts,
      secondaryFont: 'Times New Roman' as SupportedFonts,
      toneOfVoice: 'Friendly' as ToneOfVoice,
      removePrimaryLogo: true,
    };

    // Mock files
    const files2: IUploadedFiles = {};

    const result = await service.upsertBrandAsset(userId, upsertDto, files2);

    // const mockBrandAssetDoc = {
    //   _id: new Types.ObjectId(),
    //   primaryColor: '#000000',
    //   secondaryColor: '#ffffff',
    //   set: jest.fn(),
    //   save: jest.fn(),
    //   validate: jest.fn(),
    // };

    // mockBrandAssetModel.create = jest.fn().mockResolvedValue(mockBrandAssetDoc);

    // Expectations
    expect(result).toBe(mockBrandAssetDoc);
    expect(mockBrandAssetDoc.set).toHaveBeenCalledWith(
      expect.objectContaining({
        primaryColor: '#000000',
        secondaryColor: '#ffffff',
        primaryFont: 'Inter',
        secondaryFont: 'Times New Roman',
        toneOfVoice: 'Friendly',
      }),
    );
    expect(mockBrandAssetDoc.save).toHaveBeenCalled();
    expect(mockUploadService.deleteObject).toHaveBeenCalledTimes(1); // delete old files on success
    expect(mockUploadService.uploadFile).not.toHaveBeenCalled();
  });

  it('should throw InternalServerErrorException if business is not found', async () => {
    const upsertDto = {
      primaryColor: '#000000',
      secondaryColor: '#ffffff',
      primaryFont: 'Arial' as SupportedFonts,
      secondaryFont: 'Times New Roman' as SupportedFonts,
      toneOfVoice: 'Friendly' as ToneOfVoice,
    };
    const files: IUploadedFiles = {
      primaryLogo: [
        createMockFile(
          'primaryLogo',
          'primary.png',
          'image/png',
          'test-primary',
        ),
      ],
    };
    const previousFindOne = mockBusinessModel.findOne;
    mockBusinessModel.findOne = jest.fn().mockResolvedValue(null);

    await expect(
      service.upsertBrandAsset(new Types.ObjectId(), upsertDto, files),
    ).rejects.toThrow(InternalServerErrorException);

    mockBusinessModel.findOne = previousFindOne; // Restore original method
  });
});
