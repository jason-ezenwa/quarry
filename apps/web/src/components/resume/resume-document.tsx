import {
  contactDetails,
  formatDateRange,
  formatPartialDate,
  linkText,
  RESUME_SEPARATOR,
  type DocumentHeader,
} from '@quarry/contracts'
import type { ReactNode } from 'react'
import {
  ResumeBullet,
  ResumeBullets,
  ResumeContact,
  ResumeEntry,
  ResumeEntryHeading,
  ResumeEntryList,
  ResumeEntryMeta,
  ResumeHeader,
  ResumeName,
  ResumeRoot,
  ResumeSection,
  ResumeSectionTitle,
  ResumeSkill,
  ResumeSkillList,
  ResumeSummary,
} from './resume'
import type { ResumeDocumentProps } from './resume.types'

function EntryTop({ heading, meta }: { heading: ReactNode; meta?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <ResumeEntryHeading>{heading}</ResumeEntryHeading>
      {meta ? <ResumeEntryMeta>{meta}</ResumeEntryMeta> : null}
    </div>
  )
}

function Bullets({ items }: { items: string[] }) {
  if (items.length === 0) return null

  return (
    <ResumeBullets>
      {items.map((item, index) => (
        <ResumeBullet key={index}>{item}</ResumeBullet>
      ))}
    </ResumeBullets>
  )
}

// The name and contact line at the top of a resume, and of a cover letter, as its downloads print it.
export function ResumeDocumentHeader({ header }: { header: DocumentHeader }) {
  const { name, contact } = header
  const contactParts = contactDetails(contact)

  return (
    <ResumeHeader>
      <ResumeName>{name}</ResumeName>
      {contactParts.length > 0 || contact.links.length > 0 ? (
        <ResumeContact>
          {contactParts.map((part, index) => (
            <span key={index}>{part}</span>
          ))}
          {/* Wrapped, so the separator after each link sits outside it and isn't underlined. */}
          {contact.links.map((link, index) => (
            <span key={index}>
              <a href={link.url} target="_blank" rel="noreferrer" className="underline underline-offset-3">
                {linkText(link.url)}
              </a>
            </span>
          ))}
        </ResumeContact>
      ) : null}
    </ResumeHeader>
  )
}

// A resume to read, as a page of its own or set inside another sheet. Empty sections are left out.
export function ResumeDocument({ resume, variant = 'sheet', ...props }: ResumeDocumentProps) {
  return (
    <ResumeRoot variant={variant} {...props}>
      <ResumeDocumentHeader header={resume} />
      {resume.summary?.trim() ? <ResumeSummary>{resume.summary}</ResumeSummary> : null}
      {resume.experience.length > 0 ? (
        <ResumeSection>
          <ResumeSectionTitle>Experience</ResumeSectionTitle>
          <ResumeEntryList>
            {resume.experience.map((role, index) => (
              <ResumeEntry key={index}>
                {/* The company line and the title read as one heading, so they sit closer than the bullets. */}
                <div className="flex flex-col gap-0.5">
                  <EntryTop
                    heading={
                      <>
                        <span>{role.company}</span>
                        {role.location ? <span>{`${RESUME_SEPARATOR}${role.location}`}</span> : null}
                      </>
                    }
                    meta={formatDateRange(role.startDate, role.endDate)}
                  />
                  <p className="text-ui">{role.title}</p>
                </div>
                <Bullets items={role.bullets} />
              </ResumeEntry>
            ))}
          </ResumeEntryList>
        </ResumeSection>
      ) : null}
      {resume.education.length > 0 ? (
        <ResumeSection>
          <ResumeSectionTitle>Education</ResumeSectionTitle>
          <ResumeEntryList>
            {resume.education.map((school, index) => {
              const qualification = [school.qualification, school.field].filter(Boolean).join(', ')

              return (
                <ResumeEntry key={index}>
                  <EntryTop
                    heading={
                      <>
                        <span>{school.school}</span>
                        {qualification ? <span>{`${RESUME_SEPARATOR}${qualification}`}</span> : null}
                      </>
                    }
                    meta={school.endDate ? formatPartialDate(school.endDate) : undefined}
                  />
                  <Bullets items={school.details} />
                </ResumeEntry>
              )
            })}
          </ResumeEntryList>
        </ResumeSection>
      ) : null}
      {resume.skills.length > 0 ? (
        <ResumeSection>
          <ResumeSectionTitle>Skills</ResumeSectionTitle>
          <ResumeSkillList>
            {resume.skills.map((skill, index) => (
              <ResumeSkill key={index}>{skill.name}</ResumeSkill>
            ))}
          </ResumeSkillList>
        </ResumeSection>
      ) : null}
      {resume.projects.length > 0 ? (
        <ResumeSection>
          <ResumeSectionTitle>Projects</ResumeSectionTitle>
          <ResumeEntryList>
            {resume.projects.map((project, index) => (
              <ResumeEntry key={index}>
                <EntryTop
                  heading={
                    <>
                      <span>{project.name}</span>
                      {project.description ? <span>{`${RESUME_SEPARATOR}${project.description}`}</span> : null}
                    </>
                  }
                />
                {project.url ? (
                  <a href={project.url} target="_blank" rel="noreferrer" className="text-label text-muted-foreground underline underline-offset-3">
                    {project.url}
                  </a>
                ) : null}
                <Bullets items={project.bullets} />
              </ResumeEntry>
            ))}
          </ResumeEntryList>
        </ResumeSection>
      ) : null}
      {resume.certifications.length > 0 ? (
        <ResumeSection>
          <ResumeSectionTitle>Certifications</ResumeSectionTitle>
          <ResumeEntryList>
            {resume.certifications.map((certification, index) => (
              <ResumeEntry key={index}>
                <EntryTop
                  heading={
                    <>
                      <span>{certification.name}</span>
                      {certification.issuer ? <span>{`${RESUME_SEPARATOR}${certification.issuer}`}</span> : null}
                    </>
                  }
                  meta={certification.date ? formatPartialDate(certification.date) : undefined}
                />
              </ResumeEntry>
            ))}
          </ResumeEntryList>
        </ResumeSection>
      ) : null}
    </ResumeRoot>
  )
}
