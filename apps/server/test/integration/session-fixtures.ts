import type { FitScoreInput, Resume } from '@quarry/contracts';
import { Types } from 'mongoose';
import { getTestDatabase } from './database';

export const primaryResume: Resume = {
  name: 'Ada Obi',
  contact: { email: 'ada@example.com', links: [] },
  summary: 'Backend engineer focused on payments.',
  experience: [
    {
      title: 'Backend Engineer',
      company: 'Paystack',
      startDate: '2021-03',
      bullets: ['Built the settlement service.'],
    },
  ],
  education: [],
  skills: [{ name: 'TypeScript' }],
  projects: [],
  certifications: [],
};

export const fitScoreInput: FitScoreInput = {
  name: 'First read',
  role: 'Senior Backend Engineer',
  company: 'Moniepoint',
  dimensions: {
    requirements: { score: 7.9, detail: '5 of 7 met, 1 partial' },
    skills: { score: 8.9, detail: 'Strong overlap' },
    seniority: { score: 8.5, detail: 'Senior, matches' },
    domain: { score: 10, detail: 'Payments' },
  },
  strengths: ['Six years in payments.'],
  gaps: ['No Kafka.'],
};

// `parsing` is a resume being read again after a re-upload.
type ResumeState = 'reviewed' | 'unreviewed' | 'parsing' | 'failed';

const PARSE_STATUS: Record<ResumeState, string> = {
  reviewed: 'parsed',
  unreviewed: 'parsed',
  parsing: 'parsing',
  failed: 'failed',
};

// What onboarding leaves behind, written straight to the database so these
// specs don't depend on uploads and parsing.
export async function seedOnboarded(
  userId: string,
  resumeState: ResumeState = 'reviewed',
): Promise<void> {
  const user = new Types.ObjectId(userId);
  const now = new Date();

  await getTestDatabase()
    .collection('profiles')
    .insertOne({
      user,
      targetRoles: ['Backend Engineer'],
      yearsOfExperience: 6,
      countryCode: 'NG',
      workSetups: ['remote'],
      salaryFloor: { amount: 60000, currency: 'USD' },
      createdAt: now,
      updatedAt: now,
    });

  await getTestDatabase()
    .collection('resumes')
    .insertOne({
      user,
      kind: 'primary',
      ...primaryResume,
      file: {
        path: `users/${userId}/primary-resume/cv.pdf`,
        mimeType: 'application/pdf',
        originalName: 'cv.pdf',
        size: 10,
      },
      parseStatus: PARSE_STATUS[resumeState],
      parsedAt: now,
      parseError: null,
      parseUsage: null,
      reviewedAt: resumeState === 'reviewed' ? now : null,
      createdAt: now,
      updatedAt: now,
    });
}

export async function seedSessions(
  userId: string,
  createdAt: Date[],
  extra: Record<string, unknown> = {},
): Promise<void> {
  await getTestDatabase()
    .collection('agent-sessions')
    .insertMany(
      createdAt.map((date) => ({
        user: new Types.ObjectId(userId),
        kind: 'application',
        title: 'New application',
        userMessageCount: 1,
        turnStartedAt: null,
        archivedAt: null,
        createdAt: date,
        updatedAt: date,
        ...extra,
      })),
    );
}

export function findSession(sessionId: string) {
  return getTestDatabase()
    .collection('agent-sessions')
    .findOne({ _id: new Types.ObjectId(sessionId) });
}

export function findMessages(sessionId: string) {
  return getTestDatabase()
    .collection('messages')
    .find({ session: new Types.ObjectId(sessionId) })
    .sort({ createdAt: 1, _id: 1 })
    .toArray();
}

export function setSession(sessionId: string, fields: Record<string, unknown>) {
  return getTestDatabase()
    .collection('agent-sessions')
    .updateOne({ _id: new Types.ObjectId(sessionId) }, { $set: fields });
}

export function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;

  const promise = new Promise<void>((done) => {
    resolve = done;
  });

  return { promise, resolve };
}
