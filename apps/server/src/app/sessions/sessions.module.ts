import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiModule } from '../ai/ai.module';
import { DocumentsModule } from '../documents/documents.module';
import { ProfileGateModule } from '../profile/profile-gate.module';
import { ProfileModule } from '../profile/profile.module';
import { ResumeModule } from '../resume/resume.module';
import { AgentToolsFactory } from './agent/agent-tools.factory';
import { AgentService } from './agent/agent.service';
import { InterviewFeedbackService } from './interviews/feedback/feedback.service';
import { Interview, InterviewSchema } from './interviews/interview.schema';
import { InterviewsService } from './interviews/interviews.service';
import { jobFetcherProviders } from './job-fetcher/job-fetcher.providers';
import { Message, MessageSchema } from './message.schema';
import { AgentSession, AgentSessionSchema } from './session.schema';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { TurnLockReset } from './turn-lock-reset';
import { UsageController } from './usage.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AgentSession.name, schema: AgentSessionSchema },
      { name: Message.name, schema: MessageSchema },
      { name: Interview.name, schema: InterviewSchema },
    ]),
    AiModule,
    DocumentsModule,
    ProfileGateModule,
    ProfileModule,
    ResumeModule,
  ],
  controllers: [SessionsController, UsageController],
  providers: [
    SessionsService,
    AgentService,
    AgentToolsFactory,
    InterviewsService,
    InterviewFeedbackService,
    ...jobFetcherProviders,
    TurnLockReset,
  ],
})
export class SessionsModule {}
