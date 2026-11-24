// Every icon a tool may name. The web app maps each to a drawn icon, so a
// name missing on either side fails to compile.
export const TOOL_ICONS = [
  "globe",
  "gauge",
  "file-text",
  "pencil",
  "envelope",
] as const;
export type ToolIcon = (typeof TOOL_ICONS)[number];

// Every agent tool's AI SDK `metadata`. `failed` shows for an `ok: false`
// output, beside the output's `note`.
export type ToolDisplayMetadata = {
  icon: ToolIcon;
  active: string;
  done: string;
  failed: string;
};
