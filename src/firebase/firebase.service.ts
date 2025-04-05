import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import firebaseAdmin from 'firebase-admin';
import { AppConfigService } from 'src/config/config.service';

@Injectable()
export class FirebaseService {
  constructor(private config: AppConfigService) {
    // initialize firebase admin
    const firebaseSirverAccoutCred = this.config.get('FIREBASE_SERVICE_ACCOUNT_JSON');
    try {
      const serviceAccount = JSON.parse(firebaseSirverAccoutCred);
      firebaseAdmin.initializeApp({
        credential: firebaseAdmin.credential.cert(
          serviceAccount,
        ),
      });
    } catch (error: any) {
      console.info(`Failed to initialize firebase admin.
        Suggestion: Create a file called '/secrets/firebase-service-account-credentials.json' in the project base directory with the appropriate firebase service account secrets from the firebase console. \n`);
      console.error({ error });
    }
  }

  async verifyIdToken(idToken: string) {
    try {
      const decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);
      return decodedToken;
    } catch (error: any) {
      if (error.code === 'auth/id-token-expired') {
        throw new UnauthorizedException(error.message);
      }
      throw new UnauthorizedException('Cannot validate Login');
    }
  }

  async generateEmailVerificationUrl(email: string) {
    try {
      const url = await firebaseAdmin
        .auth()
        .generateEmailVerificationLink(email);

      return url;
    } catch {
      throw new InternalServerErrorException('Something went wrong');
    }
  }

  async createUser(email: string, password: string, displayName: string) {
    try {
      const user = await firebaseAdmin.auth().createUser({
        email,
        password,
        displayName,
      });
      return user;
    } catch {
      throw new InternalServerErrorException('Something went wrong');
    }
  }

  async verifyUserEmail(uid: string) {
    try {
      await firebaseAdmin.auth().updateUser(uid, { emailVerified: true });
    } catch {
      throw new InternalServerErrorException('Something went wrong');
    }
  }

  async getUserByEmail(email: string) {
    try {
      const user = await firebaseAdmin.auth().getUserByEmail(email);
      return user;
    } catch {
      throw new InternalServerErrorException('Something went wrong');
    }
  }

  async getUserById(uid: string) {
    try {
      const user = await firebaseAdmin.auth().getUser(uid);
      return user;
    } catch {
      throw new InternalServerErrorException('Something went wrong');
    }
  }

  async updateUserPassword(uid: string, password: string) {
    try {
      await firebaseAdmin.auth().updateUser(uid, { password: password });
    } catch {
      throw new InternalServerErrorException('Something Went Wrong');
    }
  }
}
