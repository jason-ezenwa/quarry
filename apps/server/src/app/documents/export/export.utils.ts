import type { Resume } from '@quarry/contracts';
import { format, parse } from 'date-fns';
import {
  CONTACT_SEPARATOR,
  HTTP_PROTOCOL_PREFIX,
  PRESENT_LABEL,
  RESUME_HEADINGS,
} from './export.constants';
import type { ExportSection } from './export.types';

// "2021-03" reads "Mar 2021"; a bare year stays as it is.
export function formatPartialDate(value: string): string {
  if (/^\d{4}$/.test(value)) return value;

  return format(parse(value, 'yyyy-MM', new Date(0)), 'MMM yyyy');
}

// A role with a start and no end is current.
export function formatDateRange(startDate?: string, endDate?: string): string {
  if (!startDate) return endDate ? formatPartialDate(endDate) : '';

  const end = endDate ? formatPartialDate(endDate) : PRESENT_LABEL;

  return `${formatPartialDate(startDate)} – ${end}`;
}

// Email, phone, location and links on one line, links without the scheme.
export function contactLine(contact: Resume['contact']): string {
  return joinPresent(
    [
      contact.email,
      contact.phone,
      contact.location,
      ...contact.links.map(({ url }) => url.replace(HTTP_PROTOCOL_PREFIX, '')),
    ],
    CONTACT_SEPARATOR,
  );
}

function joinPresent(parts: (string | undefined)[], separator = ', '): string {
  return parts.filter((part) => part?.trim()).join(separator);
}

// The resume body as the template lays it out, in order, empty sections
// left out. Both formats draw from this.
export function resumeSections(resume: Resume): ExportSection[] {
  const sections: ExportSection[] = [
    {
      heading: RESUME_HEADINGS.summary,
      paragraphs: resume.summary?.trim() ? [resume.summary] : [],
      entries: [],
    },
    {
      heading: RESUME_HEADINGS.experience,
      paragraphs: [],
      entries: resume.experience.map((role) => ({
        title: joinPresent([role.title, role.company]),
        dates: formatDateRange(role.startDate, role.endDate),
        subtitle: role.location ?? '',
        details: role.bullets,
      })),
    },
    {
      heading: RESUME_HEADINGS.projects,
      paragraphs: [],
      entries: resume.projects.map((project) => ({
        title: project.name,
        dates: '',
        subtitle: joinPresent(
          [project.description, project.url],
          CONTACT_SEPARATOR,
        ),
        details: project.bullets,
      })),
    },
    {
      heading: RESUME_HEADINGS.education,
      paragraphs: [],
      entries: resume.education.map((school) => ({
        title: school.school,
        dates: formatDateRange(undefined, school.endDate),
        subtitle: joinPresent([school.qualification, school.field]),
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
      heading: RESUME_HEADINGS.certifications,
      paragraphs: [],
      entries: resume.certifications.map((certification) => ({
        title: certification.name,
        dates: formatDateRange(undefined, certification.date),
        subtitle: certification.issuer ?? '',
        details: [],
      })),
    },
  ];

  return sections.filter(
    ({ paragraphs, entries }) => paragraphs.length > 0 || entries.length > 0,
  );
}
