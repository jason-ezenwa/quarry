import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProfileGateModule } from '../profile/profile-gate.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { FitScore, FitScoreSchema } from './fit-score.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FitScore.name, schema: FitScoreSchema },
    ]),
    ProfileGateModule,
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
