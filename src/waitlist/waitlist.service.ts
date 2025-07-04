import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WaitlistDoc } from 'src/database/schema';
import { AddToWaitlistDto } from './dto';

@Injectable()
export class WaitlistService {
  constructor(
    @InjectModel('waitlist') private waitlistModel: Model<WaitlistDoc>,
  ) {}

  async addToWaitlist(dto: AddToWaitlistDto) {
    const emailAlreadyPresent = await this.waitlistModel.findOne({
      email: dto.email,
    });

    if (emailAlreadyPresent) {
      throw new BadRequestException(`Already in waitlist`);
    }

    await this.waitlistModel.create({
      email: dto.email,
      name: dto.name,
      shopifyUrl: dto.shopifyUrl,
      salesLocations: dto.salesLocations,
    });
  }
}
