import {
  UPLOAD_MIME_TYPES,
  type UploadedFileRef,
  type UploadMimeType,
} from '@quarry/contracts';
import { IsIn, Matches } from 'class-validator';
import { UPLOAD_KEY_PATTERN } from '../storage.utils';

export class UploadedFileRefDto implements UploadedFileRef {
  @Matches(UPLOAD_KEY_PATTERN, { message: 'key is not a valid upload key' })
  key: string;

  @IsIn(UPLOAD_MIME_TYPES)
  mimeType: UploadMimeType;
}
