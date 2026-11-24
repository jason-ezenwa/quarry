import type { ExportFormat } from '@quarry/contracts';

export const EXPORT_FALLBACK_FILE_NAME = 'document';

export const EXPORT_CONTENT_TYPES: Record<ExportFormat, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};
