import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Profile, ProfileDocument } from './profile.schema';

@Injectable()
export class ProfileGateService {
  constructor(
    @InjectModel(Profile.name)
    private readonly profileModel: Model<ProfileDocument>,
  ) {}

  async existsForUser(userId: string): Promise<boolean> {
    const found = await this.profileModel.exists({
      user: new Types.ObjectId(userId),
    });

    return found !== null;
  }
}
