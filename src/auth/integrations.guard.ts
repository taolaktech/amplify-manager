import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AppConfigService } from 'src/config/config.service';

@Injectable()
export class IntegrationsGaurd implements CanActivate {
  constructor(private configService: AppConfigService) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();

    const apiKey = this.configService.get('INTEGRATION_API_KEY');

    if (apiKey !== request.headers['x-api-key']) {
      throw new ForbiddenException('FORBIDDEN');
    }

    return true;
  }
}
