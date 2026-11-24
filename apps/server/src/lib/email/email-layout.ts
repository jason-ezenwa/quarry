import { COLORS, FONT_STACK } from './email.constants';
import type { ActionEmailOptions } from './email.types';
import { escapeHtml } from './escape-html';

export function renderActionEmail({
  title,
  preheader,
  paragraphs,
  action,
  note,
}: ActionEmailOptions): string {
  const url = escapeHtml(action.url);

  const body = paragraphs
    .map(
      (html) =>
        `<p style="margin:0 0 14px;font-size:16px;line-height:1.6;color:${COLORS.ink};">${html}</p>`,
    )
    .join('\n');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:${COLORS.plaster};font-family:${FONT_STACK};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${COLORS.plaster};">
      <tr><td align="center" style="padding:32px 16px;">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="width:100%;max-width:560px;">
          <tr><td style="padding:0 4px 16px;font-size:18px;font-weight:600;letter-spacing:-0.02em;color:${COLORS.ink};">Quarry</td></tr>
          <tr><td style="background:${COLORS.paper};border:1px solid ${COLORS.line};border-radius:12px;padding:32px;">
            <h1 style="margin:0 0 18px;font-size:24px;line-height:1.2;font-weight:600;letter-spacing:-0.02em;color:${COLORS.ink};">${escapeHtml(title)}</h1>
            ${body}
            <table role="presentation" cellspacing="0" cellpadding="0" style="margin:22px 0 26px;"><tr>
              <td bgcolor="${COLORS.chocolate}" style="border-radius:8px;">
                <a href="${url}" style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:600;color:${COLORS.onChocolate};text-decoration:none;">${escapeHtml(action.label)}</a>
              </td>
            </tr></table>
            <p style="margin:0 0 8px;font-size:13px;line-height:1.55;color:${COLORS.inkMuted};">${escapeHtml(note)}</p>
            <p style="margin:0;font-size:12px;line-height:1.55;color:${COLORS.inkFaint};word-break:break-all;">If the button doesn't work, paste this link into your browser: ${url}</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}
