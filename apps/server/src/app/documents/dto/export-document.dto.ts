import { EXPORT_FORMATS, type ExportFormat } from '@quarry/contracts';
import { IsIn } from 'class-validator';

export class ExportDocumentDto {
  @IsIn(EXPORT_FORMATS)
  format: ExportFormat;
}
