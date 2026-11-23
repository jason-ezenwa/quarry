import { PARTIAL_DATE_PATTERN, type Resume } from '@quarry/contracts';
import { Transform, Type } from 'class-transformer';
import { IsHttpUrl } from './is-http-url.decorator';
import {
  IsArray,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { DATE_MESSAGE } from '../resume.constants';
import type {
  ResumeCertification,
  ResumeContact,
  ResumeEducation,
  ResumeExperience,
  ResumeLink,
  ResumeProject,
  ResumeSkill,
} from '../resume.types';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class ResumeLinkDto implements ResumeLink {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  label: string;

  @IsHttpUrl()
  url: string;
}

export class ResumeContactDto implements ResumeContact {
  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResumeLinkDto)
  links: ResumeLinkDto[];
}

export class ResumeExperienceDto implements ResumeExperience {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  title: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  company: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @Matches(PARTIAL_DATE_PATTERN, { message: DATE_MESSAGE })
  startDate?: string;

  // Absent means the role is current.
  @IsOptional()
  @Matches(PARTIAL_DATE_PATTERN, { message: DATE_MESSAGE })
  endDate?: string;

  @IsArray()
  @IsString({ each: true })
  bullets: string[];
}

export class ResumeEducationDto implements ResumeEducation {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  school: string;

  @IsOptional()
  @IsString()
  qualification?: string;

  @IsOptional()
  @IsString()
  field?: string;

  @IsOptional()
  @Matches(PARTIAL_DATE_PATTERN, { message: DATE_MESSAGE })
  endDate?: string;

  @IsArray()
  @IsString({ each: true })
  details: string[];
}

export class ResumeSkillDto implements ResumeSkill {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class ResumeProjectDto implements ResumeProject {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsHttpUrl()
  url?: string;

  @IsArray()
  @IsString({ each: true })
  bullets: string[];
}

export class ResumeCertificationDto implements ResumeCertification {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  issuer?: string;

  @IsOptional()
  @Matches(PARTIAL_DATE_PATTERN, { message: DATE_MESSAGE })
  date?: string;
}

// A full resume: saving replaces every content field.
export class SaveResumeDto implements Resume {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsObject()
  @ValidateNested()
  @Type(() => ResumeContactDto)
  contact: ResumeContactDto;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResumeExperienceDto)
  experience: ResumeExperienceDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResumeEducationDto)
  education: ResumeEducationDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResumeSkillDto)
  skills: ResumeSkillDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResumeProjectDto)
  projects: ResumeProjectDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResumeCertificationDto)
  certifications: ResumeCertificationDto[];
}
