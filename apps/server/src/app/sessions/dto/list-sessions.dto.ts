import {
  SESSION_KINDS,
  SESSION_LIMITS,
  type SessionKind,
} from '@quarry/contracts';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsMongoId,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class ListSessionsDto {
  // Applications when left out.
  @IsOptional()
  @IsIn(SESSION_KINDS)
  kind?: SessionKind;

  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  archived?: boolean;

  @IsOptional()
  @IsMongoId()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(SESSION_LIMITS.sessionsPageMaxSize)
  limit?: number;
}
