import {
  COUNTRY_CODES,
  CURRENCIES,
  TARGET_ROLES_LIMITS,
  WORK_SETUPS,
  YEARS_OF_EXPERIENCE_LIMITS,
  type CountryCode,
  type CreateProfileRequest,
  type Currency,
  type SalaryFloor,
  type WorkSetup,
} from '@quarry/contracts';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsObject,
  IsString,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { UploadedFileRefDto } from '../../storage/dto/uploaded-file-ref.dto';

const trimEach = ({ value }: { value: unknown }) =>
  Array.isArray(value)
    ? value.map((item) => (typeof item === 'string' ? item.trim() : item))
    : value;

export class SalaryFloorDto implements SalaryFloor {
  @IsInt()
  @Min(1)
  amount: number;

  @IsIn(CURRENCIES)
  currency: Currency;
}

export class CreateProfileDto implements CreateProfileRequest {
  @Transform(trimEach)
  @IsArray()
  @ArrayMinSize(TARGET_ROLES_LIMITS.minItems)
  @ArrayMaxSize(TARGET_ROLES_LIMITS.maxItems)
  @IsString({ each: true })
  @Length(1, TARGET_ROLES_LIMITS.maxLength, { each: true })
  targetRoles: string[];

  @IsInt()
  @Min(YEARS_OF_EXPERIENCE_LIMITS.min)
  @Max(YEARS_OF_EXPERIENCE_LIMITS.max)
  yearsOfExperience: number;

  @IsIn(COUNTRY_CODES)
  countryCode: CountryCode;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(WORK_SETUPS.length)
  @ArrayUnique()
  @IsIn(WORK_SETUPS, { each: true })
  workSetups: WorkSetup[];

  @IsObject()
  @ValidateNested()
  @Type(() => SalaryFloorDto)
  salaryFloor: SalaryFloorDto;

  @IsObject()
  @ValidateNested()
  @Type(() => UploadedFileRefDto)
  resume: UploadedFileRefDto;
}
