import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return '<h2>Amplify Manager 🔥</h2>';
  }
}
