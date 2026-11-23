import type { Resume as ResumeContent } from '@quarry/contracts';
import type { PARSE_FAILURE_REASONS } from './resume-parser.constants';
import type { ResumeParseUsage } from './resume.schema';

export type ParseFailureReason = (typeof PARSE_FAILURE_REASONS)[number];

export type ParseLogContext = {
  resumeId: string;
  userId: string;
  model: string;
};

export type ParseResult = {
  content: ResumeContent;
  usage: ResumeParseUsage;
};
