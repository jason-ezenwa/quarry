import { Readability } from '@mozilla/readability';
import { JSDOM, VirtualConsole } from 'jsdom';

const SKIPPED_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'TEMPLATE',
  'SVG',
  'IFRAME',
  'OBJECT',
]);

// Blocks set off by a blank line.
const PARAGRAPH_TAGS = new Set([
  'P',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'UL',
  'OL',
  'DL',
  'TABLE',
  'BLOCKQUOTE',
  'PRE',
  'SECTION',
  'ARTICLE',
  'HEADER',
  'FOOTER',
]);

// Blocks that start a new line.
const LINE_TAGS = new Set(['DIV', 'TR', 'DT', 'DD']);

// HTML is parsed without running scripts or loading anything.
export function htmlToText(html: string): string {
  const parts: string[] = [];

  const walk = (node: Node): void => {
    if (node.nodeType === node.TEXT_NODE) {
      parts.push((node.textContent ?? '').replace(/\s+/g, ' '));
      return;
    }

    if (node.nodeType !== node.ELEMENT_NODE) return;

    const tag = (node as Element).tagName.toUpperCase();

    if (SKIPPED_TAGS.has(tag)) return;

    if (tag === 'BR' || tag === 'HR') {
      parts.push('\n');
      return;
    }

    const breakBefore = PARAGRAPH_TAGS.has(tag)
      ? '\n\n'
      : LINE_TAGS.has(tag)
        ? '\n'
        : tag === 'LI'
          ? '\n- '
          : '';

    parts.push(breakBefore);
    node.childNodes.forEach(walk);

    if (PARAGRAPH_TAGS.has(tag)) parts.push('\n\n');
    else if (LINE_TAGS.has(tag)) parts.push('\n');
  };

  JSDOM.fragment(html).childNodes.forEach(walk);

  return parts
    .join('')
    .split('\n')
    .map((line) => line.replace(/ {2,}/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const HTML_TYPES = new Set(['text/html', 'application/xhtml+xml']);

const DEFAULT_CONTENT_TYPE = 'text/html';

// Blocks Readability throws away anyway, removed before jsdom has to build them.
const DISCARDED_BLOCK_START = '<(script|style|noscript|svg)\\b';

// One pass over the page: a block with no closing tag ends the stripping, so
// a hostile page cannot make this quadratic.
function stripDiscardedBlocks(body: Buffer): Buffer {
  // latin1 keeps every byte, so jsdom still detects the page's charset.
  const html = body.toString('latin1');
  const lowered = html.toLowerCase();
  const kept: string[] = [];
  const blockStart = new RegExp(DISCARDED_BLOCK_START, 'gi');
  let position = 0;

  for (
    let start = blockStart.exec(html);
    start;
    start = blockStart.exec(html)
  ) {
    const closing = `</${start[1].toLowerCase()}`;
    const closeAt = lowered.indexOf(closing, start.index);
    const end = closeAt === -1 ? -1 : lowered.indexOf('>', closeAt);

    if (end === -1) break;

    kept.push(html.slice(position, start.index));
    position = end + 1;
    blockStart.lastIndex = position;
  }

  kept.push(html.slice(position));

  return Buffer.from(kept.join(''), 'latin1');
}

function loadHtml(body: Buffer, url: URL, contentType: string) {
  try {
    // No scripts run and nothing is loaded; a silent console keeps page errors
    // (and so page content) out of the logs.
    return new JSDOM(body, {
      url: url.href,
      contentType,
      virtualConsole: new VirtualConsole(),
    });
  } catch {
    return undefined;
  }
}

// The page's main text by Readability, or '' when it is not a page or has none.
export function extractMainText(
  body: Buffer,
  url: URL,
  contentType = DEFAULT_CONTENT_TYPE,
): string {
  const mediaType = contentType.split(';')[0].trim().toLowerCase();

  if (!HTML_TYPES.has(mediaType)) return '';

  const dom = loadHtml(stripDiscardedBlocks(body), url, contentType);

  if (!dom) return '';

  try {
    const article = new Readability(dom.window.document).parse();

    return article?.content ? htmlToText(article.content) : '';
  } finally {
    dom.window.close();
  }
}
