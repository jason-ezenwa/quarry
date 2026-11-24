import { useState } from 'react'
import { PageHeader } from '@/components/app-frame/page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ApplicationList } from '@/features/sessions/applications/components/application-list'
import type { ListTab } from '@/features/sessions/applications/applications.types'

// Every application, active and archived.
export function ApplicationsPage() {
  const [tab, setTab] = useState<ListTab>('active')

  return (
    <>
      <PageHeader title="Applications" />
      <div className="flex flex-1 justify-center px-4 pt-5 pb-12 md:px-6 md:pt-12">
        <Tabs value={tab} onValueChange={(value) => setTab(value === 'archived' ? 'archived' : 'active')} className="w-full max-w-170 gap-4">
          <TabsList aria-label="Applications">
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="archived">Archived</TabsTrigger>
          </TabsList>
          <TabsContent value="active">
            <ApplicationList tab="active" />
          </TabsContent>
          <TabsContent value="archived">
            <ApplicationList tab="archived" />
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
