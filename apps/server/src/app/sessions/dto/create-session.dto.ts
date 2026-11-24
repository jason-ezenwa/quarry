import { SESSION_LIMITS } from '@quarry/contracts';
import { trim } from '../../common/transforms';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateBy,
  ValidateIf,
} from 'class-validator';
import { IsHttpUrl } from '../../resume/dto/is-http-url.decorator';

function IsNotSentWith(other: keyof CreateSessionDto): PropertyDecorator {
  return ValidateBy({
    name: 'isNotSentWith',
    validator: {
      validate: (value, args) =>
        value === undefined ||
        args === undefined ||
        (args.object as CreateSessionDto)[other] === undefined,
      defaultMessage: () => `Send $property or ${other}, not both`,
    },
  });
}

// Exactly one of the two.
export class CreateSessionDto {
  @ValidateIf(
    (dto: CreateSessionDto) =>
      dto.jobUrl !== undefined || dto.jobDescription === undefined,
  )
  @IsNotSentWith('jobDescription')
  @Transform(trim)
  @IsHttpUrl()
  jobUrl?: string;

  @ValidateIf((dto: CreateSessionDto) => dto.jobUrl === undefined)
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(SESSION_LIMITS.jobDescriptionMaxLength)
  jobDescription?: string;
}
