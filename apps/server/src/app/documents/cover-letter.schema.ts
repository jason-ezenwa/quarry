import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  COVER_LETTER_LIMITS,
  DOCUMENT_NAME_MAX_LENGTH,
} from '@quarry/contracts';
import { HydratedDocument, Types } from 'mongoose';
import { ResumeContactEntry } from '../resume/resume.schema';

@Schema({ _id: false })
export class CoverLetterHeader {
  @Prop({ required: true, type: String })
  name: string;

  @Prop({
    required: true,
    type: SchemaFactory.createForClass(ResumeContactEntry),
  })
  contact: ResumeContactEntry;
}

// Each letter keeps the header it was saved with: by default the latest
// tailored resume's in the session, else the primary resume's.
@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'cover-letters',
})
export class CoverLetter {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  user: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'AgentSession' })
  session: Types.ObjectId;

  // The document's name.
  @Prop({ required: true, type: String, maxlength: DOCUMENT_NAME_MAX_LENGTH })
  title: string;

  @Prop({
    required: true,
    type: SchemaFactory.createForClass(CoverLetterHeader),
  })
  header: CoverLetterHeader;

  @Prop({ required: true, type: String })
  greeting: string;

  @Prop({
    required: true,
    type: [String],
    validate: {
      validator: (paragraphs: string[]) =>
        paragraphs.length >= COVER_LETTER_LIMITS.minParagraphs &&
        paragraphs.length <= COVER_LETTER_LIMITS.maxParagraphs,
      message: `A cover letter has ${COVER_LETTER_LIMITS.minParagraphs} to ${COVER_LETTER_LIMITS.maxParagraphs} paragraphs`,
    },
  })
  paragraphs: string[];

  @Prop({ required: true, type: String })
  signOff: string;

  createdAt: Date;
}

export type CoverLetterDocument = HydratedDocument<CoverLetter>;
export const CoverLetterSchema = SchemaFactory.createForClass(CoverLetter);
