import type { ReactNode } from 'react'
import { Wordmark } from '@/components/app-header/wordmark'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

type AuthCardProps = {
  title: string
  description: string
  footer: ReactNode
  children: ReactNode
}

export function AuthCard({ title, description, footer, children }: AuthCardProps) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-4 py-12">
      <Wordmark />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
        <CardFooter className="justify-center">{footer}</CardFooter>
      </Card>
    </main>
  )
}
