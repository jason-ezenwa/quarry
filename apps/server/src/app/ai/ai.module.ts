import { Module } from '@nestjs/common';
import { anthropicProvider } from './anthropic.provider';

// One Anthropic client for every module that calls Claude.
@Module({
  providers: [anthropicProvider],
  exports: [anthropicProvider],
})
export class AiModule {}
