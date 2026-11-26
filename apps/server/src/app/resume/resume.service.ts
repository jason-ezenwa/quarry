import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type {
  CreateTailoredResumeInput,
  DocumentHeader,
  EditTailoredResumeInput,
  PrimaryResumeResponse,
  Resume as ResumeContent,
  TailoredResumeDocumentResponse,
  UploadedFileRef,
} from '@quarry/contracts';
import { ClientSession, Model, type QueryFilter, Types } from 'mongoose';
import type { SessionContext } from '../common/common.types';
import { errorName } from '../common/error-name';
import {
  documentNotFound,
  ownedDocumentFilter,
} from '../common/owned-document';
import { StorageService } from '../storage/storage.service';
import type { StoredFile } from '../storage/storage.types';
import { ResumeParserService } from './parser/parser.service';
import { Resume, ResumeDocument, ResumeFile } from './resume.schema';
import type { CreatePrimaryResumeInput, PrimaryContent } from './resume.types';
import {
  replaceSections,
  requiredContentFields,
  toDocumentHeader,
  toPrimaryResumeResponse,
  toResumeContent,
  toResumeContentUpdate,
  toTailoredResumeResponse,
} from './resume.utils';

@Injectable()
export class ResumeService {
  private readonly logger = new Logger(ResumeService.name);

  constructor(
    @InjectModel(Resume.name)
    private readonly resumeModel: Model<ResumeDocument>,
    private readonly storageService: StorageService,
    private readonly resumeParserService: ResumeParserService,
  ) {}

  async isFileInUse(path: string): Promise<boolean> {
    return (await this.resumeModel.exists({ 'file.path': path })) !== null;
  }

  // Created in `parsing`, ready for the parse to claim it.
  async createPrimary(
    { userId, file }: CreatePrimaryResumeInput,
    session: ClientSession,
  ): Promise<ResumeDocument> {
    const resume = new Resume();
    resume.user = new Types.ObjectId(userId);
    resume.kind = 'primary';
    resume.file = this.toResumeFile(file);
    resume.parseStatus = 'parsing';
    resume.parseStartedAt = new Date();

    return new this.resumeModel(resume).save({ session });
  }

  startParse(resumeId: string): void {
    void this.runParse(resumeId);
  }

  // Parse failures are recorded on the resume; this only logs crashes.
  async runParse(resumeId: string): Promise<void> {
    try {
      await this.resumeParserService.parse(resumeId);
    } catch (error) {
      this.logger.error('Resume parse crashed', {
        resumeId,
        error: errorName(error),
      });
    }
  }

  // The content an agent may work from: parsed, reviewed or not. Null while
  // it is unparsed, being read again, or failed.
  async findPrimaryContent(userId: string): Promise<PrimaryContent | null> {
    const resume = await this.resumeModel.findOne(
      this.primaryFilter(userId, { parseStatus: 'parsed' }),
    );

    return resume
      ? {
          content: toResumeContent(resume),
          reviewed: Boolean(resume.reviewedAt),
        }
      : null;
  }

  async isPrimaryReady(userId: string): Promise<boolean> {
    return (
      (await this.resumeModel.exists(
        this.primaryFilter(userId, { parseStatus: 'parsed' }),
      )) !== null
    );
  }

  // The default header for a new cover letter: the latest tailored resume's
  // in this session, else the primary resume's.
  async findHeader(owner: SessionContext): Promise<DocumentHeader> {
    const latest = await this.findLatestTailored(owner);

    if (latest) return toDocumentHeader(toResumeContent(latest));

    const primary = await this.findPrimaryContent(owner.userId);
    if (!primary) throw new ConflictException('Primary resume not parsed');

    return toDocumentHeader(primary.content);
  }

  // The latest tailored resume in this session, else the primary resume.
  async findLatestContent(owner: SessionContext): Promise<ResumeContent> {
    const latest = await this.findLatestTailored(owner);
    if (latest) return toResumeContent(latest);

    const primary = await this.findPrimaryContent(owner.userId);
    if (!primary) throw new ConflictException('Primary resume not parsed');

    return primary.content;
  }

  async createTailored(
    owner: SessionContext,
    { name, resume }: CreateTailoredResumeInput,
  ): Promise<ResumeDocument> {
    return this.saveTailored(owner, name, resume);
  }

  // Saves an edited copy; the source is never changed. Null when the source
  // isn't a tailored resume in this session.
  async editTailored(
    owner: SessionContext,
    { sourceResumeId, name, sections }: EditTailoredResumeInput,
  ): Promise<ResumeDocument | null> {
    const source = await this.findTailored(owner, sourceResumeId);
    if (!source) return null;

    return this.saveTailored(
      owner,
      name,
      replaceSections(toResumeContent(source), sections),
      source._id,
    );
  }

  async getTailored(
    owner: SessionContext,
    resumeId: string,
  ): Promise<TailoredResumeDocumentResponse> {
    const resume = await this.findTailored(owner, resumeId);
    if (!resume) throw documentNotFound();

    return toTailoredResumeResponse(resume);
  }

  async getPrimary(userId: string): Promise<PrimaryResumeResponse> {
    return toPrimaryResumeResponse(await this.findPrimary(userId));
  }

  // Saving marks the resume reviewed, and keeps it reviewed on later saves.
  async savePrimary(
    userId: string,
    content: ResumeContent,
  ): Promise<PrimaryResumeResponse> {
    const saved = await this.resumeModel.findOneAndUpdate(
      this.primaryFilter(userId, { parseStatus: 'parsed' }),
      toResumeContentUpdate(content, { reviewedAt: new Date() }),
      { returnDocument: 'after' },
    );

    if (!saved) {
      return this.throwConflictOrNotFound(userId, 'Resume is not parsed');
    }

    return toPrimaryResumeResponse(saved);
  }

