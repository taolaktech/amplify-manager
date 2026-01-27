import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isAtLeastToday', async: false })
export class IsAtLeastTodayConstraint implements ValidatorConstraintInterface {
  validate(dateString: string) {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return false;

    // Allow "today" (any time today) or any future date.
    // We compare against the start of the current day in the server's local timezone.
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    return date.getTime() >= startOfToday.getTime();
  }

  defaultMessage() {
    return 'date must be at least today (a valid ISO date string starting from today)';
  }
}
