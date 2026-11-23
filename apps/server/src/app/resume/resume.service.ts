import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { Resume, ResumeDocument, ResumeFile } from './resume.schema';
import type { CreatePrimaryResumeInput } from './resume.types';

@Injectable()
export class ResumeService {
  constructor(
    @InjectModel(Resume.name)
    private readonly resumeModel: Model<ResumeDocument>,
  ) {}

  async isFileInUse(path: string): Promise<boolean> {
    return (await this.resumeModel.exists({ 'file.path': path })) !== null;
  }

  // Created in `parsing`, ready for the parse to claim it.
  async createPrimary(
    { userId, file }: CreatePrimaryResumeInput,
    session: ClientSession,
  ): Promise<ResumeDocument> {
    const resumeFile = new ResumeFile();
    resumeFile.path = file.path;
    resumeFile.mimeType = file.mimeType;
    resumeFile.originalName = file.originalName;
    resumeFile.size = file.size;

    const resume = new Resume();
    resume.user = new Types.ObjectId(userId);
    resume.kind = 'primary';
    resume.file = resumeFile;
    resume.parseStatus = 'parsing';
    resume.parseStartedAt = new Date();

    return new this.resumeModel(resume).save({ session });
  }
}
