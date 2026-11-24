import { createContext, use } from 'react'
import type { ToolStepContextValue, ToolStepsContextValue } from './session.types'

export const ToolStepsContext = createContext<ToolStepsContextValue | null>(null)
export const ToolStepContext = createContext<ToolStepContextValue | null>(null)

export function useToolSteps(): ToolStepsContextValue {
  const context = use(ToolStepsContext)
  if (!context) throw new Error('Tool steps parts must be inside ToolSteps')
  return context
}

export function useToolStep(): ToolStepContextValue {
  const context = use(ToolStepContext)
  if (!context) throw new Error('Tool step parts must be inside ToolStep')
  return context
}
