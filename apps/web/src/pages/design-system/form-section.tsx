import { Checkbox } from '@/components/ui/checkbox'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
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
      </div>
    </Section>
  )
}
