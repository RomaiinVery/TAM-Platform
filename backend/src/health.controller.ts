import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('/status')
  status() {
    return { ok: true, service: 'backend', ts: Date.now() };
  }
}