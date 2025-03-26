import { Injectable, UnauthorizedException } from '@nestjs/common';
import firebaseAdmin from 'firebase-admin';
import path from 'node:path';

@Injectable()
export class FirebaseService {
  constructor() {
    // initialize firebase admin
    const serviceAccountCredentialsPath = path.join(
      __dirname,
      '..',
      '..',
      'secrets',
      'firebase-service-account-credentials.json',
    );
    try {
      firebaseAdmin.initializeApp({
        credential: firebaseAdmin.credential.cert(
          serviceAccountCredentialsPath,
        ),
      });
    } catch (error: any) {
      console.info(`Failed to initialize firebase admin.
        Suggestion: Create a file called '/secrets/firebase-service-account-credentials.json' in the project base directory with the appropriate firebase service account secrets from the firebase console. \n`);
      console.error({ error });
    }
  }

  async verifyIdToken(idToken: string) {
    {
      try {
        const decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);
        return decodedToken;
      } catch (error: any) {
        if (error.code === 'auth/id-token-expired') {
          throw new UnauthorizedException(error.message);
        }
        throw new UnauthorizedException('Cannot validate login');
      }
    }
  }
}
