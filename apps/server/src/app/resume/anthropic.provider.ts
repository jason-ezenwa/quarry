import { createAnthropic, type AnthropicProvider } from '@ai-sdk/anthropic';
import type { FactoryProvider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ANTHROPIC_BASE_URL } from './resume.constants';

export const ANTHROPIC = Symbol('ANTHROPIC');

export const anthropicProvider: FactoryProvider<AnthropicProvider> = {
  provide: ANTHROPIC,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) =>
    createAnthropic({
      apiKey: configService.getOrThrow<string>('APP_ANTHROPIC_API_KEY'),
      baseURL: ANTHROPIC_BASE_URL,
    }),
};
