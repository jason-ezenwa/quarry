import type { Resume } from '@quarry/contracts'
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
} from '@/components/resume/resume'
import { formatDateRange, formatPartialDate } from '../resume-format'

function EntryTop({ heading, meta }: { heading: React.ReactNode; meta?: string }) {
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

// The read variant: the primary resume as a document sheet. Empty sections are left out.
export function PrimaryResume({ resume }: { resume: Resume }) {
  const { contact } = resume
  const contactParts = [contact.location, contact.email, contact.phone].filter(Boolean)

  return (
    <ResumeRoot variant="sheet" aria-label="Your resume">
      <ResumeHeader>
        <ResumeName>{resume.name}</ResumeName>
        {contactParts.length > 0 || contact.links.length > 0 ? (
          <ResumeContact>
            {contactParts.map((part, index) => (
              <span key={index}>{part}</span>
            ))}
            {contact.links.map((link, index) => (
              <a key={index} href={link.url} target="_blank" rel="noreferrer" className="underline underline-offset-3">
                {link.label}
              </a>
            ))}
          </ResumeContact>
        ) : null}
      </ResumeHeader>
      {resume.summary ? <ResumeSummary>{resume.summary}</ResumeSummary> : null}
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
                        {role.location ? <span>{`  ·  ${role.location}`}</span> : null}
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
                        {qualification ? <span>{`  ·  ${qualification}`}</span> : null}
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
                      {project.description ? <span>{`  ·  ${project.description}`}</span> : null}
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
                      {certification.issuer ? <span>{`  ·  ${certification.issuer}`}</span> : null}
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
