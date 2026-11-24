import type {
  CoverLetterDocumentResponse,
  DocumentHeader,
  Resume,
} from '@quarry/contracts';
import {
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  TabStopType,
  TextRun,
} from 'docx';
import type { ExportableDocument } from '../documents.types';
import { DOCX_FONT, EXPORT_STYLE } from './export.constants';
import { contactLine, resumeSections } from './export.utils';
import type { ExportEntry, ExportSection } from './export.types';

const { colors, fontSize, margin, gap } = EXPORT_STYLE;

// Word measures font sizes in half-points and spacing in twentieths of one.
const halfPoints = (points: number) => Math.round(points * 2);
const twips = (points: number) => Math.round(points * 20);

// Dates sit flush with the right margin.
const RIGHT_TAB = twips(EXPORT_STYLE.pageWidth - margin.horizontal * 2);

function header({ name, contact }: DocumentHeader): Paragraph[] {
  const line = contactLine(contact);

  return [
    new Paragraph({
      children: [
        new TextRun({
          text: name,
          bold: true,
          size: halfPoints(fontSize.name),
        }),
      ],
    }),
    ...(line
      ? [
          new Paragraph({
            children: [new TextRun({ text: line, color: colors.muted })],
          }),
        ]
      : []),
    new Paragraph({
      border: {
        bottom: {
          style: BorderStyle.SINGLE,
          size: 6,
          color: colors.rule,
          space: 1,
        },
      },
      spacing: { after: twips(gap.section) },
    }),
  ];
}

function entry({ title, dates, subtitle, details }: ExportEntry): Paragraph[] {
  return [
    new Paragraph({
      spacing: { before: twips(gap.entry) },
      keepNext: true,
      tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_TAB }],
      children: [
        new TextRun({ text: title, bold: true }),
        ...(dates
          ? [new TextRun({ text: `\t${dates}`, color: colors.muted })]
          : []),
      ],
    }),
    ...(subtitle
      ? [
          new Paragraph({
            keepNext: details.length > 0,
            children: [new TextRun({ text: subtitle, color: colors.muted })],
          }),
        ]
      : []),
    ...details.map(
      (detail) => new Paragraph({ text: detail, bullet: { level: 0 } }),
    ),
  ];
}

function section({ heading, paragraphs, entries }: ExportSection): Paragraph[] {
  return [
    new Paragraph({
      spacing: { before: twips(gap.section) },
      keepNext: true,
      children: [
        new TextRun({
          text: heading.toUpperCase(),
          bold: true,
          size: halfPoints(fontSize.heading),
          color: colors.muted,
          characterSpacing: 20,
        }),
      ],
    }),
    ...paragraphs.map((paragraph) => new Paragraph({ text: paragraph })),
    ...entries.flatMap(entry),
  ];
}

function buildDocument(children: Paragraph[]): Document {
  return new Document({
    styles: {
      default: {
        document: {
          run: { font: DOCX_FONT, size: halfPoints(fontSize.body) },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: twips(margin.vertical),
              bottom: twips(margin.vertical),
              left: twips(margin.horizontal),
              right: twips(margin.horizontal),
            },
          },
        },
        children,
      },
    ],
  });
}

function resumeDocx(resume: Resume): Document {
  return buildDocument([
    ...header({ name: resume.name, contact: resume.contact }),
    ...resumeSections(resume).flatMap(section),
  ]);
}

function coverLetterDocx(letter: CoverLetterDocumentResponse): Document {
  const paragraph = (text: string) =>
    new Paragraph({ text, spacing: { after: twips(gap.paragraph) } });

  return buildDocument([
    ...header(letter.header),
    paragraph(letter.greeting),
    ...letter.paragraphs.map(paragraph),
    new Paragraph({ text: letter.signOff }),
    new Paragraph({ text: letter.header.name }),
  ]);
}

export function renderDocx(doc: ExportableDocument): Promise<Buffer> {
  return Packer.toBuffer(
    doc.kind === 'resume' ? resumeDocx(doc.resume) : coverLetterDocx(doc),
  );
}
