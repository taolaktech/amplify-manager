import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
// import { AuthService } from '../../modules/auth/auth.service';

@Injectable()
export class InternalGuard implements CanActivate {
  private readonly logger = new Logger(InternalGuard.name);

  constructor() {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      this.logger.warn('Missing Authorization header for internal request');
      // throw new UnauthorizedException('Missing authorization header');
      return false;
    }

    // Extract the token from the Authorization header
    // Expected format: "Internal <token>"
    const [type, token] = authHeader.split(' ');

    if (type !== 'Internal' || !token) {
      this.logger.warn(
        `::: Invalid internal Authorization header format: ${authHeader} :::`,
      );
      return false;
    }

    // Verify the internal token
    const isValid = this.verifyInternalToken(token);

    if (!isValid) {
      this.logger.warn('::: Invalid internal token :::');
      return false;
    }

    // Mark the request as internal
    request.isInternalRequest = true;

    return true;
  }

  private extractTokenFromHeader(request: Request): string | null {
    const headers: any = request.headers;
    const [type, token] = headers.authorization.split(' ');
    return type === 'Internal' ? token : null;
  }

  verifyInternalToken(token: string): boolean {
    // Simple verification for internal token
    // In a real-world scenario, you might want to use a more secure approach
    return token === process.env.INTERNAL_REQUEST_TOKEN;
  }
}
