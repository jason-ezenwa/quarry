import { http, HttpResponse } from 'msw';

// Matches the R2_* values in env.ts, so the app's S3 client reaches this fake.
export const R2_TEST_CONFIG = {
  accountId: 'account-1',
  accessKeyId: 'access-key',
  secretAccessKey: 'secret-key',
  bucketName: 'quarry-test',
};

export const R2_BUCKET_URL = `https://${R2_TEST_CONFIG.bucketName}.${R2_TEST_CONFIG.accountId}.r2.cloudflarestorage.com`;

export type StoredObject = {
  data: Buffer;
  contentType: string;
  metadata: Record<string, string>;
};

const METADATA_PREFIX = 'x-amz-meta-';

const pathOf = (request: Request) =>
  decodeURIComponent(new URL(request.url).pathname).slice(1);

const metadataOf = (headers: Headers) =>
  Object.fromEntries(
    [...headers]
      .filter(([name]) => name.startsWith(METADATA_PREFIX))
      .map(([name, value]) => [name.slice(METADATA_PREFIX.length), value]),
  );

const headersOf = (object: StoredObject) => ({
  'content-length': String(object.data.length),
  'content-type': object.contentType,
  ...Object.fromEntries(
    Object.entries(object.metadata).map(([name, value]) => [
      `${METADATA_PREFIX}${name}`,
      value,
    ]),
  ),
});

const noSuchKey = () =>
  HttpResponse.xml(
    '<Error><Code>NoSuchKey</Code><Message>The specified key does not exist.</Message></Error>',
    { status: 404 },
  );

// R2's S3 API for the calls R2Bucket makes. `objects` is keyed by object path.
export class FakeR2 {
  readonly objects = new Map<string, StoredObject>();

  readonly handlers = [
    // PutObject, or CopyObject when the request names a copy source.
    http.put(`${R2_BUCKET_URL}/*`, async ({ request }) => {
      const copySource = request.headers.get('x-amz-copy-source');

      if (copySource) {
        const source = decodeURIComponent(copySource).slice(
          `${R2_TEST_CONFIG.bucketName}/`.length,
        );

        const object = this.objects.get(source);
        if (!object) return noSuchKey();

        this.objects.set(pathOf(request), object);

        return HttpResponse.xml(
          '<CopyObjectResult><ETag>"etag"</ETag><LastModified>2026-01-01T00:00:00.000Z</LastModified></CopyObjectResult>',
        );
      }

      this.objects.set(pathOf(request), {
        data: Buffer.from(await request.arrayBuffer()),
        contentType:
          request.headers.get('content-type') ?? 'application/octet-stream',
        metadata: metadataOf(request.headers),
      });

      return new HttpResponse(null, { headers: { etag: '"etag"' } });
    }),
    // A HEAD response has no body, so a missing key is a bare 404.
    http.head(`${R2_BUCKET_URL}/*`, ({ request }) => {
      const object = this.objects.get(pathOf(request));
      if (!object) return new HttpResponse(null, { status: 404 });

      return new HttpResponse(null, { headers: headersOf(object) });
    }),
    http.get(`${R2_BUCKET_URL}/*`, ({ request }) => {
      const object = this.objects.get(pathOf(request));
      if (!object) return noSuchKey();

      return new HttpResponse(object.data, { headers: headersOf(object) });
    }),
    // Like S3, deleting a missing object succeeds.
    http.delete(`${R2_BUCKET_URL}/*`, ({ request }) => {
      this.objects.delete(pathOf(request));

      return new HttpResponse(null, { status: 204 });
    }),
  ];

  reset(): void {
    this.objects.clear();
  }
}

export const fakeR2 = new FakeR2();
