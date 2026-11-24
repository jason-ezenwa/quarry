import {
  ToolStep,
  ToolStepIcon,
  ToolStepLabel,
  ToolStepList,
  ToolStepNote,
  ToolSteps,
  ToolStepsToggle,
  ToolStepsWorking,
} from '@/components/session/tool-steps'
import { FALLBACK_TOOL_STEP } from '../../sessions.constants'
import type { ToolStep as ToolStepData } from '../../sessions.types'

// While a step runs: a spinner, "Working" and the steps so far. Once settled: "N steps", folded away until opened.
export function AgentSteps({ steps, working = false }: { steps: ToolStepData[]; working?: boolean }) {
  const running = working || steps.some((step) => step.running)

  return (
    <ToolSteps running={running}>
      <ToolStepsWorking>{FALLBACK_TOOL_STEP.active}</ToolStepsWorking>
      <ToolStepsToggle>{`${steps.length} ${steps.length === 1 ? 'step' : 'steps'}`}</ToolStepsToggle>
      <ToolStepList>
        {steps.map((step) => (
          <ToolStep key={step.id} running={step.running} unfinished={step.unfinished}>
            <ToolStepIcon icon={step.icon} />
            <ToolStepLabel>{step.label}</ToolStepLabel>
            {step.note ? <ToolStepNote>{step.note}</ToolStepNote> : null}
          </ToolStep>
        ))}
      </ToolStepList>
    </ToolSteps>
  )
}
