import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import {
  DOCUMENT_KINDS,
  type DocumentKind,
  type DocumentResponse,
} from '@quarry/contracts';
import type { SessionUser } from '../common/common.types';
import { CurrentUser } from '../common/current-user.decorator';
import { RequireProfileGuard } from '../profile/require-profile.guard';
import { EXPORT_CONTENT_TYPES } from './documents.constants';
import { DocumentsService } from './documents.service';
import { ExportDocumentDto } from './dto/export-document.dto';
import { ExportService } from './export/export.service';

// Documents are scoped by user and session in every query, so another
// user's session or document is a 404.
@Controller('sessions/:sessionId/documents')
@UseGuards(RequireProfileGuard)
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly exportService: ExportService,
  ) {}

  @Get(':kind/:documentId')
  async getOne(
    @CurrentUser() user: SessionUser,
    @Param('sessionId') sessionId: string,
    @Param('kind') kind: string,
    @Param('documentId') documentId: string,
  ): Promise<DocumentResponse> {
    return this.documentsService.getDocument(
      { userId: user.id, sessionId },
      this.toKind(kind),
      documentId,
    );
  }

  // Rendered from the saved document on every download.
  @Get(':kind/:documentId/export')
  async export(
    @CurrentUser() user: SessionUser,
    @Param('sessionId') sessionId: string,
    @Param('kind') kind: string,
    @Param('documentId') documentId: string,
    @Query() { format }: ExportDocumentDto,
  ): Promise<StreamableFile> {
    const documentKind = this.toKind(kind);

    if (documentKind === 'fit-score') {
      throw new BadRequestException('Fit reports cannot be exported');
    }

    const document = await this.documentsService.getExportable(
      { userId: user.id, sessionId },
      documentKind,
      documentId,
    );

    const { content, fileName } = await this.exportService.render(
      document,
      format,
    );

    // The name is limited to a-z, 0-9 and hyphens, so it needs no escaping.
    return new StreamableFile(content, {
      type: EXPORT_CONTENT_TYPES[format],
      disposition: `attachment; filename="${fileName}"`,
      length: content.length,
    });
  }

  private toKind(kind: string): DocumentKind {
    if (!(DOCUMENT_KINDS as readonly string[]).includes(kind)) {
      throw new BadRequestException(
        `kind must be one of ${DOCUMENT_KINDS.join(', ')}`,
      );
    }

    return kind as DocumentKind;
  }
}
