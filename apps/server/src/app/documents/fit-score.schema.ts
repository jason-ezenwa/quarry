import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { FIT_SCORE_LIMITS } from '@quarry/contracts';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ _id: false })
export class FitScoreDimension {
  // 0 to 10.
  @Prop({ required: true, type: Number })
  score: number;

  @Prop({ required: true, type: String })
  detail: string;
}

const dimension = {
  required: true,
  type: SchemaFactory.createForClass(FitScoreDimension),
};

@Schema({ _id: false })
export class FitScoreDimensions {
  @Prop(dimension)
  requirements: FitScoreDimension;

  @Prop(dimension)
  skills: FitScoreDimension;

  @Prop(dimension)
  seniority: FitScoreDimension;

  @Prop(dimension)
  domain: FitScoreDimension;
}

// The label is derived from `overall` on read.
@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'fit-scores',
})
export class FitScore {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  user: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'ApplicationSession' })
  session: Types.ObjectId;

  // The document's name.
  @Prop({
    required: true,
    type: String,
    maxlength: FIT_SCORE_LIMITS.nameMaxLength,
  })
  title: string;

  @Prop({ required: true, type: String })
  role: string;

  @Prop({ type: String })
  company?: string;

  @Prop({
    required: true,
    type: SchemaFactory.createForClass(FitScoreDimensions),
  })
  dimensions: FitScoreDimensions;

  @Prop({ required: true, type: [String] })
  strengths: string[];

  @Prop({ required: true, type: [String] })
  gaps: string[];

  // Out of 100, unrounded, computed from the dimensions' weights.
  @Prop({ required: true, type: Number })
  overall: number;

  createdAt: Date;
}

export type FitScoreDocument = HydratedDocument<FitScore>;
export const FitScoreSchema = SchemaFactory.createForClass(FitScore);
