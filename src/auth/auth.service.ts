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
      signUpMethod: 'password',
    });

    this.sendOtpToEmail(dto.email, otp).catch(() => undefined);

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

  private generateResetPasswordToken(userId: string) {
    const payload = {
      sub: userId,
    };
    const token = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: '15m',
    });
    return token;
  }

  private verifyResetPasswordToken(token: string) {
    try {
      const payload = this.jwtService.verify<{ sub: string }>(token, {
        secret: this.config.get('JWT_SECRET'),
      });
      return payload.sub;
    } catch {
      throw new BadRequestException(ErrorCode.E_INVALID_TOKEN);
    }
  }

  private generateResetPasswordUrl(userId: string) {
    const token = this.generateResetPasswordToken(userId);

    const resetPasswordUrl = `${this.config.get(
      'CLIENT_BASE_URL',
    )}/auth/reset-password?token=${token}`;

    return resetPasswordUrl;
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

  private async sendForgotPasswordEmail(params: {
    email: string;
    url: string;
    name: string;
  }) {
    const name = params.name.split(' ')[0];
    const body = `<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2c3e50; text-align: center;">Password Reset Request</h1>
        <p>Hello ${name},</p>
        <p>We received a request to reset your password for your Amplify account. </p>
        <p>Click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${params.url}"
            style="background-color: #4CAF50; color: white; padding: 15px 32px; text-decoration: none; display: inline-block; border-radius: 4px; font-weight: bold;">
            Reset Password
          </a>
        </div>
        <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
        <hr style="border: 1px solid #eee; margin: 20px 0;">
        <p style="text-align: center; color: #666;">
          Best regards,<br>
          The Amplify Team
        </p>
      </div>
    </body>`;

    await this.util.sendEmail({
      to: params.email,
      subject: 'Password Reset Request',
      message: body,
    });
  }

  async logIn(dto: LoginDto) {
    const firebaseUser = await this.firebaseService.verifyIdToken(dto.idToken);

    if (!firebaseUser.email_verified) {
      throw new BadRequestException(ErrorCode.E_UNVERIFIED_EMAIL);
    }
    let userCreated = false;
    let user = await this.userModel.findOne({
      email: firebaseUser.email,
    });
    if (!user) {
      userCreated = true;
      user = await this.userModel.create({
        email: firebaseUser.email,
        name: firebaseUser.name ?? firebaseUser.displayName,
        firebaseUserId: firebaseUser.uid,
        signUpMethod: firebaseUser.firebase.sign_in_provider,
      });
    }

    const accessToken = this.signJwt(user.id);

    return {
      message: 'Log in successful',
      user: { ...user.toObject(), otp: undefined, otpExpiryDate: undefined },
      userCreated,
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

    const accessToken = this.signJwt(user.id);

    return {
      message: 'Email Verified Successfully',
      access_token: accessToken,
      user: { ...user.toObject(), otp: undefined, otpExpiryDate: undefined },
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

    const url = this.generateResetPasswordUrl(user.id);

    this.sendForgotPasswordEmail({
      email: user.email,
      name: user.name,
      url,
    }).catch(() => {
      console.log('Error sending email');
    });

    return { message: 'Email sent' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const userId = this.verifyResetPasswordToken(dto.token);

    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException(ErrorCode.E_USER_NOT_FOUND);
    }

    if (user.passwordChangedAt) {
      const minutesSincePasswordChange = DateTime.now().diff(
        DateTime.fromJSDate(user.passwordChangedAt),
        'minutes',
      ).minutes;

      if (minutesSincePasswordChange < 15) {
        throw new BadRequestException(ErrorCode.E_PASSWORD_CHANGED_RECENTLY);
      }
    }

    await this.firebaseService.updateUserPassword(
      user.firebaseUserId,
      dto.newPassword,
    );

    user.passwordChangedAt = DateTime.now().toJSDate();

    await user.save();

    return { message: 'Password Change Successful' };
  }

  async userExists(email: string) {
    const user = await this.firebaseService.getUserByEmail(email);

    return { userExists: !!user };
  }
}
