// A role, school, project or certification as the template shows it.
export type ExportEntry = {
  title: string;
  dates: string;
  subtitle: string;
  details: string[];
};

export type ExportSection = {
  // Null for the summary, which sits under the name without one.
  heading: string | null;
  paragraphs: string[];
  entries: ExportEntry[];
};

export type ExportedFile = {
  content: Buffer;
  contentType: string;
  fileName: string;
};
