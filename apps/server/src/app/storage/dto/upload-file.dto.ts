import { UPLOAD_PURPOSE_VALUES, type UploadPurpose } from '@quarry/contracts';
import { IsIn } from 'class-validator';

export class UploadFileDto {
  @IsIn(UPLOAD_PURPOSE_VALUES)
  purpose: UploadPurpose;
}
