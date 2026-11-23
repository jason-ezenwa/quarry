import type { Resume as ResumeContent } from '@quarry/contracts';
import type { StoredFile } from '../storage/storage.types';

export type CreatePrimaryResumeInput = {
  userId: string;
  file: StoredFile;
};

export type ResumeContact = ResumeContent['contact'];
export type ResumeLink = ResumeContact['links'][number];
export type ResumeExperience = ResumeContent['experience'][number];
export type ResumeEducation = ResumeContent['education'][number];
export type ResumeSkill = ResumeContent['skills'][number];
export type ResumeProject = ResumeContent['projects'][number];
export type ResumeCertification = ResumeContent['certifications'][number];
