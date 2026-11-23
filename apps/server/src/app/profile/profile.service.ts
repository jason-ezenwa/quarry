import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { ClientSession, Connection, Model, Types } from 'mongoose';
import { isDuplicateKeyError } from '../../lib/mongo-errors/mongo-errors';
import { ResumeService } from '../resume/resume.service';
import { StorageService } from '../storage/storage.service';
import type { CreateProfileDto } from './dto/create-profile.dto';
import { ProfileGateService } from './profile-gate.service';
import { Profile, ProfileDocument, SalaryFloor } from './profile.schema';

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(
    @InjectModel(Profile.name)
    private readonly profileModel: Model<ProfileDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly storageService: StorageService,
    private readonly resumeService: ResumeService,
    private readonly profileGateService: ProfileGateService,
  ) {}

  async findByUserId(userId: string): Promise<ProfileDocument | null> {
    return this.profileModel.findOne({ user: new Types.ObjectId(userId) });
  }

  // Finishes onboarding: the profile and its primary resume are written
  // together, after the uploaded file is committed.
  async create(
    userId: string,
    dto: CreateProfileDto,
  ): Promise<ProfileDocument> {
    // Checked before any storage work, so a sequential duplicate costs nothing.
    if (await this.profileGateService.existsForUser(userId)) {
      throw new ConflictException('Profile already exists');
    }

    // Copied before any write, so a missing key changes nothing. The pending
    // object stays for the lifecycle rule, so a retry can copy it again.
    const file = await this.storageService.commit(
      userId,
      'primary-resume',
      dto.resume,
    );

    try {
      const { profile, resume } = await this.connection.transaction(
        async (session) => ({
          profile: await this.insert(userId, dto, session),
          resume: await this.resumeService.createPrimary(
            { userId, file },
            session,
          ),
        }),
      );

      this.logger.log('Profile created', { userId, profileId: profile.id });
      this.resumeService.startParse(resume.id);

      return profile;
    } catch (error) {
      await this.discardUnusedFile(file.path);

      // A concurrent submit won the insert.
      if (isDuplicateKeyError(error)) {
        throw new ConflictException('Profile already exists');
      }

      throw error;
    }
  }

  // A concurrent submit of the same key may own the path, so only an
  // unreferenced copy is removed. Cleanup failure must not mask the error.
  private async discardUnusedFile(path: string): Promise<void> {
    try {
      if (!(await this.resumeService.isFileInUse(path))) {
        await this.storageService.delete(path);
      }
    } catch (error) {
      this.logger.warn('Committed file cleanup failed', { path, error });
    }
  }

  private async insert(
    userId: string,
    dto: CreateProfileDto,
    session: ClientSession,
  ): Promise<ProfileDocument> {
    const salaryFloor = new SalaryFloor();
    salaryFloor.amount = dto.salaryFloor.amount;
    salaryFloor.currency = dto.salaryFloor.currency;

    const profile = new Profile();
    profile.user = new Types.ObjectId(userId);
    profile.targetRoles = dto.targetRoles;
    profile.yearsOfExperience = dto.yearsOfExperience;
    profile.countryCode = dto.countryCode;
    profile.workSetups = dto.workSetups;
    profile.salaryFloor = salaryFloor;

    return new this.profileModel(profile).save({ session });
  }
}
