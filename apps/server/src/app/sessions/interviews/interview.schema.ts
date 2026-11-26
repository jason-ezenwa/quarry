import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ _id: false })
export class InterviewQuestionEntry {
  @Prop({ required: true, type: Number })
  number: number;

  @Prop({ required: true, type: String })
  question: string;
}

@Schema({ _id: false })
export class InterviewFollowUpEntry {
  @Prop({ required: true, type: String })
  question: string;

  @Prop({ type: String, default: '' })
  answer: string;
}

@Schema({ _id: false })
export class InterviewQuestionAndAnswerEntry {
  @Prop({ required: true, type: String })
  question: string;

  // Empty when the question went unanswered.
  @Prop({ type: String, default: '' })
  answer: string;

  @Prop({
    type: [SchemaFactory.createForClass(InterviewFollowUpEntry)],
    default: [],
  })
  followUps: InterviewFollowUpEntry[];
}

@Schema({ _id: false })
export class StrongerAnswerEntry {
  @Prop({ required: true, type: String })
  question: string;

  @Prop({ required: true, type: String })
  said: string;

  @Prop({ required: true, type: String })
  stronger: string;
}

@Schema({ _id: false })
export class InterviewFeedbackEntry {
  @Prop({ required: true, type: [String] })
  wentWell: string[];

  @Prop({ required: true, type: [String] })
  toImprove: string[];

  @Prop({
    required: true,
    type: [SchemaFactory.createForClass(StrongerAnswerEntry)],
  })
  strongerAnswers: StrongerAnswerEntry[];

  @Prop({ type: String, default: '' })
  additionalNotes: string;
}

// `feedback` and `endedAt` are written together, so an interview with one has both.
@Schema({ timestamps: true, collection: 'interviews', minimize: false })
export class Interview {
  @Prop({ required: true, type: Types.ObjectId, ref: 'AgentSession' })
  session: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  user: Types.ObjectId;

  // Rendered once at creation and sent unchanged every turn.
  @Prop({ required: true, type: String })
  context: string;

  // Set by setup_interview.
  @Prop({ type: Number })
  totalQuestions?: number;

  // Numbered by the server, in the order asked.
  @Prop({
    type: [SchemaFactory.createForClass(InterviewQuestionEntry)],
    default: [],
  })
  questions: InterviewQuestionEntry[];

  // Grouped from the messages when the interview ends.
  @Prop({
    type: [SchemaFactory.createForClass(InterviewQuestionAndAnswerEntry)],
    default: [],
  })
  questionsAndAnswers: InterviewQuestionAndAnswerEntry[];

  @Prop({ type: SchemaFactory.createForClass(InterviewFeedbackEntry) })
  feedback?: InterviewFeedbackEntry;

  @Prop({ type: Date })
  endedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export type InterviewDocument = HydratedDocument<Interview>;

export const InterviewSchema = SchemaFactory.createForClass(Interview);
