import { Controller, Get } from '@nestjs/common';
import {
  MemoryHealthIndicator,
  HealthCheckService,
  HealthCheck,
  MongooseHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
// import { Public } from 'src/auth/decorator';

@Controller('health-check')
export class HealthcheckController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
    private readonly mongo: MongooseHealthIndicator,
    private readonly disk: DiskHealthIndicator,
  ) {}

  // @Public()
  @Get()
  @HealthCheck()
  index() {
    return this.health.check([
      () => this.mongo.pingCheck('mongodb'),
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
      () =>
        this.disk.checkStorage('storage', {
          // thresholdPercent: 0.5,
          threshold: 250 * 1024 * 1024 * 1024,
          path: 'C:\\',
        }),
    ]);
  }
}
