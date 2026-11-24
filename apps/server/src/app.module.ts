import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { DocumentsModule } from './app/documents/documents.module';
import { ProfileModule } from './app/profile/profile.module';
import { ResumeModule } from './app/resume/resume.module';
import { SessionsModule } from './app/sessions/sessions.module';
import { StorageModule } from './app/storage/storage.module';
import { THROTTLER_OPTIONS } from './app/throttle/throttle.constants';
import { UserModule } from './app/user/user.module';
import { AppController } from './app.controller';
import { auth } from './lib/auth';
import { AuthIndexesProvider } from './lib/auth-indexes.provider';
import { DATABASE_NAME, getMongoUri } from './lib/database';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule.forRoot({ auth, enableRawBodyParser: true }),
    MongooseModule.forRoot(getMongoUri(), { dbName: DATABASE_NAME }),
    ThrottlerModule.forRoot(THROTTLER_OPTIONS),
    UserModule,
    StorageModule,
    ProfileModule,
    ResumeModule,
    DocumentsModule,
    SessionsModule,
  ],
  controllers: [AppController],
  providers: [AuthIndexesProvider],
})
export class AppModule {}
