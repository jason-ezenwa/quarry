import {
  Document,
  Font,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
  type DocumentProps,
  type TextProps,
} from '@react-pdf/renderer';
import {
  RESUME_SEPARATOR,
  type CoverLetterDocumentResponse,
  type DocumentHeader,
  type Resume,
} from '@quarry/contracts';
import { createElement as h, type ReactElement, type ReactNode } from 'react';
import type { ExportableDocument } from '../documents.types';
import { EXPORT_STYLE, PDF_FONT } from './export.constants';
import { contactParts, resumeSections } from './export.utils';
import type { ContactPart, ExportEntry, ExportSection } from './export.types';

Font.register({
  family: PDF_FONT.family,
  fonts: [
    { src: PDF_FONT.regular, fontWeight: 'normal' },
    { src: PDF_FONT.bold, fontWeight: 'bold' },
  ],
});

// Words are never split across lines: names and technologies read wrong
// hyphenated.
Font.registerHyphenationCallback((word) => [word]);

const { colors, fontSize, margin, gap } = EXPORT_STYLE;
const SEPARATOR = RESUME_SEPARATOR.trim();
const color = (hex: string) => `#${hex}`;

const styles = StyleSheet.create({
  page: {
    paddingVertical: margin.vertical,
    paddingHorizontal: margin.horizontal,
    fontFamily: PDF_FONT.family,
    fontSize: fontSize.body,
    lineHeight: EXPORT_STYLE.lineHeight,
    color: color(colors.text),
  },
  name: { fontSize: fontSize.name, fontWeight: 'bold' },
  contact: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: gap.contact,
    color: color(colors.muted),
  },
  contactPart: { flexDirection: 'row' },
  // The web sheet's "  ·  ": a Text drops the spaces around it.
  separator: { marginHorizontal: 5 },
  link: { color: color(colors.muted), textDecoration: 'underline' },
  header: {
    paddingBottom: gap.section,
    marginBottom: gap.section,
    borderBottomWidth: 1,
    borderBottomColor: color(colors.rule),
  },
  section: { marginBottom: gap.section },
  heading: {
    fontSize: fontSize.heading,
    fontWeight: 'bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: color(colors.muted),
    marginBottom: 6,
  },
  entry: { marginBottom: gap.entry },
  entryTop: { flexDirection: 'row', justifyContent: 'space-between' },
  entryTitle: { fontWeight: 'bold' },
  muted: { color: color(colors.muted) },
  bullet: { flexDirection: 'row', marginTop: 2 },
  bulletMark: { width: 10 },
  bulletText: { flex: 1 },
  paragraph: { marginBottom: gap.paragraph },
});

const text = (style: TextProps['style'], content: ReactNode) =>
  h(Text, { style } satisfies TextProps, content);

// Email, phone and links are clickable, as they are on the web sheet. Each
// part keeps to one line with the separator after it, so a line never breaks
// inside a link or starts with a separator.
function contactLine(parts: ContactPart[]): ReactElement {
  return h(
    View,
    { style: styles.contact },
    ...parts.map(({ text: part, href }, index) =>
      h(
        View,
        { key: index, style: styles.contactPart, wrap: false },
        href
          ? h(Link, { src: href, style: styles.link }, part)
          : text(undefined, part),
        index < parts.length - 1 ? text(styles.separator, SEPARATOR) : null,
      ),
    ),
  );
}

function header({ name, contact }: DocumentHeader): ReactElement {
  const parts = contactParts(contact);

  return h(
    View,
    { style: styles.header },
    text(styles.name, name),
    parts.length > 0 ? contactLine(parts) : null,
  );
}

// The title block stays together and with the first line under it; long
// bullet lists still break across pages.
function entry({ title, dates, subtitle, details }: ExportEntry): ReactElement {
  return h(
    View,
    { style: styles.entry },
    h(
      View,
      { wrap: false, minPresenceAhead: 24 },
      h(
        View,
        { style: styles.entryTop },
        text(styles.entryTitle, title),
        dates ? text(styles.muted, dates) : null,
      ),
      subtitle ? text(styles.muted, subtitle) : null,
    ),
    ...details.map((detail) =>
      h(
        View,
        { style: styles.bullet, wrap: false },
        text(styles.bulletMark, '•'),
        text(styles.bulletText, detail),
      ),
    ),
  );
}

function section({
  heading,
  paragraphs,
  entries,
}: ExportSection): ReactElement {
  return h(
    View,
    { style: styles.section },
    heading
      ? h(Text, { style: styles.heading, minPresenceAhead: 24 }, heading)
      : null,
    ...paragraphs.map((paragraph) => text(undefined, paragraph)),
    ...entries.map(entry),
  );
}

function page(children: ReactNode[]): ReactElement<DocumentProps> {
  return h(
    Document,
    null,
    h(Page, { size: 'A4', style: styles.page }, ...children),
  );
}

function resumePdf(resume: Resume): ReactElement<DocumentProps> {
  return page([
    header({ name: resume.name, contact: resume.contact }),
    ...resumeSections(resume).map(section),
  ]);
}

function coverLetterPdf(
  letter: CoverLetterDocumentResponse,
): ReactElement<DocumentProps> {
  return page([
    header(letter.header),
    text(styles.paragraph, letter.greeting),
    ...letter.paragraphs.map((paragraph) => text(styles.paragraph, paragraph)),
    text(undefined, letter.signOff),
    text(undefined, letter.header.name),
  ]);
}

export function renderPdf(document: ExportableDocument): Promise<Buffer> {
  return renderToBuffer(
    document.kind === 'resume'
      ? resumePdf(document.resume)
      : coverLetterPdf(document),
  );
}
