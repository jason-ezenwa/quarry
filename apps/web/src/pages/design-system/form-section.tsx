import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ChipInput } from '@/components/ui/chip-input'
import { ChoiceChips } from '@/components/ui/choice-chips'
import { Combobox } from '@/components/ui/combobox'
import { FileDrop } from '@/components/ui/file-drop'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Section, Specimen } from './section.tsx'

export function FormSection() {
  return (
    <Section
      title="Form"
      description="Fields wrap a label, a control and a description or error. Forms validate with Zod through react-hook-form."
    >
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <Specimen label="Input states">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="ds-default">Default</FieldLabel>
              <Input id="ds-default" placeholder="ada@example.com" />
              <FieldDescription>We never share your email.</FieldDescription>
            </Field>
            <Field data-invalid>
              <FieldLabel htmlFor="ds-invalid">Invalid</FieldLabel>
              <Input id="ds-invalid" aria-invalid defaultValue="ada@" />
              <FieldError>Enter a valid email address</FieldError>
            </Field>
            <Field data-disabled>
              <FieldLabel htmlFor="ds-disabled">Disabled</FieldLabel>
              <Input id="ds-disabled" disabled defaultValue="Read only" />
            </Field>
          </FieldGroup>
        </Specimen>
        <Specimen label="Other controls">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="ds-select">Select</FieldLabel>
              <Select>
                <SelectTrigger id="ds-select" className="w-full">
                  <SelectValue placeholder="Choose a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="ds-textarea">Textarea</FieldLabel>
              <Textarea id="ds-textarea" placeholder="Tell us more" />
            </Field>
            <Field orientation="horizontal">
              <Checkbox id="ds-checkbox" defaultChecked />
              <FieldLabel htmlFor="ds-checkbox">Remember me</FieldLabel>
            </Field>
          </FieldGroup>
        </Specimen>
        <ProfileControls />
      </div>
    </Section>
  )
}

const SPECIMEN_CHOICES = [
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'Onsite' },
] as const

const SPECIMEN_COUNTRIES = [
  { value: 'GH', label: 'Ghana' },
  { value: 'KE', label: 'Kenya' },
  { value: 'NG', label: 'Nigeria' },
  { value: 'ZA', label: 'South Africa' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'US', label: 'United States' },
] as const

function ProfileControls() {
  const [roles, setRoles] = useState(['Senior Product Engineer', 'Founding Engineer'])
  const [setups, setSetups] = useState<string[]>(['remote'])
  const [file, setFile] = useState<File | null>(null)
  const [country, setCountry] = useState('NG')
  const [currency, setCurrency] = useState('USD')

  return (
    <>
      <Specimen label="Chip input, choice chips, suffixed input and combobox">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="ds-chips">Target roles</FieldLabel>
            <ChipInput id="ds-chips" placeholder="Add a role" max={3} value={roles} onChange={setRoles} />
          </Field>
          <Field>
            <FieldLabel id="ds-choices-label">Work setup</FieldLabel>
            <ChoiceChips aria-labelledby="ds-choices-label" options={SPECIMEN_CHOICES} value={setups} onChange={setSetups} />
          </Field>
          <Field>
            <FieldLabel htmlFor="ds-job-link">Large field (the job link on Home)</FieldLabel>
            <InputGroup size="lg">
              <InputGroupInput id="ds-job-link" type="url" placeholder="Paste a job link" />
              <Button variant="primary" size="lg">
                Start
              </Button>
            </InputGroup>
          </Field>
          <Field>
            <FieldLabel htmlFor="ds-salary">Salary floor</FieldLabel>
            <div className="flex gap-2">
              <InputGroup>
                <InputGroupInput id="ds-salary" inputMode="numeric" defaultValue="60,000" />
                <InputGroupAddon align="inline-end">
                  <InputGroupText>per year</InputGroupText>
                </InputGroupAddon>
              </InputGroup>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger aria-label="Currency" className="w-28 shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="NGN">NGN</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Field>
          <Field>
            <FieldLabel id="ds-combobox-label" htmlFor="ds-combobox">
              Combobox
            </FieldLabel>
            <Combobox
              id="ds-combobox"
              aria-labelledby="ds-combobox-label"
              options={SPECIMEN_COUNTRIES}
              value={country}
              onChange={setCountry}
              placeholder="Choose a country"
              searchPlaceholder="Search countries"
              emptyMessage="No country matches"
            />
          </Field>
        </FieldGroup>
      </Specimen>
      <Specimen label="File drop: empty or selected, and invalid">
        <FieldGroup>
          <FileDrop accept=".pdf,.docx" file={file} onFileChange={setFile} hint="PDF or DOCX, up to 5 MB" />
          <Field data-invalid>
            <FileDrop file={null} onFileChange={() => {}} hint="PDF or DOCX, up to 5 MB" invalid />
            <FieldError>That file is over 5 MB</FieldError>
          </Field>
        </FieldGroup>
      </Specimen>
    </>
  )
}
