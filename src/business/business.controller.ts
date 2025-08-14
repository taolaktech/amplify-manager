import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { BusinessService } from './business.service';
import {
  CalculateTargetRoasDto,
  GetCitiesDto,
  SetBusinessDetailsDto,
  SetBusinessGoalsDto,
  SetShippingLocationsDto,
  UpdateBusinessLogo,
} from './dto';
import { Types } from 'mongoose';
import { GetUser } from 'src/auth/decorators';
import { ApiBearerAuth, ApiBody, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { createMulterOptions } from 'src/common/create-multer-options';

@ApiBearerAuth()
@Controller('api/business')
export class BusinessController {
  constructor(private businessService: BusinessService) {}

  @Post('/details')
  async setBusiness(
    @GetUser('_id') userId: Types.ObjectId,
    @Body() dto: SetBusinessDetailsDto,
  ) {
    const business = await this.businessService.setBusinessDetails(userId, dto);
    return { business };
  }

  @Get('/')
  async getBusiness(@GetUser('_id') userId: Types.ObjectId) {
    const business = await this.businessService.getBusiness(userId);
    return { business };
  }

  @ApiBody({
    type: SetShippingLocationsDto,
    description: 'Shipping location Data',
    examples: {
      example_1: {
        value: {
          localShippingLocations: [
            {
              country: 'US',
              state: 'Florida',
              city: 'Miami',
              shorthand: 'Miami Florida, US',
            },
          ],
          internationalShippingLocations: ['Nigeria'],
        },
      },
    },
  })
  @Post('/set-shipping-locations')
  async setShippingLocations(
    @GetUser('_id') userId: Types.ObjectId,
    @Body() dto: SetShippingLocationsDto,
  ) {
    const shippingLocations = await this.businessService.setShippingLocations(
      userId,
      dto,
    );
    return { shippingLocations };
  }

  @Post('/set-goals')
  async setBusinessGoals(
    @GetUser('_id') userId: Types.ObjectId,
    @Body() dto: SetBusinessGoalsDto,
  ) {
    const businessGoals = await this.businessService.setBusinessGoals(
      userId,
      dto,
    );
    return { businessGoals };
  }

  @Post('/cities')
  async getCities(@Body() dto: GetCitiesDto) {
    const predictions = await this.businessService.getCities(dto.input);
    return predictions;
  }

  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Upload business logo',
    type: UpdateBusinessLogo,
  })
  @UseInterceptors(
    FileInterceptor(
      'businessLogo',
      createMulterOptions(5 * 1024 * 1024, [
        'image/png',
        'image/jpeg',
        'image/svg+xml',
      ]),
    ),
  )
  @Patch('/update-logo')
  async updateBusinessLogo(
    @GetUser('_id') userId: Types.ObjectId,
    @Body() dto: UpdateBusinessLogo,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const business = await this.businessService.updateBusinessLogo(
      userId,
      dto,
      file,
    );
    return { business };
  }

  @Post('/calculate-target-roas')
  async calculateTargetRoas(
    @GetUser('_id') userId: Types.ObjectId,
    @Body() dto: CalculateTargetRoasDto,
  ) {
    return await this.businessService.calculateTargetRoas(userId, dto);
  }
}
