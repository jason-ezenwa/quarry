import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiUrl } from '@/test/integration/handlers'
import { renderRoute, signInAs, TEST_PROFILE } from '@/test/integration/render-route'
import { server } from '@/test/integration/server'

const PDF = 'application/pdf'
const MB = 1024 * 1024
const UPLOAD_KEY = 'V1StGXR8_Z5jdHi6B-myT.pdf'

function resumeFile({ name = 'resume.pdf', type = PDF, bytes = 200 * 1024 } = {}) {
  const file = new File(['%PDF-1.7'], name, { type })
  Object.defineProperty(file, 'size', { value: bytes })
  return file
}

// Records every write the form makes, so a test can assert nothing was saved.
function recordWrites() {
  const writes: { upload?: FormData; profile?: unknown; count: number } = { count: 0 }

  server.use(
    http.post(apiUrl('/api/profiles/uploads'), async ({ request }) => {
      writes.count += 1
      writes.upload = await request.formData()
      return HttpResponse.json({ key: UPLOAD_KEY, mimeType: PDF }, { status: 201 })
    }),
    http.post(apiUrl('/api/profiles'), async ({ request }) => {
      writes.count += 1
      writes.profile = await request.json()
      return HttpResponse.json({ ...(writes.profile as object), id: 'profile-1', createdAt: TEST_PROFILE.createdAt }, { status: 201 })
    }),
  )

  return writes
}

async function fillValidAnswers(user: ReturnType<typeof userEvent.setup>) {
  await user.upload(screen.getByLabelText('Resume'), resumeFile())
  await user.type(screen.getByLabelText('Target roles'), 'Engineer{Enter}')
  await user.type(screen.getByLabelText('Years of experience'), '4')
  await user.click(screen.getByRole('button', { name: 'Remote' }))
  await user.type(screen.getByLabelText('Salary floor'), '60000')
}

async function chooseCountry(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(screen.getByRole('combobox', { name: 'Country' }))
  await user.type(screen.getByPlaceholderText('Search countries'), name)
  await user.click(screen.getByRole('option', { name }))
}

async function chooseCurrency(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(screen.getByRole('combobox', { name: 'Currency' }))
  await user.click(screen.getByRole('option', { name }))
}

async function openOnboarding() {
  signInAs({ profile: false })
  const router = renderRoute('/onboarding')
  await screen.findByRole('heading', { name: 'Set up your profile' })
  return router
}

