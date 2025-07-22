import {
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { BusinessService } from './business.service';
import {
  GetCitiesDto,
  LogoUploadDto,
  SetBusinessDetailsDto,
  SetBusinessGoalsDto,
  SetShippingLocationsDto,
} from './dto';
import { Types } from 'mongoose';
import { GetUser } from 'src/auth/decorators';
import { ApiBearerAuth, ApiBody, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';

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

  @Post('/logo-upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Logo-Upload',
    type: LogoUploadDto,
  })
  async uploadLogo(
    @GetUser('_id') userId: Types.ObjectId,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return await this.businessService.uploadLogo(userId, file);
  }
}
