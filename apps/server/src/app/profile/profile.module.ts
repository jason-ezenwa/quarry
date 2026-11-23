import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ResumeModule } from '../resume/resume.module';
import { StorageModule } from '../storage/storage.module';
import { ProfileGateModule } from './profile-gate.module';
import { ProfileController } from './profile.controller';
import { Profile, ProfileSchema } from './profile.schema';
import { ProfileService } from './profile.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Profile.name, schema: ProfileSchema }]),
    StorageModule,
    ProfileGateModule,
    ResumeModule,
  ],
  controllers: [ProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}
