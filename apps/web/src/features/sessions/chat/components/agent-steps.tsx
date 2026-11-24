import {
  ToolStep,
  ToolStepIcon,
  ToolStepLabel,
  ToolStepList,
  ToolStepNote,
  ToolSteps,
  ToolStepSingle,
  ToolStepsToggle,
  ToolStepsWorking,
} from '@/components/session/tool-steps'
import { FALLBACK_TOOL_STEP } from '../../sessions.constants'
import type { ToolStep as ToolStepData } from '../../sessions.types'

function AgentStep({ step }: { step: ToolStepData }) {
  return (
    <ToolStep running={step.running} unfinished={step.unfinished}>
      <ToolStepIcon icon={step.icon} />
      <ToolStepLabel>{step.label}</ToolStepLabel>
      {step.note ? <ToolStepNote>{step.note}</ToolStepNote> : null}
    </ToolStep>
  )
}

// One step shows as it is. More: while one runs, a spinner, "Working" and the steps so far; once settled,
// "N steps", folded away until opened.
export function AgentSteps({ steps, working = false }: { steps: ToolStepData[]; working?: boolean }) {
  const running = working || steps.some((step) => step.running)
  const [only] = steps

  if (only && steps.length === 1 && !working) {
    return (
      <ToolStepSingle>
        <AgentStep step={only} />
      </ToolStepSingle>
    )
  }

  return (
    <ToolSteps running={running}>
      <ToolStepsWorking>{FALLBACK_TOOL_STEP.active}</ToolStepsWorking>
      <ToolStepsToggle>{`${steps.length} steps`}</ToolStepsToggle>
      <ToolStepList>
        {steps.map((step) => (
          <AgentStep key={step.id} step={step} />
        ))}
      </ToolStepList>
    </ToolSteps>
  )
}