  async retryParse(userId: string): Promise<void> {
    const claimed = await this.resumeModel.findOneAndUpdate(
      this.primaryFilter(userId, { parseStatus: 'failed' }),
      {
        $set: {
          parseStatus: 'parsing',
          parseStartedAt: new Date(),
          parseError: null,
        },
      },
      { returnDocument: 'after' },
    );

    if (!claimed) {
      return this.throwConflictOrNotFound(
        userId,
        'Only a failed parse can be retried',
      );
    }

    this.startParse(claimed.id);
  }

  // Keeps the previous content until the new file parses, but clears the
  // review so the user checks what was read from the new file.
  async replaceFile(
    userId: string,
    upload: UploadedFileRef,
  ): Promise<PrimaryResumeResponse> {
    const current = await this.findPrimary(userId);

    // Checked before committing, so a refused request leaves storage alone.
    if (current.parseStatus === 'parsing') {
      throw new ConflictException('Resume is being parsed');
    }

    const file = await this.storageService.commit(
      userId,
      'primary-resume',
      upload,
    );

    const previousPath = current.file?.path;

    let replaced: ResumeDocument | null;

    try {
      replaced = await this.resumeModel.findOneAndUpdate(
        { _id: current._id, parseStatus: { $ne: 'parsing' } },
        {
          $set: {
            file: this.toResumeFile(file),
            parseStatus: 'parsing',
            parseStartedAt: new Date(),
            parseError: null,
            reviewedAt: null,
          },
        },
        { returnDocument: 'after' },
      );
    } catch (error) {
      await this.discardUnusedFile(file.path);
      throw error;
    }

    // A concurrent re-upload claimed the resume first, possibly with the same
    // key and so the same path, which then must be kept.
    if (!replaced) {
      await this.discardUnusedFile(file.path);
      throw new ConflictException('Resume is being parsed');
    }

    if (previousPath && previousPath !== file.path) {
      await this.deleteQuietly(previousPath);
    }

    this.startParse(replaced.id);

    return toPrimaryResumeResponse(replaced);
  }

  private async findPrimary(userId: string): Promise<ResumeDocument> {
    const resume = await this.resumeModel.findOne(this.primaryFilter(userId));

    if (!resume) {
      throw new NotFoundException('Primary resume not found');
    }

    return resume;
  }

  private async findTailored(
    owner: SessionContext,
    resumeId: string,
  ): Promise<ResumeDocument | null> {
    const owned = ownedDocumentFilter(owner, resumeId);

    return owned
      ? this.resumeModel.findOne({ ...owned, kind: 'tailored' })
      : null;
  }

  private async findLatestTailored(
    owner: SessionContext,
  ): Promise<ResumeDocument | null> {
    return this.resumeModel
      .findOne(this.tailoredFilter(owner))
      .sort({ createdAt: -1, _id: -1 });
  }

  private tailoredFilter({
    userId,
    sessionId,
  }: SessionContext): QueryFilter<Resume> {
    return {
      user: new Types.ObjectId(userId),
      session: new Types.ObjectId(sessionId),
      kind: 'tailored',
    };
  }

  private async saveTailored(
    { userId, sessionId }: SessionContext,
    title: string,
    content: ResumeContent,
    sourceResume?: Types.ObjectId,
  ): Promise<ResumeDocument> {
    const resume = new Resume();
    resume.user = new Types.ObjectId(userId);
    resume.kind = 'tailored';
    resume.session = new Types.ObjectId(sessionId);
    resume.title = title;
    resume.sourceResume = sourceResume;
    Object.assign(resume, requiredContentFields(content));
    resume.summary = content.summary;

    const saved = await new this.resumeModel(resume).save();

    this.logger.log('Tailored resume saved', {
      userId,
      sessionId,
      documentId: saved.id,
      edited: Boolean(sourceResume),
    });

    return saved;
  }

  // Moves parseStartedAt to now in the same write, so no one else claims it.
  async claimStaleParse(staleBefore: Date): Promise<ResumeDocument | null> {
    return this.resumeModel.findOneAndUpdate(
      {
        kind: 'primary',
        parseStatus: 'parsing',
        parseStartedAt: { $lt: staleBefore },
      },
      { $set: { parseStartedAt: new Date() } },
      { returnDocument: 'after' },
    );
  }

  // The update matched nothing: 404 without a primary resume, else 409.
  private async throwConflictOrNotFound(
    userId: string,
    message: string,
  ): Promise<never> {
    await this.findPrimary(userId);
    throw new ConflictException(message);
  }

  private primaryFilter(
    userId: string,
    extra: QueryFilter<Resume> = {},
  ): QueryFilter<Resume> {
    return { user: new Types.ObjectId(userId), kind: 'primary', ...extra };
  }

  private toResumeFile(file: StoredFile): ResumeFile {
    const resumeFile = new ResumeFile();
    resumeFile.path = file.path;
    resumeFile.mimeType = file.mimeType;
    resumeFile.originalName = file.originalName;
    resumeFile.size = file.size;

    return resumeFile;
  }

  // Storage logs its own failures; a leftover object must not fail the request.
  private async deleteQuietly(path: string): Promise<void> {
    try {
      await this.storageService.delete(path);
    } catch {}
  }

  // Cleanup must never mask the error the caller is about to throw.
  private async discardUnusedFile(path: string): Promise<void> {
    try {
      if (!(await this.isFileInUse(path))) await this.deleteQuietly(path);
    } catch {}
  }
}