describe('Onboarding (integration)', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('sends a signed-in user without a profile from Home to onboarding', async () => {
    signInAs({ profile: false })

    const router = renderRoute('/home')

    expect(await screen.findByRole('heading', { name: 'Set up your profile' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/onboarding')
  })

  it('sends a user who has a profile home', async () => {
    signInAs()

    const router = renderRoute('/onboarding')

    expect(await screen.findByText('Ada Obi')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/home')
  })

  it('sends a signed-out visitor to sign-in', async () => {
    const router = renderRoute('/onboarding')

    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/sign-in')
  })

  it('shows every question and the upload on one screen', async () => {
    await openOnboarding()

    expect(screen.getByLabelText('Resume')).toBeInTheDocument()
    expect(screen.getByLabelText('Target roles')).toBeInTheDocument()
    expect(screen.getByLabelText('Years of experience')).toBeInTheDocument()
    expect(screen.getByLabelText('Country')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Work setup' })).toBeInTheDocument()
    expect(screen.getByLabelText('Salary floor')).toBeInTheDocument()
    expect(screen.getByLabelText('Currency')).toBeInTheDocument()
  })

  it('flags every missing answer and saves nothing', async () => {
    const writes = recordWrites()
    await openOnboarding()

    await userEvent.click(screen.getByRole('button', { name: 'Save and continue' }))

    expect(await screen.findByText('Add your resume')).toBeInTheDocument()
    expect(screen.getByText('Add at least one role')).toBeInTheDocument()
    expect(screen.getByText('Use a number from 0 to 60')).toBeInTheDocument()
    expect(screen.getByText('Pick at least one')).toBeInTheDocument()
    expect(screen.getByText('Enter an amount above 0')).toBeInTheDocument()
    expect(writes.count).toBe(0)
  })

  it.each([
    ['a file that is not a PDF or DOCX', resumeFile({ name: 'resume.png', type: 'image/png' }), 'Use a PDF or DOCX'],
    ['a file over 5 MB', resumeFile({ bytes: 5 * MB + 1 }), 'That file is over 5 MB'],
  ])('rejects %s and saves nothing', async (_, file, message) => {
    const writes = recordWrites()
    const user = userEvent.setup({ applyAccept: false })
    await openOnboarding()

    await user.upload(screen.getByLabelText('Resume'), file)
    await user.click(screen.getByRole('button', { name: 'Save and continue' }))

    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(writes.count).toBe(0)
  })

  it('rejects out-of-range years and a zero salary', async () => {
    const writes = recordWrites()
    const user = userEvent.setup()
    await openOnboarding()

    await user.type(screen.getByLabelText('Years of experience'), '61')
    await user.type(screen.getByLabelText('Salary floor'), '0')
    await user.click(screen.getByRole('button', { name: 'Save and continue' }))

    expect(await screen.findByText('Use a number from 0 to 60')).toBeInTheDocument()
    expect(screen.getByText('Enter an amount above 0')).toBeInTheDocument()
    expect(writes.count).toBe(0)
  })

  it('shows an error for a fourth target role, which clears once a role is removed', async () => {
    const user = userEvent.setup()
    await openOnboarding()

    for (const role of ['Product Engineer', 'Founding Engineer', 'Staff Engineer', 'Tech Lead']) {
      await user.type(screen.getByLabelText('Target roles'), `${role}{Enter}`)
    }

    expect(screen.getByText('Add up to 3 roles')).toBeInTheDocument()
    expect(screen.getByText('4 of 3')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Remove Tech Lead' }))

    expect(screen.queryByText('Add up to 3 roles')).not.toBeInTheDocument()
    expect(screen.getByText('3 of 3')).toBeInTheDocument()
  })

  it('saves nothing when a fourth role is typed and the form submitted without pressing Enter', async () => {
    const user = userEvent.setup()
    const writes = recordWrites()
    await openOnboarding()
    await fillValidAnswers(user)

    for (const role of ['Founding Engineer', 'Staff Engineer']) {
      await user.type(screen.getByLabelText('Target roles'), `${role}{Enter}`)
    }

    await user.type(screen.getByLabelText('Target roles'), 'Tech Lead')
    await user.click(screen.getByRole('button', { name: 'Save and continue' }))

    expect(await screen.findByText('Add up to 3 roles')).toBeInTheDocument()
    expect(writes.count).toBe(0)
  })

  it('uploads the resume, creates the profile, welcomes the user and goes home on its own', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const writes = recordWrites()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const router = await openOnboarding()
    await user.upload(screen.getByLabelText('Resume'), resumeFile())
    await user.type(screen.getByLabelText('Target roles'), 'Senior Product Engineer{Enter}Founding Engineer{Enter}')
    await user.type(screen.getByLabelText('Years of experience'), '4')
    await chooseCountry(user, 'Nigeria')
    await user.click(screen.getByRole('button', { name: 'Remote' }))
    await user.click(screen.getByRole('button', { name: 'Hybrid' }))
    await user.type(screen.getByLabelText('Salary floor'), '60,000')
    await chooseCurrency(user, 'USD')
    await user.click(screen.getByRole('button', { name: 'Save and continue' }))

    const card = await screen.findByRole('region', { name: 'Your search' })
    expect(screen.getByRole('heading', { name: "You're in, Ada." })).toBeInTheDocument()
    expect(within(card).getByText('Senior Product Engineer, Founding Engineer')).toBeInTheDocument()
    expect(within(card).getByText('Remote, Hybrid')).toBeInTheDocument()
    expect(within(card).getByText('Nigeria')).toBeInTheDocument()
    expect(within(card).getByText('4 years')).toBeInTheDocument()
    expect(within(card).getByText('$60,000 a year')).toBeInTheDocument()

    expect(writes.upload?.get('purpose')).toBe('primary-resume')
    expect(writes.upload?.has('file')).toBe(true)

    expect(writes.profile).toEqual({
      targetRoles: ['Senior Product Engineer', 'Founding Engineer'],
      yearsOfExperience: 4,
      countryCode: 'NG',
      workSetups: ['remote', 'hybrid'],
      salaryFloor: { amount: 60000, currency: 'USD' },
      resume: { key: UPLOAD_KEY, mimeType: PDF },
    })

    expect(router.state.location.pathname).toBe('/onboarding')

    // The profile now exists, so Home's gate lets the user in.
    signInAs()
    await act(() => vi.advanceTimersByTimeAsync(2500))

    expect(await screen.findByText('Ada Obi')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/home')
  })

  it('sets the salary currency from the chosen country', async () => {
    const user = userEvent.setup()
    await openOnboarding()

    await chooseCountry(user, 'Nigeria')

    expect(screen.getByRole('combobox', { name: 'Country' })).toHaveTextContent('Nigeria')
    expect(screen.getByRole('combobox', { name: 'Currency' })).toHaveTextContent('NGN')
  })

  it('chooses a country with the keyboard alone', async () => {
    const user = userEvent.setup()
    await openOnboarding()
    const country = screen.getByRole('combobox', { name: 'Country' })

    country.focus()
    await user.keyboard('{Enter}')
    await user.keyboard('Ghana')
    await user.keyboard('{Enter}')

    expect(country).toHaveTextContent('Ghana')
    expect(country).toHaveFocus()
    expect(screen.getByRole('combobox', { name: 'Currency' })).toHaveTextContent('GHS')
  })

  it.each([
    [413, 'That file is over 5 MB'],
    [400, 'Use a PDF or DOCX'],
  ])('shows an upload rejected with %i on the resume field', async (status, message) => {
    server.use(
      http.post(apiUrl('/api/profiles/uploads'), () => HttpResponse.json({ message: 'Rejected', statusCode: status }, { status })),
    )

    const user = userEvent.setup()
    await openOnboarding()

    await fillValidAnswers(user)
    await user.click(screen.getByRole('button', { name: 'Save and continue' }))

    expect(await screen.findByText(message)).toBeInTheDocument()
  })

  it.each([
    ['the upload', '/api/profiles/uploads', 'We could not upload your resume. Try again.'],
    ['saving the profile', '/api/profiles', 'We could not save your profile. Try again.'],
  ])('keeps the answers on screen when %s fails', async (_, path, message) => {
    recordWrites()
    server.use(http.post(apiUrl(path), () => HttpResponse.json({ message: 'Boom', statusCode: 500 }, { status: 500 })))
    const user = userEvent.setup()
    const router = await openOnboarding()

    await fillValidAnswers(user)
    await user.click(screen.getByRole('button', { name: 'Save and continue' }))

    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(screen.getByText('Engineer')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/onboarding')
  })

  it('goes home when the profile was already created, for example in another tab', async () => {
    recordWrites()

    server.use(
      http.post(apiUrl('/api/profiles'), () => {
        signInAs()
        return HttpResponse.json({ message: 'Profile already exists', statusCode: 409 }, { status: 409 })
      }),
    )

    const user = userEvent.setup()
    const router = await openOnboarding()

    await fillValidAnswers(user)
    await user.click(screen.getByRole('button', { name: 'Save and continue' }))

    expect(await screen.findByText('Ada Obi')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/home')
  })
})
