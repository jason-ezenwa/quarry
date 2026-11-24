import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { UIMessage } from 'ai';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export const MESSAGE_ROLES = ['user', 'assistant'] as const;
export type MessageRole = (typeof MESSAGE_ROLES)[number];

@Schema({ _id: false })
export class MessageUsage {
  @Prop({ required: true, type: String })
  model: string;

  @Prop({ required: true, type: Number })
  inputTokens: number;

  @Prop({ required: true, type: Number })
  outputTokens: number;

  @Prop({ required: true, type: Number })
  cacheReadTokens: number;

  @Prop({ required: true, type: Number })
  cacheWriteTokens: number;
}

// Append-only: a stored message and its parts are never edited or deleted,
// because Claude refuses a history that changed before a thinking block.
@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'messages',
  // Parts keep every key the SDK gave them, such as provider metadata.
  minimize: false,
})
export class Message {
  @Prop({ required: true, type: Types.ObjectId, ref: 'ApplicationSession' })
  session: Types.ObjectId;

  // The AI SDK message id.
  @Prop({ required: true, type: String })
  uiId: string;

  @Prop({ required: true, type: String, enum: MESSAGE_ROLES })
  role: MessageRole;

  // AI SDK UI message parts exactly as produced, including reasoning and
  // compaction parts with their provider metadata.
  @Prop({ required: true, type: [MongooseSchema.Types.Mixed] })
  parts: UIMessage['parts'];

  // Assistant only: the turn's total across steps. Kept beside the parts so
  // it never reaches Claude or the web app.
  @Prop({ type: SchemaFactory.createForClass(MessageUsage), default: null })
  usage: MessageUsage | null;

  createdAt: Date;
}

export type MessageDocument = HydratedDocument<Message>;
export const MessageSchema = SchemaFactory.createForClass(Message);
