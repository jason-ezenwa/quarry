import {
  BadRequestException,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryBucket } from '../../../test-utils/in-memory-bucket';
import { STORAGE_BUCKET } from '../storage-bucket';
import { StorageService } from '../storage.service';
import type { UploadFile } from '../storage.types';

const MB = 1024 * 1024;
const PDF = 'application/pdf';

const DOCX =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const file = (overrides: Partial<UploadFile> = {}): UploadFile => ({
  buffer: Buffer.from('%PDF-1.7'),
  mimetype: PDF,
  size: 8,
  originalname: 'Ada Obi CV.pdf',
  ...overrides,
});

describe('StorageService (integration)', () => {
  let service: StorageService;
  let bucket: InMemoryBucket;

  beforeEach(async () => {
    bucket = new InMemoryBucket();

    const moduleRef = await Test.createTestingModule({
      providers: [
        StorageService,
        { provide: STORAGE_BUCKET, useValue: bucket },
      ],
    }).compile();

    service = moduleRef.get(StorageService);
  });

  describe('uploadPending', () => {
    it('stores the file under the pending folder and returns its key', async () => {
      const upload = file();

      const result = await service.uploadPending(
        'user-1',
        'primary-resume',
        upload,
      );

      expect(result).toEqual({
        key: expect.stringMatching(/^[A-Za-z0-9_-]{21}\.pdf$/),
        mimeType: PDF,
      });

      expect(
        bucket.objects.get(`pending/user-1/primary-resume/${result.key}`),
      ).toEqual({
        data: upload.buffer,
        contentType: PDF,
        metadata: { 'original-name': 'Ada%20Obi%20CV.pdf' },
      });
    });

    it('accepts a DOCX up to 5 MB and gives its key a .docx extension', async () => {
      const result = await service.uploadPending(
        'user-1',
        'primary-resume',
        file({ mimetype: DOCX, size: 5 * MB }),
      );

      expect(result.key.endsWith('.docx')).toBe(true);
    });

    it('rejects a type outside the allowlist', async () => {
      await expect(
        service.uploadPending(
          'user-1',
          'primary-resume',
          file({ mimetype: 'image/png' }),
        ),
      ).rejects.toThrow(BadRequestException);

      expect(bucket.objects.size).toBe(0);
    });

    it('rejects a file one byte over 5 MB', async () => {
      await expect(
        service.uploadPending(
          'user-1',
          'primary-resume',
          file({ size: 5 * MB + 1 }),
        ),
      ).rejects.toThrow(PayloadTooLargeException);

      expect(bucket.objects.size).toBe(0);
    });
  });

  describe('commit', () => {
    it('copies the pending upload into the user folder and describes it', async () => {
      const upload = file();

      const ref = await service.uploadPending(
        'user-1',
        'primary-resume',
        upload,
      );

      const stored = await service.commit('user-1', 'primary-resume', ref);

      expect(stored).toEqual({
        path: `users/user-1/primary-resume/${ref.key}`,
        mimeType: PDF,
        originalName: 'Ada Obi CV.pdf',
        size: upload.buffer.length,
      });

      expect(bucket.objects.get(stored.path)?.data).toEqual(upload.buffer);
    });

    it('throws NotFoundException for a key another user uploaded', async () => {
      const ref = await service.uploadPending(
        'user-2',
        'primary-resume',
        file(),
      );

      await expect(
        service.commit('user-1', 'primary-resume', ref),
      ).rejects.toThrow(NotFoundException);

      expect(bucket.objects.has(`users/user-1/primary-resume/${ref.key}`)).toBe(
        false,
      );
    });

    it('throws BadRequestException when the type does not match the key', async () => {
      const ref = await service.uploadPending(
        'user-1',
        'primary-resume',
        file(),
      );

      await expect(
        service.commit('user-1', 'primary-resume', { ...ref, mimeType: DOCX }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('delete', () => {
    it('removes the object at the path and leaves the others', async () => {
      const kept = await service.uploadPending(
        'user-1',
        'primary-resume',
        file(),
      );

      const removed = await service.uploadPending(
        'user-1',
        'primary-resume',
        file(),
      );

      await service.delete(`pending/user-1/primary-resume/${removed.key}`);

      expect([...bucket.objects.keys()]).toEqual([
        `pending/user-1/primary-resume/${kept.key}`,
      ]);
    });
  });

  describe('getSignedUrl', () => {
    it('returns a URL for the path that expires after the given time', async () => {
      const url = await service.getSignedUrl(
        'users/user-1/primary-resume/a.pdf',
        5 * 60 * 1000,
      );

      expect(url).toBe(
        'https://storage.test/users/user-1/primary-resume/a.pdf?expires-in=300',
      );
    });
  });
});
