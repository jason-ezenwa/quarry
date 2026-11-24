import {
  formatDateRange,
  linkText,
  RESUME_SEPARATOR,
  type ExportFormat,
  type Resume,
} from '@quarry/contracts';
import type { ExportableDocument } from '../documents.types';
import { EXPORT_FALLBACK_FILE_NAME, RESUME_HEADINGS } from './export.constants';
import type { ContactPart, ExportSection } from './export.types';

// A phone number a dialler can take: "+234 (0) 800-000" becomes "+2340800000".
// Null when there are no digits to dial.
function telHref(phone: string): string | null {
  const digits = phone.replace(/[^\d+]/g, '');
  return /\d/.test(digits) ? `tel:${digits}` : null;
}

// The contact line as the web sheet shows it: location, email, phone, then
// links without the scheme. Email, phone and links carry where they point.
export function contactParts(contact: Resume['contact']): ContactPart[] {
  const parts: ContactPart[] = [];

  if (contact.location?.trim()) {
    parts.push({ text: contact.location, href: null });
  }

  if (contact.email?.trim()) {
    parts.push({ text: contact.email, href: `mailto:${contact.email.trim()}` });
  }

  if (contact.phone?.trim()) {
    parts.push({ text: contact.phone, href: telHref(contact.phone) });
  }

  return [
    ...parts,
    ...contact.links.map(({ url }) => ({ text: linkText(url), href: url })),
  ];
}

function joinPresent(parts: (string | undefined)[], separator = ', '): string {
  return parts.filter((part) => part?.trim()).join(separator);
}

// The resume body as the template lays it out, in order, empty sections
// left out. Both formats draw from this.
export function resumeSections(resume: Resume): ExportSection[] {
  // In the order, and with the lines, the web sheet shows.
  const sections: ExportSection[] = [
    {
      heading: null,
      paragraphs: resume.summary?.trim() ? [resume.summary] : [],
      entries: [],
    },
    {
      heading: RESUME_HEADINGS.experience,
      paragraphs: [],
      entries: resume.experience.map((role) => ({
        title: joinPresent([role.company, role.location], RESUME_SEPARATOR),
        dates: formatDateRange(role.startDate, role.endDate),
        subtitle: role.title,
        details: role.bullets,
      })),
    },
    {
      heading: RESUME_HEADINGS.education,
      paragraphs: [],
      entries: resume.education.map((school) => ({
        title: joinPresent(
          [school.school, joinPresent([school.qualification, school.field])],
          RESUME_SEPARATOR,
        ),
        dates: formatDateRange(undefined, school.endDate),
        subtitle: '',
        details: school.details,
      })),
    },
    {
      heading: RESUME_HEADINGS.skills,
      paragraphs:
        resume.skills.length > 0
          ? [resume.skills.map(({ name }) => name).join(', ')]
          : [],
      entries: [],
    },
    {
      heading: RESUME_HEADINGS.projects,
      paragraphs: [],
      entries: resume.projects.map((project) => ({
        title: joinPresent(
          [project.name, project.description],
          RESUME_SEPARATOR,
        ),
        dates: '',
        subtitle: project.url ?? '',
        details: project.bullets,
      })),
    },
    {
      heading: RESUME_HEADINGS.certifications,
      paragraphs: [],
      entries: resume.certifications.map((certification) => ({
        title: joinPresent(
          [certification.name, certification.issuer],
          RESUME_SEPARATOR,
        ),
        dates: formatDateRange(undefined, certification.date),
        subtitle: '',
        details: [],
      })),
    },
  ];

  return sections.filter(
    ({ paragraphs, entries }) => paragraphs.length > 0 || entries.length > 0,
  );
}

// A download name safe in any header: "Lead with payments" for Ada Obi
// becomes "ada-obi-lead-with-payments.pdf".
export function exportFileName(
  document: ExportableDocument,
  format: ExportFormat,
): string {
  const person =
    document.kind === 'resume' ? document.resume.name : document.header.name;

  const slug = `${person} ${document.name}`
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `${slug || EXPORT_FALLBACK_FILE_NAME}.${format}`;
}
