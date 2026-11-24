export const SKIPPED_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'TEMPLATE',
  'SVG',
  'IFRAME',
  'OBJECT',
]);

// Blocks set off by a blank line.
export const PARAGRAPH_TAGS = new Set([
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
export const LINE_TAGS = new Set(['DIV', 'TR', 'DT', 'DD']);

export const HTML_TYPES = new Set(['text/html', 'application/xhtml+xml']);

export const DEFAULT_CONTENT_TYPE = 'text/html';

// Blocks Readability throws away anyway, removed before jsdom has to build them.
export const DISCARDED_BLOCK_START = '<(script|style|noscript|svg)\\b';
