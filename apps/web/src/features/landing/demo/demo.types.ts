import type { ToolDisplayMetadata } from '@quarry/contracts'
import type { UIMessage } from 'ai'

// One tool call in a scripted reply, and what it returns.
export type DemoTool = { tool: string; display: ToolDisplayMetadata; output: Record<string, unknown> }

export type DemoReplyItem = DemoTool | { text: string }

// A message from the user and Wren's reply to it.
export type DemoTurn = { ask: string; reply: DemoReplyItem[] }

// The conversation at one moment, shown `delay` ms after the moment before it.
export type DemoFrame = { delay: number; messages: UIMessage[]; working: boolean }
