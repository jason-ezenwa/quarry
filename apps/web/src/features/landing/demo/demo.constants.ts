import type { FitScoreDocumentResponse, SessionDetail, SessionPage, ToolDisplayMetadata, UsageResponse } from '@quarry/contracts'
import type { CurrentUser } from '@/hooks/use-current-user.types'
import type { DemoTurn } from './demo.types'

export const DEMO_SESSION_ID = 'demo'
export const DEMO_FIT_REPORT_ID = 'fit-1'

// The app's own size inside the frame; the landing page scales it down.
export const DEMO_VIEWPORT = { width: 1440, height: 960 } as const

// How long each beat of the conversation takes, in ms.
export const DEMO_TIMING = { start: 900, think: 700, tool: 1300, word: 55, pause: 1600 } as const

export const DEMO_SESSION: SessionDetail = {
  id: DEMO_SESSION_ID,
  kind: 'application',
  title: 'Senior Product Engineer',
  company: 'Halden',
  job: { url: 'https://jobs.ashbyhq.com/halden/senior-product-engineer', source: 'ashby', location: 'Remote', hasDescription: true },
  status: 'ready',
  archivedAt: null,
  userMessageCount: 3,
  messageLimit: 40,
  messages: [],
}

const RECENT: Array<[id: string, company: string, score: number, label: SessionPage['items'][number]['fitLabel']]> = [
  [DEMO_SESSION_ID, 'Halden', 86, 'strong-fit'],
  ['northmoor', 'Northmoor', 78, 'good-fit'],
  ['tessel', 'Tessel', 71, 'good-fit'],
  ['cindral', 'Cindral', 54, 'weak-fit'],
]

export const DEMO_SESSION_PAGE: SessionPage = {
  items: RECENT.map(([id, company, fitScore, fitLabel]) => ({
    id,
    kind: 'application',
    title: 'Product Engineer',
    company,
    source: 'ashby',
    fitScore,
    fitLabel,
    status: 'ready',
    archivedAt: null,
    createdAt: '2026-11-20T09:00:00.000Z',
  })),
  nextCursor: null,
}

export const DEMO_USAGE: UsageResponse = {
  sessions: { used: 4, limit: 10, resetsAt: '2026-12-01T00:00:00.000Z' },
  interviews: { used: 1, limit: 10, resetsAt: '2026-12-01T00:00:00.000Z' },
}

export const DEMO_USER: CurrentUser = {
  id: 'demo-user',
  name: 'Ezenwa Ebuka',
  email: 'ebuka@example.com',
  emailVerified: true,
  createdAt: '2026-11-01T09:00:00.000Z',
  updatedAt: '2026-11-01T09:00:00.000Z',
}

export const DEMO_FIT_REPORT: FitScoreDocumentResponse = {
  id: DEMO_FIT_REPORT_ID,
  kind: 'fit-score',
  name: 'Halden, first look',
  role: 'Senior Product Engineer',
  company: 'Halden',
  overall: 86,
  label: 'strong-fit',
  dimensions: {
    requirements: { score: 79, detail: '5 of 7 met, 1 partial' },
    skills: { score: 89, detail: '8 of 9 listed skills' },
    seniority: { score: 85, detail: 'About 4 years, asks 5+' },
    domain: { score: 100, detail: 'AI products, agents' },
  },
  strengths: [
    'Agent tooling shipped to production',
    'TypeScript and React across the stack',
    'Owned cloud infrastructure end to end',
    'Led engineering at an early-stage company',
  ],
  gaps: ['No production Go', 'One year short of the 5+ asked'],
  createdAt: '2026-11-27T09:00:00.000Z',
}

// The agent's real tool labels, as the server sends them.
const TOOLS = {
  readJob: { icon: 'globe', active: 'Reading the job post', done: 'Read the job post', failed: "Couldn't read the job post" },
  scoreFit: { icon: 'gauge', active: 'Scoring your fit', done: 'Scored your fit', failed: "Couldn't score your fit" },
  tailorResume: { icon: 'file-text', active: 'Tailoring your resume', done: 'Tailored your resume', failed: "Couldn't tailor your resume" },
  editResume: { icon: 'pencil', active: 'Editing your resume', done: 'Edited your resume', failed: "Couldn't edit your resume" },
  coverLetter: { icon: 'envelope', active: 'Writing your cover letter', done: 'Wrote your cover letter', failed: "Couldn't write your cover letter" },
} satisfies Record<string, ToolDisplayMetadata>

export const DEMO_TURNS: DemoTurn[] = [
  {
    ask: 'Score my fit for this job: https://jobs.ashbyhq.com/halden/senior-product-engineer',
    reply: [
      { tool: 'get_job_description', display: TOOLS.readJob, output: { note: 'Ashby' } },
      {
        tool: 'save_fit_score',
        display: TOOLS.scoreFit,
        output: {
          note: '86%',
          document: { kind: 'fit-score', id: DEMO_FIT_REPORT_ID, name: DEMO_FIT_REPORT.name, score: 86, label: 'strong-fit' },
        },
      },
      { text: 'You line up well. Go is the main gap, and you are a year short of the five they ask for. Want me to tailor your resume and write a cover letter?' },
    ],
  },
  {
    ask: 'Yes, do both.',
    reply: [
      {
        tool: 'create_tailored_resume',
        display: TOOLS.tailorResume,
        output: { document: { kind: 'resume', id: 'resume-1', name: 'Agent work first' } },
      },
      {
        tool: 'save_cover_letter',
        display: TOOLS.coverLetter,
        output: { document: { kind: 'cover-letter', id: 'letter-1', name: 'Halden, product focus' } },
      },
      { text: 'I tailored your resume and drafted a cover letter. Both lead with the agent tooling you shipped.' },
    ],
  },
  {
    ask: 'Lead with the Brightwell work and keep it to one page.',
    reply: [
      {
        tool: 'edit_tailored_resume',
        display: TOOLS.editResume,
        output: { document: { kind: 'resume', id: 'resume-2', name: 'Brightwell first, one page' } },
      },
      { text: 'Done. Brightwell leads now, and it fits on one page.' },
    ],
  },
]
