import type { Resume } from '@quarry/contracts'
import type { ReactNode } from 'react'
import { XIcon } from '@phosphor-icons/react/dist/csr/X'
import {
  ResumeEditorAddEntry,
  ResumeEditorBulletList,
  ResumeEditorChipField,
  ResumeEditorEntry,
  ResumeEditorEntryList,
  ResumeEditorField,
  ResumeEditorForm,
  ResumeEditorProvider,
  ResumeEditorTextArea,
} from '@/components/resume/resume-editor'
import { useResumeEditor } from '@/components/resume/resume-editor-context'
import { ResumeHeader, ResumeRoot, ResumeSection, ResumeSectionTitle, ResumeSummary } from '@/components/resume/resume'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { formatDateRange } from '../resume-format'

const NEW_ROLE: Resume['experience'][number] = { title: '', company: '', bullets: [] }
const NEW_SCHOOL: Resume['education'][number] = { school: '', details: [] }
const NEW_PROJECT: Resume['projects'][number] = { name: '', bullets: [] }
const NEW_CERTIFICATION: Resume['certifications'][number] = { name: '' }
const NEW_LINK: Resume['contact']['links'][number] = { label: '', url: '' }

function SectionHead({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex min-h-7 items-center gap-2">
      <ResumeSectionTitle>{title}</ResumeSectionTitle>
      {count === undefined ? null : <span className="text-label text-muted-foreground">{count}</span>}
    </div>
  )
}

