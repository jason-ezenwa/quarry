import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProfileGateService } from './profile-gate.service';
import { Profile, ProfileSchema } from './profile.schema';
import { RequireProfileGuard } from './require-profile.guard';

// Lets any module gate its endpoints on a finished onboarding without
// importing ProfileModule, which itself depends on ResumeModule.
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Profile.name, schema: ProfileSchema }]),
  ],
  providers: [ProfileGateService, RequireProfileGuard],
  exports: [ProfileGateService, RequireProfileGuard],
})
export class ProfileGateModule {}
