import { INestApplication, Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { STORAGE_BUCKET } from '../../src/app/storage/storage.constants';
import { PARSE_RETRY_DELAYS_MS } from '../../src/app/resume/parser/parser.constants';
import { configureApp } from '../../src/configure-app';
import { InMemoryBucket } from '../../src/test-utils/in-memory-bucket';

export type TestAppOptions = {
  // Extra controllers, for exercising guards and decorators through a route,
  // with the modules that export what they need.
  controllers?: Type[];
  imports?: Type[];
  // To seed files before the app starts, for code that runs on startup.
  bucket?: InMemoryBucket;
};

// The full AppModule as main.ts configures it, on the in-memory database and
// bucket. app.init() builds the auth indexes. Close it in afterAll.
export async function createTestApp({
  controllers = [],
  imports = [],
  bucket = new InMemoryBucket(),
}: TestAppOptions = {}): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule, ...imports],
    controllers,
  })
    .overrideProvider(STORAGE_BUCKET)
    .useValue(bucket)
    // Retries run back to back, so failure tests don't wait out the backoff.
    .overrideProvider(PARSE_RETRY_DELAYS_MS)
    .useValue([0, 0])
    .compile();

  const app = moduleRef.createNestApplication({ bodyParser: false });
  configureApp(app);
  await app.init();

  return app;
}

export function getTestBucket(app: INestApplication): InMemoryBucket {
  return app.get<InMemoryBucket>(STORAGE_BUCKET);
}
