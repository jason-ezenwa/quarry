import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createR2Client, R2Bucket } from '../r2-bucket';
import { StorageObjectNotFoundError } from '../storage-bucket';

const config = {
  accountId: 'account-1',
  accessKeyId: 'access-key',
  secretAccessKey: 'secret-key',
  bucketName: 'quarry-test',
};
const BUCKET_URL = 'https://quarry-test.account-1.r2.cloudflarestorage.com';

type SeenRequest = { method: string; path: string; headers: Headers };

describe('R2Bucket (integration)', () => {
  const seen: SeenRequest[] = [];
  const server = setupServer();
  const bucket = new R2Bucket(createR2Client(config), config.bucketName);

  const record = (request: Request) => {
    seen.push({
      method: request.method,
      path: decodeURIComponent(new URL(request.url).pathname),
      headers: request.headers,
    });
  };

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => {
    server.resetHandlers();
    seen.length = 0;
  });
  afterAll(() => server.close());

  it('puts the object with its type and metadata', async () => {
    server.use(
      http.put(`${BUCKET_URL}/*`, ({ request }) => {
        record(request);
        return new HttpResponse(null, { status: 200 });
      }),
    );

    await bucket.put('pending/user-1/primary-resume/a.pdf', Buffer.from('x'), {
      contentType: 'application/pdf',
      metadata: { 'original-name': 'cv.pdf' },
    });

    expect(seen).toHaveLength(1);
    expect(seen[0].path).toBe('/pending/user-1/primary-resume/a.pdf');
    expect(seen[0].headers.get('content-type')).toBe('application/pdf');
    expect(seen[0].headers.get('x-amz-meta-original-name')).toBe('cv.pdf');
  });

  it('copies an object and reports what the source held', async () => {
    server.use(
      http.head(`${BUCKET_URL}/*`, ({ request }) => {
        record(request);
        return new HttpResponse(null, {
          headers: {
            'content-length': '1234',
            'content-type': 'application/pdf',
            'x-amz-meta-original-name': 'cv.pdf',
          },
        });
      }),
      http.put(`${BUCKET_URL}/*`, ({ request }) => {
        record(request);
        return HttpResponse.xml(
          '<CopyObjectResult><ETag>"etag"</ETag><LastModified>2026-01-01T00:00:00.000Z</LastModified></CopyObjectResult>',
        );
      }),
    );

    const copied = await bucket.copy(
      'pending/user-1/primary-resume/a.pdf',
      'users/user-1/primary-resume/a.pdf',
    );

    expect(copied).toEqual({
      size: 1234,
      contentType: 'application/pdf',
      metadata: { 'original-name': 'cv.pdf' },
    });
    expect(seen.map(({ method, path }) => [method, path])).toEqual([
      ['HEAD', '/pending/user-1/primary-resume/a.pdf'],
      ['PUT', '/users/user-1/primary-resume/a.pdf'],
    ]);
    expect(decodeURIComponent(seen[1].headers.get('x-amz-copy-source')!)).toBe(
      'quarry-test/pending/user-1/primary-resume/a.pdf',
    );
  });

  it('throws StorageObjectNotFoundError when the source holds nothing', async () => {
    server.use(
      http.head(
        `${BUCKET_URL}/*`,
        () => new HttpResponse(null, { status: 404 }),
      ),
    );

    await expect(
      bucket.copy('pending/user-2/primary-resume/a.pdf', 'users/user-1/a.pdf'),
    ).rejects.toThrow(StorageObjectNotFoundError);
  });

  it('throws StorageObjectNotFoundError when the source expires before the copy', async () => {
    server.use(
      http.head(
        `${BUCKET_URL}/*`,
        () => new HttpResponse(null, { status: 200 }),
      ),
      http.put(`${BUCKET_URL}/*`, () =>
        HttpResponse.xml(
          '<Error><Code>NoSuchKey</Code><Message>gone</Message></Error>',
          { status: 404 },
        ),
      ),
    );

    await expect(
      bucket.copy('pending/user-1/primary-resume/a.pdf', 'users/user-1/a.pdf'),
    ).rejects.toThrow(StorageObjectNotFoundError);
  });

  it('signs a read URL for the object that expires after the given time', async () => {
    const url = new URL(
      await bucket.getSignedUrl('users/user-1/primary-resume/a.pdf', 300),
    );

    expect(`${url.origin}${url.pathname}`).toBe(
      `${BUCKET_URL}/users/user-1/primary-resume/a.pdf`,
    );
    expect(url.searchParams.get('X-Amz-Expires')).toBe('300');
    expect(url.searchParams.get('X-Amz-Signature')).toBeTruthy();
  });
});
