import { describe, expect, it } from 'vitest';
import { extractMainText, htmlToText } from './page-text.utils';

describe('htmlToText', () => {
  it('keeps paragraphs, headings and list items on their own lines', () => {
    const html = `
      <h2>About the role</h2><p>You will   build
      payments &amp; settlements.</p>
      <ul><li>TypeScript</li><li><strong>MongoDB</strong> at scale</li></ul>
      <p>Line one<br>Line two</p>`;

    expect(htmlToText(html)).toBe(
      [
        'About the role',
        '',
        'You will build payments & settlements.',
        '',
        '- TypeScript',
        '- MongoDB at scale',
        '',
        'Line one',
        'Line two',
      ].join('\n'),
    );
  });

  it('leaves out scripts and styles', () => {
    expect(
      htmlToText('<p>Visible</p><script>alert(1)</script><style>p{}</style>'),
    ).toBe('Visible');
  });
});

describe('extractMainText', () => {
  const paragraph =
    'Acme is hiring a Backend Engineer to build payment rails for African businesses, settling cards, bank transfers and mobile money every day.';

  const page = (inner: string) =>
    Buffer.from(
      `<html><body><article><h1>Backend Engineer</h1>${inner}</article></body></html>`,
    );

  const read = (body: Buffer) =>
    extractMainText(body, new URL('https://careers.acme.example/jobs/1'));

  it('keeps the text around scripts, styles and inline images', () => {
    const text = read(
      page(
        `<p>${paragraph}</p><SCRIPT type="module">track("x")</SCRIPT><style>p{}</style><svg><text>logo</text></svg><noscript>Enable JS</noscript><p>${paragraph}</p>`,
      ),
    );

    expect(text).toBe(`Backend Engineer\n\n${paragraph}\n\n${paragraph}`);
  });

  it('reads a page with a script that is never closed', () => {
    expect(read(page(`<p>${paragraph}</p><script>track("x")`))).toBe(
      `Backend Engineer\n\n${paragraph}`,
    );
  });

  it('keeps non-ASCII text intact', () => {
    const accented = `${paragraph} Rémunération attractive, café inclus.`;

    expect(
      extractMainText(
        page(`<script>x</script><p>${accented}</p>`),
        new URL('https://careers.acme.example/jobs/1'),
        'text/html; charset=utf-8',
      ),
    ).toBe(`Backend Engineer\n\n${accented}`);
  });
});
