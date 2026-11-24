import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  COVER_LETTER_LIMITS,
  DOCUMENT_NAME_MAX_LENGTH,
} from '@quarry/contracts';
import { HydratedDocument, Types } from 'mongoose';

// The writer's name and contact details aren't stored: they come from the
// primary resume whenever the letter is shown or exported.
@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'cover-letters',
})
export class CoverLetter {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  user: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'ApplicationSession' })
  session: Types.ObjectId;

  // The document's name.
  @Prop({ required: true, type: String, maxlength: DOCUMENT_NAME_MAX_LENGTH })
  title: string;

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
