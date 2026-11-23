import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { ChipInput } from '@/components/ui/chip-input'
import { ChoiceChips } from '@/components/ui/choice-chips'
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
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
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

function ProfileControls() {
  const [roles, setRoles] = useState(['Senior Product Engineer', 'Founding Engineer'])
  const [setups, setSetups] = useState<string[]>(['remote'])
  const [file, setFile] = useState<File | null>(null)

  return (
    <>
      <Specimen label="Chip input, choice chips and suffixed input">
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
            <FieldLabel htmlFor="ds-salary">Salary floor</FieldLabel>
            <div className="flex gap-2">
              <InputGroup>
                <InputGroupInput id="ds-salary" inputMode="numeric" defaultValue="60,000" />
                <InputGroupAddon align="inline-end">
                  <InputGroupText>per year</InputGroupText>
                </InputGroupAddon>
              </InputGroup>
              <NativeSelect aria-label="Currency" defaultValue="USD">
                <NativeSelectOption value="USD">USD</NativeSelectOption>
                <NativeSelectOption value="NGN">NGN</NativeSelectOption>
              </NativeSelect>
            </div>
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
