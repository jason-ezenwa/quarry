import type {
  PrimaryResumeResponse,
  Resume as ResumeContent,
} from '@quarry/contracts';
import type { UpdateQuery } from 'mongoose';
import type { Resume, ResumeDocument } from './resume.schema';

// Unsets optional fields the new content leaves out, so nothing old survives.
export function toResumeContentUpdate(
  content: ResumeContent,
  fields: Partial<Resume>,
): UpdateQuery<Resume> {
  const $set = {
    ...fields,
    name: content.name,
    contact: content.contact,
    experience: content.experience,
    education: content.education,
    skills: content.skills,
    projects: content.projects,
    certifications: content.certifications,
  };

  if (content.summary === undefined) {
    return { $set, $unset: { summary: 1 } };
  }

  return { $set: { ...$set, summary: content.summary } };
}

export function toResumeContent(resume: ResumeDocument): ResumeContent {
  const plain = resume.toObject();

  return {
    name: plain.name ?? '',
    contact: plain.contact,
    ...(plain.summary !== undefined && { summary: plain.summary }),
    experience: plain.experience,
    education: plain.education,
    skills: plain.skills,
    projects: plain.projects,
    certifications: plain.certifications,
  };
}

export function toPrimaryResumeResponse(
  resume: ResumeDocument,
): PrimaryResumeResponse {
  if (!resume.file || !resume.parseStatus) {
    throw new Error('Not a primary resume');
  }

  return {
    id: resume._id.toHexString(),
    parseStatus: resume.parseStatus,
    parsedAt: resume.parsedAt?.toISOString() ?? null,
    reviewedAt: resume.reviewedAt?.toISOString() ?? null,
    file: {
      originalName: resume.file.originalName,
      mimeType: resume.file.mimeType,
      size: resume.file.size,
    },
    // parsedAt stays set through a re-parse, so the last good content shows.
    resume: resume.parsedAt ? toResumeContent(resume) : null,
  };
}
