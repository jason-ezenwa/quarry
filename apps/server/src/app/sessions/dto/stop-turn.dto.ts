import { SESSION_LIMITS } from '@quarry/contracts';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class StopTurnDto {
  // The user message the turn answers, so a late stop never hits a later turn.
  @IsString()
  @IsNotEmpty()
  @MaxLength(SESSION_LIMITS.messageIdMaxLength)
  messageId: string;
}
