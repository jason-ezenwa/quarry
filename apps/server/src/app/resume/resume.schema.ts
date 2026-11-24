import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type {
  ParseStatus,
  ResumeKind,
  UploadMimeType,
} from '@quarry/contracts';
import {
  DOCUMENT_NAME_MAX_LENGTH,
  UPLOAD_MIME_TYPES,
  PARSE_STATUSES,
  RESUME_KINDS,
} from '@quarry/contracts';
import { HydratedDocument, Types } from 'mongoose';
import type {
  ResumeCertification,
  ResumeContact,
  ResumeEducation,
  ResumeExperience,
  ResumeLink,
  ResumeProject,
  ResumeSkill,
} from './resume.types';

@Schema({ _id: false })
export class ResumeLinkEntry implements ResumeLink {
  @Prop({ required: true, type: String })
  label: string;

  @Prop({ required: true, type: String })
  url: string;
}

@Schema({ _id: false })
export class ResumeContactEntry implements ResumeContact {
  @Prop({ type: String })
  email?: string;

  @Prop({ type: String })
  phone?: string;

  @Prop({ type: String })
  location?: string;

  @Prop({ type: [SchemaFactory.createForClass(ResumeLinkEntry)], default: [] })
  links: ResumeLinkEntry[];
}

@Schema({ _id: false })
export class ResumeExperienceEntry implements ResumeExperience {
  @Prop({ required: true, type: String })
  title: string;

  @Prop({ required: true, type: String })
  company: string;

  @Prop({ type: String })
  location?: string;

  @Prop({ type: String })
  startDate?: string;

  @Prop({ type: String })
  endDate?: string;

  @Prop({ type: [String], default: [] })
  bullets: string[];
}

@Schema({ _id: false })
export class ResumeEducationEntry implements ResumeEducation {
  @Prop({ required: true, type: String })
  school: string;

  @Prop({ type: String })
  qualification?: string;

  @Prop({ type: String })
  field?: string;

  @Prop({ type: String })
  endDate?: string;

  @Prop({ type: [String], default: [] })
  details: string[];
}

@Schema({ _id: false })
export class ResumeSkillEntry implements ResumeSkill {
  @Prop({ required: true, type: String })
  name: string;
}

@Schema({ _id: false })
export class ResumeProjectEntry implements ResumeProject {
  @Prop({ required: true, type: String })
  name: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: String })
  url?: string;

  @Prop({ type: [String], default: [] })
  bullets: string[];
}

@Schema({ _id: false })
export class ResumeCertificationEntry implements ResumeCertification {
  @Prop({ required: true, type: String })
  name: string;

  @Prop({ type: String })
  issuer?: string;

  @Prop({ type: String })
  date?: string;
}

@Schema({ _id: false })
export class ResumeFile {
  @Prop({ required: true, type: String })
  path: string;

  @Prop({ required: true, type: String, enum: UPLOAD_MIME_TYPES })
  mimeType: UploadMimeType;

  @Prop({ required: true, type: String })
  originalName: string;

  @Prop({ required: true, type: Number })
  size: number;
}

@Schema({ _id: false })
export class ResumeParseUsage {
  @Prop({ required: true, type: String })
  model: string;

  @Prop({ required: true, type: Number })
  inputTokens: number;

  @Prop({ required: true, type: Number })
  outputTokens: number;
}

// The resume content fields stay empty until the first successful parse.
@Schema({ timestamps: true, collection: 'resumes' })
export class Resume {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  user: Types.ObjectId;

  @Prop({ required: true, type: String, enum: RESUME_KINDS })
  kind: ResumeKind;

  @Prop({ type: String })
  name?: string;

  @Prop({
    type: SchemaFactory.createForClass(ResumeContactEntry),
    default: () => ({ links: [] }),
  })
  contact: ResumeContactEntry;

  @Prop({ type: String })
  summary?: string;

  @Prop({
    type: [SchemaFactory.createForClass(ResumeExperienceEntry)],
    default: [],
  })
  experience: ResumeExperienceEntry[];

  @Prop({
    type: [SchemaFactory.createForClass(ResumeEducationEntry)],
    default: [],
  })
  education: ResumeEducationEntry[];

  @Prop({ type: [SchemaFactory.createForClass(ResumeSkillEntry)], default: [] })
  skills: ResumeSkillEntry[];

  @Prop({
    type: [SchemaFactory.createForClass(ResumeProjectEntry)],
    default: [],
  })
  projects: ResumeProjectEntry[];

  @Prop({
    type: [SchemaFactory.createForClass(ResumeCertificationEntry)],
    default: [],
  })
  certifications: ResumeCertificationEntry[];

  // Tailored resumes only: the application session it was written in.
  @Prop({ type: Types.ObjectId, ref: 'ApplicationSession' })
  session?: Types.ObjectId;

  // Tailored resumes only: the document's name. `name` is the person's.
  @Prop({ type: String, maxlength: DOCUMENT_NAME_MAX_LENGTH })
  title?: string;

  // Tailored resumes only: the resume an edit was copied from.
  @Prop({ type: Types.ObjectId, ref: 'Resume' })
  sourceResume?: Types.ObjectId;

  // Primary resumes only, from here down.
  @Prop({ type: SchemaFactory.createForClass(ResumeFile) })
  file?: ResumeFile;

  @Prop({ type: String, enum: PARSE_STATUSES })
  parseStatus?: ParseStatus;

  // Set each time a parse is claimed.
  @Prop({ type: Date })
  parseStartedAt?: Date;

  @Prop({ type: Date, default: null })
  parsedAt: Date | null;

  // A short reason, never resume content.
  @Prop({ type: String, default: null })
  parseError: string | null;

  @Prop({
    type: SchemaFactory.createForClass(ResumeParseUsage),
    default: null,
  })
  parseUsage: ResumeParseUsage | null;

  @Prop({ type: Date, default: null })
  reviewedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export type ResumeDocument = HydratedDocument<Resume>;
export const ResumeSchema = SchemaFactory.createForClass(Resume);
