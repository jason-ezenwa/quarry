import { Injectable, Logger } from '@nestjs/common';
import type { ExportFormat } from '@quarry/contracts';
import type { ExportableDocument } from '../documents.types';
import { renderDocx } from './docx-template';
import { EXPORT_CONTENT_TYPES } from './export.constants';
import type { ExportedFile } from './export.types';
import { exportFileName } from './export.utils';
import { renderPdf } from './pdf-template';

const RENDERERS: Record<
  ExportFormat,
  (document: ExportableDocument) => Promise<Buffer>
> = { pdf: renderPdf, docx: renderDocx };

// Rendered on every download from the saved document; nothing is stored.
@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  async render(
    document: ExportableDocument,
    format: ExportFormat,
  ): Promise<ExportedFile> {
    const startedAt = Date.now();
    const content = await RENDERERS[format](document);

    this.logger.log('Document exported', {
      documentId: document.id,
      kind: document.kind,
      format,
      durationMs: Date.now() - startedAt,
    });

    return {
      content,
      contentType: EXPORT_CONTENT_TYPES[format],
      fileName: exportFileName(document, format),
    };
  }
}
