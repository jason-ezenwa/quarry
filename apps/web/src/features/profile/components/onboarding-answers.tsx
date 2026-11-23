import { COUNTRIES } from '@quarry/contracts'
import { useQuery } from '@tanstack/react-query'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { profileQueryOptions } from '@/lib/profile/profile-api'
import { formatSalaryFloor, formatWorkSetups, formatYears } from '@/lib/profile/profile-format'

function Answer({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-1 gap-1 border-border-soft py-3 not-first:border-t sm:grid-cols-[12.5rem_minmax(0,1fr)] sm:items-baseline sm:gap-6">
      <dt className="text-small text-muted-foreground">{label}</dt>
      <dd className="text-ui">{value}</dd>
    </div>
  )
}

// The onboarding answers, read-only: they can't be changed after onboarding.
export function OnboardingAnswers() {
  // The gate has just fetched the profile, and the answers can't change after onboarding, so reuse it.
  const { data: profile, isPending, isError } = useQuery({ ...profileQueryOptions, staleTime: Infinity })

  return (
    <Card size="sm" role="region" aria-label="What you're looking for">
      <CardHeader>
        <CardTitle>What you're looking for</CardTitle>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <Skeleton className="h-40 w-full" />
        ) : isError || !profile ? (
          <Alert variant="destructive">
            <AlertDescription>We couldn't load your answers. Refresh to try again.</AlertDescription>
          </Alert>
        ) : (
          <dl>
            <Answer label="Target roles" value={profile.targetRoles.join(', ')} />
            <Answer label="Years of experience" value={formatYears(profile.yearsOfExperience)} />
            <Answer label="Country" value={COUNTRIES[profile.countryCode].name} />
            <Answer label="Work setup" value={formatWorkSetups(profile.workSetups)} />
            <Answer label="Salary floor" value={formatSalaryFloor(profile)} />
          </dl>
        )}
      </CardContent>
    </Card>
  )
}
