import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProfileModule } from '../profile/profile.module';
import { Resume, ResumeSchema } from './resume.schema';
import { ResumeService } from './resume.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Resume.name, schema: ResumeSchema }]),
    // For RequireProfileGuard on resume endpoints.
    forwardRef(() => ProfileModule),
  ],
  providers: [ResumeService],
  exports: [ResumeService],
})
export class ResumeModule {}
