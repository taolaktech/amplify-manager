import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AppConfigService } from 'src/config/config.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private configService: AppConfigService) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();

    const apiKey = this.configService.get('API_KEY');

    // skip requests from client(browser)
    if (!request.url.startsWith('/internal')) {
      return true; // skip JWT for internal routes
    }

    if (apiKey !== request.headers['x-api-key']) {
      throw new ForbiddenException('FORBIDDEN');
    }

    return true;
  }
}
