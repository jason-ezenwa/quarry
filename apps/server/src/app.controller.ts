import { Controller, Get } from '@nestjs/common';
import { Public } from '@thallesp/nestjs-better-auth';

@Controller()
export class AppController {
  @Public()
  @Get('health')
  healthCheck(): { status: string } {
    return { status: 'ok' };
  }
}
