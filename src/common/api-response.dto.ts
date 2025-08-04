import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto<T> {
  @ApiProperty({ example: 'success' })
  status: string;

  @ApiProperty()
  message: string;

  data: T;
}
