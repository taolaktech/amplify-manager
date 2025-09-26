import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isAtLeastTomorrow', async: false })
export class IsAtLeastTomorrowConstraint
  implements ValidatorConstraintInterface
{
  validate(dateString: string) {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return false;

    // Get "tomorrow" at midnight
    const now = new Date();
    const tomorrow = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
    );

    return date.getTime() >= tomorrow.getTime();
  }

  defaultMessage() {
    return 'date must be at least tomorrow (a valid ISO date string starting from tomorrow)';
  }
}
