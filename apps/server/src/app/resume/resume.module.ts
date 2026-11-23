import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProfileGateModule } from '../profile/profile-gate.module';
import { StorageModule } from '../storage/storage.module';
import { anthropicProvider } from './anthropic.provider';
import { InterruptedParseRecovery } from './interrupted-parse-recovery';
import { ResumeParserService } from './resume-parser.service';
import { ResumeController } from './resume.controller';
import {
  DEFAULT_PARSE_RETRY_DELAYS_MS,
  PARSE_RETRY_DELAYS_MS,
} from './resume.constants';
import { Resume, ResumeSchema } from './resume.schema';
import { ResumeService } from './resume.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Resume.name, schema: ResumeSchema }]),
    StorageModule,
    ProfileGateModule,
  ],
  controllers: [ResumeController],
  providers: [
    anthropicProvider,
    { provide: PARSE_RETRY_DELAYS_MS, useValue: DEFAULT_PARSE_RETRY_DELAYS_MS },
    ResumeParserService,
    ResumeService,
    InterruptedParseRecovery,
  ],
  exports: [ResumeService],
})
export class ResumeModule {}
