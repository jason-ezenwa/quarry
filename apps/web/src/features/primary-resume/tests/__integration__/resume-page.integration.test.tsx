import type { PrimaryResumeResponse, Resume } from '@quarry/contracts'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { apiUrl } from '@/test/integration/handlers'
import { primaryResumeResponse, renderRoute, signInAs, TEST_RESUME } from '@/test/integration/render-route'
import { server } from '@/test/integration/server'

const UPLOAD_KEY = 'V1StGXR8_Z5jdHi6B-myT.pdf'
const POLL_TIMEOUT_MS = 5000
const UNREVIEWED = primaryResumeResponse({ reviewedAt: null })

// Answers PUT /api/resumes/primary like the server: stores the body and marks the resume reviewed.
function recordSaves(start: PrimaryResumeResponse) {
  const saves: Resume[] = []
  let current = start

  server.use(
    http.get(apiUrl('/api/resumes/primary'), () => HttpResponse.json(current)),
    http.put(apiUrl('/api/resumes/primary'), async ({ request }) => {
      const resume = (await request.json()) as Resume
      saves.push(resume)
      current = { ...current, resume, reviewedAt: '2026-01-03T00:00:00.000Z' }
      return HttpResponse.json(current)
    }),
  )

  return saves
}

async function openResume(resume: PrimaryResumeResponse) {
  signInAs({ resume })
  const router = renderRoute('/profile/resume')
  await screen.findByRole('heading', { name: 'Resume', level: 1 })
  return router
}

function basics() {
  return within(screen.getByRole('group', { name: 'Basics' }))
}

function sheet() {
  return screen.getByRole('article', { name: 'Your resume' })
}

