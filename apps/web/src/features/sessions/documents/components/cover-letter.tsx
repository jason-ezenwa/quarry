import type { CoverLetterDocumentResponse } from '@quarry/contracts'
import { ResumeRoot } from '@/components/resume/resume'
import { ResumeDocumentHeader } from '@/components/resume/resume-document'

// The letter under the same name and contact line as the resume, signed with that name.
export function CoverLetter({ letter }: { letter: CoverLetterDocumentResponse }) {
  return (
    <ResumeRoot variant="inset" aria-label={`Cover letter: ${letter.name}`}>
      <ResumeDocumentHeader header={letter.header} />
      <div className="flex flex-col gap-3 text-doc-body">
        <p>{letter.greeting}</p>
        {letter.paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
        <p className="mt-2">
          {letter.signOff}
          <br />
          {letter.header.name}
        </p>
      </div>
    </ResumeRoot>
  )
}
