import type {
  DocumentHeader,
  PrimaryResumeResponse,
  Resume as ResumeContent,
  ResumeSections,
  TailoredResumeContent,
  TailoredResumeDocumentResponse,
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

// A copy of `source` with each given section replaced whole.
export function replaceSections(
  source: TailoredResumeContent,
  sections: ResumeSections,
): TailoredResumeContent {
  const given = Object.fromEntries(
    Object.entries(sections).filter(([, value]) => value !== undefined),
  );

  return structuredClone({ ...source, ...given });
}

// The body only: a tailored resume's header is always the primary's.
export function toTailoredResumeContent(
  resume: ResumeDocument,
): TailoredResumeContent {
  const { name: _name, contact: _contact, ...body } = toResumeContent(resume);

  return body;
}

// A tailored resume's name, which every save sets.
export function tailoredTitleOf(resume: ResumeDocument): string {
  if (resume.kind !== 'tailored' || !resume.title) {
    throw new Error('Not a tailored resume');
  }

  return resume.title;
}

export function toTailoredResumeResponse(
  resume: ResumeDocument,
  header: DocumentHeader,
): TailoredResumeDocumentResponse {
  return {
    id: resume._id.toHexString(),
    kind: 'resume',
    name: tailoredTitleOf(resume),
    resume: { ...header, ...toTailoredResumeContent(resume) },
    sourceResumeId: resume.sourceResume?.toHexString() ?? null,
    createdAt: resume.createdAt.toISOString(),
  };
}
