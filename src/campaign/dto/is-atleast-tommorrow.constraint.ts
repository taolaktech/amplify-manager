import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isAtLeastTomorrow', async: false })
export class IsAtLeastTodayConstraint implements ValidatorConstraintInterface {
  validate(dateString: string) {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return false;

    // Get "tomorrow" at midnight
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return date.getTime() >= tomorrow.getTime();
  }

  defaultMessage() {
    return 'date must be at least tomorrow (a valid ISO date string starting from tomorrow)';
  }
}