describe('Resume page (integration)', () => {
  it('opens an unreviewed resume in the editor, filled in, under the review banner', async () => {
    await openResume(UNREVIEWED)

    expect(await screen.findByText('Check what we read from your resume')).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveValue('Ada Obi')
    expect(screen.getByLabelText('Email')).toHaveValue('ada@example.com')
    expect(basics().getByLabelText('Location')).toHaveValue('Lagos, Nigeria')
    expect(screen.getByLabelText('Phone')).toHaveValue('')
    expect(screen.getByLabelText('Bullet 1')).toHaveValue('Built the billing service')
    expect(screen.getByRole('button', { name: 'Edit Software Engineer' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove TypeScript' })).toBeInTheDocument()
  })

  it('saves an edited bullet on confirm, then shows the resume read-only with the edit', async () => {
    const saves = recordSaves(UNREVIEWED)
    await openResume(UNREVIEWED)
    const user = userEvent.setup()

    const bullet = await screen.findByLabelText('Bullet 1')
    await user.clear(bullet)
    await user.type(bullet, 'Rebuilt the billing service')
    await user.click(screen.getByRole('button', { name: 'Confirm resume' }))

    expect(await within(await screen.findByRole('article', { name: 'Your resume' })).findByText('Rebuilt the billing service')).toBeInTheDocument()
    expect(screen.queryByText('Check what we read from your resume')).not.toBeInTheDocument()
    expect(saves).toHaveLength(1)
    expect(saves[0].experience[0].bullets).toEqual(['Rebuilt the billing service', 'Led a team of four'])
  })

  it('marks the resume reviewed when confirmed without edits', async () => {
    const saves = recordSaves(UNREVIEWED)
    await openResume(UNREVIEWED)

    await userEvent.click(await screen.findByRole('button', { name: 'Confirm resume' }))

    expect(await screen.findByRole('article', { name: 'Your resume' })).toBeInTheDocument()
    expect(saves).toEqual([TEST_RESUME])
  })

  it('drops blank optional fields and blank bullets before saving', async () => {
    const saves = recordSaves(UNREVIEWED)
    await openResume(UNREVIEWED)
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Add bullet' }))
    await user.clear(basics().getByLabelText('Location'))
    await user.click(screen.getByRole('button', { name: 'Confirm resume' }))

    await screen.findByRole('article', { name: 'Your resume' })
    expect(saves[0].contact).toEqual({ email: 'ada@example.com', links: TEST_RESUME.contact.links })
    expect(saves[0].experience[0].bullets).toEqual(TEST_RESUME.experience[0].bullets)
  })

  it('shows what needs fixing and saves nothing when a field is invalid', async () => {
    const saves = recordSaves(UNREVIEWED)
    await openResume(UNREVIEWED)
    const user = userEvent.setup()

    await user.clear(await screen.findByLabelText('Name'))
    await user.type(screen.getByLabelText('Start'), '{Control>}a{/Control}Jan 2024')
    await user.click(screen.getByRole('button', { name: 'Confirm resume' }))

    expect(await screen.findByText('Required')).toBeInTheDocument()
    expect(screen.getByText('Use YYYY or YYYY-MM')).toBeInTheDocument()
    expect(screen.getByText('Some fields need a fix before you can save.')).toBeInTheDocument()
    expect(saves).toHaveLength(0)
  })

  it('adds a role, opening its fields', async () => {
    const saves = recordSaves(UNREVIEWED)
    await openResume(UNREVIEWED)
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Add role' }))
    const titles = screen.getAllByLabelText('Title')
    await user.type(titles[titles.length - 1], 'Intern')
    const companies = screen.getAllByLabelText('Company')
    await user.type(companies[companies.length - 1], 'Initech')
    await user.click(screen.getByRole('button', { name: 'Confirm resume' }))

    await screen.findByRole('article', { name: 'Your resume' })
    expect(saves[0].experience.at(-1)).toEqual({ title: 'Intern', company: 'Initech', bullets: [] })
  })

  it('opens a reviewed resume read-only, and saving edits keeps it reviewed', async () => {
    const saves = recordSaves(primaryResumeResponse())
    await openResume(primaryResumeResponse())
    const user = userEvent.setup()

    expect(await within(await screen.findByRole('article', { name: 'Your resume' })).findByText('Built the billing service')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    expect(screen.queryByText('Check what we read from your resume')).not.toBeInTheDocument()
    await user.clear(screen.getByLabelText('Summary'))
    await user.type(screen.getByLabelText('Summary'), 'Product engineer.')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await within(await screen.findByRole('article', { name: 'Your resume' })).findByText('Product engineer.')).toBeInTheDocument()
    expect(saves[0].summary).toBe('Product engineer.')
  })

  it('cancels an edit without saving', async () => {
    const saves = recordSaves(primaryResumeResponse())
    await openResume(primaryResumeResponse())
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Edit' }))
    await user.type(screen.getByLabelText('Summary'), ' Extra.')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(within(sheet()).getByText('Full-stack engineer.')).toBeInTheDocument()
    expect(saves).toHaveLength(0)
  })

  it('keeps the editor and says so when saving fails', async () => {
    await openResume(UNREVIEWED)
    server.use(http.put(apiUrl('/api/resumes/primary'), () => HttpResponse.json({ message: 'Boom' }, { status: 500 })))

    await userEvent.click(await screen.findByRole('button', { name: 'Confirm resume' }))

    expect(await screen.findByText('We could not save your resume. Try again.')).toBeInTheDocument()
    expect(screen.getByText('Check what we read from your resume')).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveValue('Ada Obi')
  })

  it('says the resume is being read while it parses', async () => {
    await openResume(primaryResumeResponse({ parseStatus: 'parsing', parsedAt: null, reviewedAt: null, resume: null }))

    expect(await screen.findByText('Reading your resume')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('shows a failed parse with retry and re-upload', async () => {
    await openResume(primaryResumeResponse({ parseStatus: 'failed', parsedAt: null, reviewedAt: null, resume: null }))

    expect(await screen.findByText("We couldn't read your resume")).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Re-upload' })).toBeInTheDocument()
  })

  it('re-uploads a different file, reads it, then opens the new resume in the editor under the banner', async () => {
    const newResume: Resume = { ...TEST_RESUME, name: 'Ada N. Obi', experience: [] }
    let current = primaryResumeResponse()
    signInAs()

    server.use(
      http.get(apiUrl('/api/resumes/primary'), () => {
        // The first poll after a re-upload finds the new file read.
        if (current.parseStatus === 'parsing') {
          current = { ...current, parseStatus: 'parsed', parsedAt: '2026-01-04T00:00:00.000Z', resume: newResume }
        }

        return HttpResponse.json(current)
      }),
      http.post(apiUrl('/api/resumes/uploads'), () =>
        HttpResponse.json({ key: UPLOAD_KEY, mimeType: 'application/pdf' }, { status: 201 }),
      ),
      http.put(apiUrl('/api/resumes/primary/file'), () => {
        current = {
          ...current,
          parseStatus: 'parsing',
          reviewedAt: null,
          file: { originalName: 'new-resume.pdf', mimeType: 'application/pdf', size: 2048 },
        }

        return HttpResponse.json(current)
      }),
    )

    renderRoute('/profile/resume')

    await screen.findByRole('article', { name: 'Your resume' })
    await userEvent.upload(screen.getByLabelText('New resume file'), new File(['%PDF'], 'new-resume.pdf', { type: 'application/pdf' }))

    expect(await screen.findByText('Reading your resume')).toBeInTheDocument()
    expect(await screen.findByText('Check what we read from your resume', {}, { timeout: POLL_TIMEOUT_MS })).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveValue('Ada N. Obi')
  }, 10_000)
})
