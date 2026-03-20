import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // AuthGuard skips JWT for internal routes; avoid blocking internal calls.
    if (request?.url?.startsWith('/internal')) {
      return true;
    }

    const user = request.user;

    const hasActiveSubscription = user?.hasActiveSubscription === true;

    if (!hasActiveSubscription) {
      throw new ForbiddenException({
        message: 'Active subscription required',
        code: 'SUBSCRIPTION_REQUIRED',
      });
    }

    return true;
  }
}
