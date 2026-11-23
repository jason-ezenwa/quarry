import { Callout, CalloutContent, CalloutMeta, CalloutTitle } from '@/components/ui/callout'

// Above the editor until the user confirms what was read.
export function ResumeReviewBanner({ fileName }: { fileName: string }) {
  return (
    <Callout tone="review">
      <CalloutContent>
        <CalloutTitle>Check what we read from your resume</CalloutTitle>
        <CalloutMeta>{fileName}</CalloutMeta>
      </CalloutContent>
    </Callout>
  )
}
