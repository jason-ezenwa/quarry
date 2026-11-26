import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  JOB_SOURCES,
  SESSION_KINDS,
  type JobSource,
  type SessionKind,
} from '@quarry/contracts';
import { HydratedDocument, Types } from 'mongoose';
import { DEFAULT_SESSION_TITLE } from './sessions.constants';

@Schema({ _id: false })
export class SessionJob {
  @Prop({ type: String })
  url?: string;

  // Unset for a link until the job tool reads it.
  @Prop({ type: String, enum: JOB_SOURCES })
  source?: JobSource;

  @Prop({ type: String })
  location?: string;

  // The cleaned text, kept for mock interviews.
  @Prop({ type: String })
  description?: string;

  @Prop({ type: Date })
  fetchedAt?: Date;
}

// `sessions` is Better Auth's, so agent sessions have their own name.
@Schema({ timestamps: true, collection: 'agent-sessions' })
export class AgentSession {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  user: Types.ObjectId;

  @Prop({
    required: true,
    type: String,
    enum: SESSION_KINDS,
    default: 'application',
  })
  kind: SessionKind;

  // An interview's application; absent on applications.
  @Prop({ type: Types.ObjectId, ref: 'AgentSession' })
  parentSession?: Types.ObjectId;

  @Prop({ required: true, type: String, default: DEFAULT_SESSION_TITLE })
  title: string;

  @Prop({ type: String })
  company?: string;

  @Prop({ type: SchemaFactory.createForClass(SessionJob) })
  job?: SessionJob;

  @Prop({ required: true, type: Number, default: 0 })
  userMessageCount: number;

  // The turn lock: set while a turn runs.
  @Prop({ type: Date, default: null })
  turnStartedAt: Date | null;

  @Prop({ type: Date, default: null })
  archivedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export type AgentSessionDocument = HydratedDocument<AgentSession>;

export const AgentSessionSchema = SchemaFactory.createForClass(AgentSession);
