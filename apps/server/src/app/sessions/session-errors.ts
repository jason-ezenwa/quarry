import { HttpException, HttpStatus } from '@nestjs/common';
import type { SessionErrorCode } from '@quarry/contracts';
import { INTERVIEW_ENDED_MESSAGE } from './interviews/interviews.constants';

export function sessionError(
  status: HttpStatus,
  code: SessionErrorCode,
  message: string,
): HttpException {
  return new HttpException({ statusCode: status, code, message }, status);
}

export function turnRunningError(): HttpException {
  return sessionError(
    HttpStatus.CONFLICT,
    'turn-running',
    'A reply is still being written',
  );
}

export function interviewEndedError(): HttpException {
  return sessionError(
    HttpStatus.CONFLICT,
    'interview-ended',
    INTERVIEW_ENDED_MESSAGE,
  );
}

export function notAnApplicationError(): HttpException {
  return sessionError(
    HttpStatus.CONFLICT,
    'not-an-application',
    'This is not an application',
  );
}
