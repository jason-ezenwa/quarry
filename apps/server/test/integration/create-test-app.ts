import { INestApplication, Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { PARSE_RETRY_DELAYS_MS } from '../../src/app/resume/parser/parser.constants';
import { configureApp } from '../../src/configure-app';

export type TestAppOptions = {
  // Extra test controllers, plus the modules that export what they need.
  controllers?: Type[];
  imports?: Type[];
  // Providers to replace, such as the job fetcher's DNS lookup.
  overrides?: { provide: unknown; useValue: unknown }[];
};

// The full AppModule as main.ts configures it, on the in-memory database, with
// R2 faked over the network. app.init() builds the auth indexes. Close it in afterAll.
export async function createTestApp({
  controllers = [],
  imports = [],
  overrides = [],
}: TestAppOptions = {}): Promise<INestApplication> {
  const builder = Test.createTestingModule({
    imports: [AppModule, ...imports],
    controllers,
  })
    // Retries run back to back, so failure tests don't wait out the backoff.
    .overrideProvider(PARSE_RETRY_DELAYS_MS)
    .useValue([0, 0]);

  for (const { provide, useValue } of overrides) {
    builder.overrideProvider(provide).useValue(useValue);
  }

  const moduleRef = await builder.compile();

  const app = moduleRef.createNestApplication({ bodyParser: false });
  configureApp(app);
  await app.init();

  return app;
}
