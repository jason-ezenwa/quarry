import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import {
  assertMimeTypeMatchesKey,
  buildStorageFolder,
  decodeOriginalName,
  encodeOriginalName,
  UPLOAD_KEY_PATTERN,
} from './storage.utils';

const DOCX =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

describe('buildStorageFolder', () => {
  it('namespaces pending uploads by user id and purpose', () => {
    expect(buildStorageFolder('pending', 'user-1', 'primary-resume')).toBe(
      'pending/user-1/primary-resume',
    );
  });

  it('namespaces committed files by user id and purpose', () => {
    expect(buildStorageFolder('users', 'user-1', 'primary-resume')).toBe(
      'users/user-1/primary-resume',
    );
  });
});

describe('UPLOAD_KEY_PATTERN', () => {
  it.each(['V1StGXR8_Z5jdHi6B-myT.pdf', 'V1StGXR8_Z5jdHi6B-myT.docx'])(
    'accepts the generated key %s',
    (key) => {
      expect(UPLOAD_KEY_PATTERN.test(key)).toBe(true);
    },
  );

  it.each([
    ['a traversal', '../users/other/x.pdf'],
    ['a traversal padded to length', '../V1StGXR8_Z5jdHi6B-m.pdf'],
    ['a forward slash', 'V1StGXR8_Z5jdHi6/-myT.pdf'],
    ['a backslash', 'V1StGXR8_Z5jdHi6\\-myT.pdf'],
    ['a 20-character id', 'V1StGXR8_Z5jdHi6B-my.pdf'],
    ['a 22-character id', 'V1StGXR8_Z5jdHi6B-myTx.pdf'],
    ['no extension', 'V1StGXR8_Z5jdHi6B-myT'],
    ['an uppercase extension', 'V1StGXR8_Z5jdHi6B-myT.PDF'],
    ['an overlong extension', 'V1StGXR8_Z5jdHi6B-myT.docxxx'],
  ])('rejects %s', (_, key) => {
    expect(UPLOAD_KEY_PATTERN.test(key)).toBe(false);
  });
});

describe('assertMimeTypeMatchesKey', () => {
  it.each([
    ['V1StGXR8_Z5jdHi6B-myT.pdf', 'application/pdf'],
    ['V1StGXR8_Z5jdHi6B-myT.docx', DOCX],
  ] as const)('accepts %s as %s', (key, mimeType) => {
    expect(() => assertMimeTypeMatchesKey({ key, mimeType })).not.toThrow();
  });

  it('throws BadRequestException when the key has another extension', () => {
    expect(() =>
      assertMimeTypeMatchesKey({
        key: 'V1StGXR8_Z5jdHi6B-myT.pdf',
        mimeType: DOCX,
      }),
    ).toThrow(BadRequestException);
  });
});

describe('original name encoding', () => {
  it('round-trips a name with non-ASCII characters', () => {
    const name = 'Adaeze Ọkọlọ CV (2026).pdf';
    const encoded = encodeOriginalName(name);

    expect(encoded).toMatch(/^[\x20-\x7e]+$/);
    expect(decodeOriginalName(encoded)).toBe(name);
  });

  it.each([undefined, '', '%E0%A4%A'])('decodes %j to null', (encoded) => {
    expect(decodeOriginalName(encoded)).toBeNull();
  });
});
