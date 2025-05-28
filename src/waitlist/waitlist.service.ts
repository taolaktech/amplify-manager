import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WaitlistDoc } from 'src/database/schema';

@Injectable()
export class WaitlistService {
  constructor(
    @InjectModel('waitlist') private waitlistModel: Model<WaitlistDoc>,
  ) {}

  async addToWaitlist(email: string) {
    const emailAlreadyPresent = await this.waitlistModel.findOne({ email });

    if (emailAlreadyPresent) {
      throw new BadRequestException(`email already in waitlist`);
    }

    await this.waitlistModel.create({ email });
  }
}
