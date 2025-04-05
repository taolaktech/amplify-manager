import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  LoginDto,
  ResendVerificationEmailDto,
  SignUpWithEmailDto,
  VerifyEmailDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto';
import { FirebaseService } from 'src/firebase/firebase.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserDoc } from 'src/database/schema';
import { DateTime } from 'luxon';
import { UtilsService } from 'src/utils/utils.service';
import { JwtService } from '@nestjs/jwt';
import { AppConfigService } from 'src/config/config.service';
import { ErrorCode } from 'src/enums';

@Injectable()
export class AuthService {
  constructor(
    private firebaseService: FirebaseService,
    private config: AppConfigService,
    @InjectModel('users') private userModel: Model<UserDoc>,
    private jwtService: JwtService,
    private util: UtilsService,
  ) {}

  async signUpWithEmailPassword(dto: SignUpWithEmailDto) {
    const userAlreadyExists = await this.userModel.findOne({
      email: dto.email,
    });

    if (userAlreadyExists) {
      throw new BadRequestException(ErrorCode.E_USER_ALREADY_EXISTS);
    }
    const firebaseUser = await this.firebaseService.createUser(
      dto.email,
      dto.password,
      dto.firstName + ' ' + dto.lastName,
    );

    const { otp, otpExpiryDate } = this.generateOtp();
    const user = this.userModel.create({
      email: dto.email,
      firebaseUserId: firebaseUser.uid,
      firstName: dto.firstName,
      lastName: dto.lastName,
      name: dto.firstName + ' ' + dto.lastName,
      otp,
      otpExpiryDate,
      photoUrl: firebaseUser.photoURL,
    });

    await this.sendOtpToEmail(dto.email, otp);

    return user;
  }

  private signJwt(userId: string) {
    const payload = {
      sub: userId,
    };
    const token = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_SECRET'),
    });
    return token;
  }

  private generateOtp() {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const otpExpiryDate = DateTime.now().plus({ minutes: 5 }).toJSDate();

    return { otp, otpExpiryDate };
  }

  private otpIsValid(user: UserDoc, otp: string) {
    const now = DateTime.now().toJSDate();

    if (otp !== user.otp || now > user.otpExpiryDate) {
      return false;
    }
    return true;
  }

  private async sendOtpToEmail(email: string, otp: string) {
    const body = `
    <h1>New Account Activity</h1>
    <p>Your OTP for current account activity is: ${otp}</p>
    <p>OTP will expire in 5 minutes</p>
    <p>&nbsp;</p>
    <p>The Amplify Team</p>
    `;

    await this.util.sendEmail({
      to: email,
      subject: 'Verify Your Email',
      message: body,
    });
  }

  async logIn(dto: LoginDto) {
    const firebaseUser = await this.firebaseService.verifyIdToken(dto.idToken);

    if (!firebaseUser.email_verified) {
      throw new BadRequestException(ErrorCode.E_UNVERIFIED_EMAIL);
    }

    let user = await this.userModel.findOne({
      email: firebaseUser.email,
    });

    if (!user) {
      user = await this.userModel.create({
        email: firebaseUser.email,
        name: firebaseUser.name ?? firebaseUser.displayName,
        firebaseUserId: firebaseUser.uid,
      });
    }

    const accessToken = this.signJwt(user.id);

    return {
      message: 'Log in successful',
      user,
      access_token: accessToken,
    };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    // get
    const user = await this.userModel.findOne({ email: dto.email });

    if (!user) {
      throw new BadRequestException(ErrorCode.E_USER_NOT_FOUND);
    }

    const otpIsValid = this.otpIsValid(user, dto.otp);

    if (!otpIsValid) {
      throw new BadRequestException('E_INVALID_OTP');
    }

    await this.firebaseService.verifyUserEmail(user.firebaseUserId);

    return {
      message: 'Email Verified Successfully',
    };
  }

  async resendEmailVerification(dto: ResendVerificationEmailDto) {
    // find user by email
    const user = await this.userModel.findOne({ email: dto.email });

    if (!user) {
      throw new BadRequestException(ErrorCode.E_USER_NOT_FOUND);
    }
    //check if already verified
    const firebaseUser = await this.firebaseService.getUserById(
      user.firebaseUserId,
    );

    if (firebaseUser.emailVerified) {
      throw new BadRequestException(ErrorCode.E_EMAIL_ALREADY_VERIFIED);
    }
    // generate otp and expriry
    const { otp, otpExpiryDate } = this.generateOtp();

    // hash otp
    const hashedOtp = otp;

    // update user
    user.otp = hashedOtp;
    user.otpExpiryDate = otpExpiryDate;

    await user.save();

    // send otp to email
    this.sendOtpToEmail(user.email, otp).catch(() => {
      console.log('Error sending email');
      // TODO Error handling or logging for this ??
    });

    return {
      message: 'Email sent successfully',
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userModel.findOne({ email: dto.email });

    if (!user) {
      throw new NotFoundException(ErrorCode.E_USER_NOT_FOUND);
    }

    const { otp, otpExpiryDate } = this.generateOtp();

    user.otp = otp;
    user.otpExpiryDate = otpExpiryDate;
    await user.save();

    // send otp to email
    this.sendOtpToEmail(user.email, otp).catch(() => {
      console.log('Error sending email');
    });

    return { message: 'Email sent' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.userModel.findOne({ email: dto.email });

    if (!user) {
      throw new NotFoundException(ErrorCode.E_USER_NOT_FOUND);
    }

    const otpIsValid = this.otpIsValid(user, dto.otp);

    if (!otpIsValid) {
      throw new BadRequestException(ErrorCode.E_INVALID_OTP);
    }

    await this.firebaseService.updateUserPassword(
      user.firebaseUserId,
      dto.newPassword,
    );

    return { message: 'Password Change Successful' };
  }
}
