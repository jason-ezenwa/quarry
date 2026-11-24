import { trim } from '../../common/transforms';
import { Transform, Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { SESSION_LIMITS } from '@quarry/contracts';

export class TurnMessageDto {
  // The id the web app gave the message, kept so its copy matches ours.
  @IsString()
  @IsNotEmpty()
  @MaxLength(SESSION_LIMITS.messageIdMaxLength)
  id: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(SESSION_LIMITS.turnMessageMaxLength)
  text: string;
}

export class RunTurnDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => TurnMessageDto)
  message?: TurnMessageDto;
}
