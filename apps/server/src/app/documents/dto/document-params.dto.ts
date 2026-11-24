import { DOCUMENT_KINDS, type DocumentKind } from '@quarry/contracts';
import { IsIn, IsString } from 'class-validator';

// The ids stay strings: one that can't be an id is a 404, not a 400.
export class DocumentParamsDto {
  @IsString()
  sessionId: string;

  @IsIn(DOCUMENT_KINDS)
  kind: DocumentKind;

  @IsString()
  documentId: string;
}
