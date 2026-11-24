// A role, school, project or certification as the template shows it.
export type ExportEntry = {
  title: string;
  dates: string;
  subtitle: string;
  details: string[];
};

export type ExportSection = {
  heading: string;
  paragraphs: string[];
  entries: ExportEntry[];
};

export type ExportedFile = {
  content: Buffer;
  fileName: string;
};
