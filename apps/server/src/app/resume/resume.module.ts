import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiModule } from '../ai/ai.module';
import { ProfileGateModule } from '../profile/profile-gate.module';
import { StorageModule } from '../storage/storage.module';
import { InterruptedParseRecovery } from './parser/interrupted-parse-recovery';
import { ResumeParserService } from './parser/parser.service';
import { ResumeController } from './resume.controller';
import {
  DEFAULT_PARSE_RETRY_DELAYS_MS,
  PARSE_RETRY_DELAYS_MS,
} from './parser/parser.constants';
import { Resume, ResumeSchema } from './resume.schema';
import { ResumeService } from './resume.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Resume.name, schema: ResumeSchema }]),
    StorageModule,
    ProfileGateModule,
    AiModule,
  ],
  controllers: [ResumeController],
  providers: [
    { provide: PARSE_RETRY_DELAYS_MS, useValue: DEFAULT_PARSE_RETRY_DELAYS_MS },
    ResumeParserService,
    ResumeService,
    InterruptedParseRecovery,
  ],
  exports: [ResumeService],
})
export class ResumeModule {}