function BasicsSection() {
  const { state, actions } = useResumeEditor()
  const links = state.draft.contact.links

  return (
    <ResumeHeader role="group" aria-label="Basics">
      <SectionHead title="Basics" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ResumeEditorField path={['name']} label="Name" autoComplete="name" />
        <ResumeEditorField path={['contact', 'location']} label="Location" placeholder="Not found" />
        <ResumeEditorField path={['contact', 'email']} label="Email" type="email" placeholder="Not found" />
        <ResumeEditorField path={['contact', 'phone']} label="Phone" type="tel" placeholder="Not found" />
      </div>
      <div role="group" aria-label="Links" className="flex flex-col gap-2">
        <p className="text-small text-foreground">Links</p>
        {links.map((_, index) => (
          <div key={index} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 md:grid-cols-[9rem_minmax(0,1fr)_auto]">
            <ResumeEditorField path={['contact', 'links', index, 'label']} label={`Link ${index + 1} label`} hideLabel placeholder="Label" className="col-span-2 md:col-span-1" />
            <ResumeEditorField path={['contact', 'links', index, 'url']} label={`Link ${index + 1} URL`} hideLabel type="url" placeholder="https://" />
            <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove link ${index + 1}`} className="mt-1.5" onClick={() => actions.removeItem(['contact', 'links'], index)}>
              <XIcon aria-hidden="true" />
            </Button>
          </div>
        ))}
        <div>
          <ResumeEditorAddEntry path={['contact', 'links']} item={NEW_LINK}>
            Add link
          </ResumeEditorAddEntry>
        </div>
      </div>
    </ResumeHeader>
  )
}

function ExperienceSection() {
  const { state } = useResumeEditor()
  const roles = state.draft.experience

  return (
    <ResumeSection>
      <SectionHead title="Experience" count={roles.length} />
      <ResumeEditorEntryList>
        {roles.map((role, index) => {
          const path = ['experience', index] as const
          return (
            <ResumeEditorEntry
              key={index}
              path={path}
              title={role.title}
              meta={[role.company, formatDateRange(role.startDate, role.endDate)].filter(Boolean).join('  ·  ')}
              defaultOpen={index === 0 || !role.title}
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <ResumeEditorField path={[...path, 'title']} label="Title" />
                <ResumeEditorField path={[...path, 'company']} label="Company" />
                <ResumeEditorField path={[...path, 'startDate']} label="Start" placeholder="YYYY-MM" />
                <ResumeEditorField path={[...path, 'endDate']} label="End" placeholder="Present" />
                <ResumeEditorField path={[...path, 'location']} label="Location" className="md:col-span-2" />
              </div>
              <ResumeEditorBulletList path={[...path, 'bullets']} label="Bullets" itemLabel="Bullet" />
            </ResumeEditorEntry>
          )
        })}
      </ResumeEditorEntryList>
      <div>
        <ResumeEditorAddEntry path={['experience']} item={NEW_ROLE}>
          Add role
        </ResumeEditorAddEntry>
      </div>
    </ResumeSection>
  )
}

function EducationSection() {
  const { state } = useResumeEditor()
  const schools = state.draft.education

  return (
    <ResumeSection>
      <SectionHead title="Education" count={schools.length} />
      <ResumeEditorEntryList>
        {schools.map((school, index) => {
          const path = ['education', index] as const
          return (
            <ResumeEditorEntry key={index} path={path} title={school.school} meta={school.qualification} defaultOpen={!school.school}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <ResumeEditorField path={[...path, 'school']} label="School" />
                <ResumeEditorField path={[...path, 'qualification']} label="Qualification" />
                <ResumeEditorField path={[...path, 'field']} label="Field of study" />
                <ResumeEditorField path={[...path, 'endDate']} label="End" placeholder="YYYY-MM" />
              </div>
              <ResumeEditorBulletList path={[...path, 'details']} label="Details" itemLabel="Detail" />
            </ResumeEditorEntry>
          )
        })}
      </ResumeEditorEntryList>
      <div>
        <ResumeEditorAddEntry path={['education']} item={NEW_SCHOOL}>
          Add education
        </ResumeEditorAddEntry>
      </div>
    </ResumeSection>
  )
}

function SkillsSection() {
  const { state } = useResumeEditor()

  return (
    <ResumeSection>
      <SectionHead title="Skills" count={state.draft.skills.length} />
      <ResumeEditorChipField path={['skills']} label="Skills" placeholder="Add a skill" />
    </ResumeSection>
  )
}

function ProjectsSection() {
  const { state } = useResumeEditor()
  const projects = state.draft.projects

  return (
    <ResumeSection>
      <SectionHead title="Projects" count={projects.length} />
      <ResumeEditorEntryList>
        {projects.map((project, index) => {
          const path = ['projects', index] as const
          return (
            <ResumeEditorEntry key={index} path={path} title={project.name} meta={project.description} defaultOpen={!project.name}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <ResumeEditorField path={[...path, 'name']} label="Name" />
                <ResumeEditorField path={[...path, 'url']} label="Link" type="url" placeholder="https://" />
                <ResumeEditorField path={[...path, 'description']} label="Description" className="md:col-span-2" />
              </div>
              <ResumeEditorBulletList path={[...path, 'bullets']} label="Bullets" itemLabel="Bullet" />
            </ResumeEditorEntry>
          )
        })}
      </ResumeEditorEntryList>
      <div>
        <ResumeEditorAddEntry path={['projects']} item={NEW_PROJECT}>
          Add project
        </ResumeEditorAddEntry>
      </div>
    </ResumeSection>
  )
}

function CertificationsSection() {
  const { state } = useResumeEditor()
  const certifications = state.draft.certifications

  return (
    <ResumeSection>
      <SectionHead title="Certifications" count={certifications.length} />
      <ResumeEditorEntryList>
        {certifications.map((certification, index) => {
          const path = ['certifications', index] as const
          return (
            <ResumeEditorEntry key={index} path={path} title={certification.name} meta={certification.issuer} defaultOpen={!certification.name}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <ResumeEditorField path={[...path, 'name']} label="Name" />
                <ResumeEditorField path={[...path, 'issuer']} label="Issuer" />
                <ResumeEditorField path={[...path, 'date']} label="Date" placeholder="YYYY-MM" />
              </div>
            </ResumeEditorEntry>
          )
        })}
      </ResumeEditorEntryList>
      <div>
        <ResumeEditorAddEntry path={['certifications']} item={NEW_CERTIFICATION}>
          Add certification
        </ResumeEditorAddEntry>
      </div>
    </ResumeSection>
  )
}

function SaveError() {
  const { meta } = useResumeEditor()
  if (!meta.saveError && Object.keys(meta.errors).length === 0) return null

  return (
    <Alert variant="destructive">
      <AlertDescription>{meta.saveError ?? 'Some fields need a fix before you can save.'}</AlertDescription>
    </Alert>
  )
}

type PrimaryResumeEditorProps = {
  resume: Resume
  onSave: (resume: Resume) => Promise<void>
  // The pinned action bar: the variant's buttons, with ResumeEditorSubmit to save.
  actions: ReactNode
  children?: ReactNode
}

// The edit variant: every field of the primary resume as a form, saved as a whole.
export function PrimaryResumeEditor({ resume, onSave, actions, children }: PrimaryResumeEditorProps) {
  return (
    <ResumeEditorProvider resume={resume} onSave={onSave}>
      <ResumeEditorForm aria-label="Edit your resume" className="w-full">
        <div className="flex w-full flex-col gap-4">
          {children}
          <ResumeRoot variant="editor">
            <BasicsSection />
            <ResumeSummary>
              <SectionHead title="Summary" />
              <ResumeEditorTextArea path={['summary']} label="Summary" hideLabel rows={3} />
            </ResumeSummary>
            <ExperienceSection />
            <EducationSection />
            <SkillsSection />
            <ProjectsSection />
            <CertificationsSection />
          </ResumeRoot>
          <SaveError />
        </div>
        <div className="sticky bottom-0 z-10 -mx-4 mt-6 flex items-center gap-2 border-t border-border-soft bg-panel px-4 py-3.5 sm:-mx-6 sm:px-6">
          {actions}
        </div>
      </ResumeEditorForm>
    </ResumeEditorProvider>
  )
}
