import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProfileGateModule } from '../profile/profile-gate.module';
import { ResumeModule } from '../resume/resume.module';
import { CoverLetter, CoverLetterSchema } from './cover-letter.schema';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { ExportService } from './export/export.service';
import { FitScore, FitScoreSchema } from './fit-score.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FitScore.name, schema: FitScoreSchema },
      { name: CoverLetter.name, schema: CoverLetterSchema },
    ]),
    ProfileGateModule,
    ResumeModule,
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService, ExportService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
