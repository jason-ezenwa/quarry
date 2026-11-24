import type { FitDimension, FitLabel } from "./fit-score.js";

export const DOCUMENT_KINDS = ["fit-score", "resume", "cover-letter"] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

// What every tool that saves a document returns, so the web app can show a
// card for it without knowing the tool.
export type SavedDocumentRef =
  | {
      kind: "fit-score";
      id: string;
      name: string;
      score: number;
      label: FitLabel;
    }
  | { kind: "resume" | "cover-letter"; id: string; name: string };

export type FitScoreDocumentResponse = {
  id: string;
  kind: "fit-score";
  name: string;
  role: string;
  company: string | null;
  // Rounded, out of 100.
  overall: number;
  label: FitLabel;
  // Each score is shown out of 100.
  dimensions: Record<FitDimension, { score: number; detail: string }>;
  strengths: string[];
  gaps: string[];
  createdAt: string;
};

// The display hints every agent tool declares as its AI SDK `metadata`.
export type ToolDisplayMetadata = {
  icon: string;
  active: string;
  done: string;
};
