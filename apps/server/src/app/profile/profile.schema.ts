import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  COUNTRY_CODES,
  CURRENCIES,
  WORK_SETUPS,
  type CountryCode,
  type Currency,
  type SalaryFloor as SalaryFloorShape,
  type WorkSetup,
} from '@quarry/contracts';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ _id: false })
export class SalaryFloor implements SalaryFloorShape {
  @Prop({ required: true, type: Number })
  amount: number;

  @Prop({ required: true, type: String, enum: CURRENCIES })
  currency: Currency;
}

// One per user; having one is what lets a user past onboarding.
@Schema({ timestamps: true, collection: 'profiles' })
export class Profile {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  user: Types.ObjectId;

  @Prop({ required: true, type: [String] })
  targetRoles: string[];

  @Prop({ required: true, type: Number })
  yearsOfExperience: number;

  @Prop({ required: true, type: String, enum: COUNTRY_CODES })
  countryCode: CountryCode;

  @Prop({ required: true, type: [String], enum: WORK_SETUPS })
  workSetups: WorkSetup[];

  @Prop({ required: true, type: SchemaFactory.createForClass(SalaryFloor) })
  salaryFloor: SalaryFloor;

  createdAt: Date;
  updatedAt: Date;
}

export type ProfileDocument = HydratedDocument<Profile>;
export const ProfileSchema = SchemaFactory.createForClass(Profile);
