import { applyDecorators, UseGuards } from '@nestjs/common';
import { SubscriptionGuard } from '../guards/subscription.guard';

export function RequireActiveSubscription() {
  return applyDecorators(UseGuards(SubscriptionGuard));
}
