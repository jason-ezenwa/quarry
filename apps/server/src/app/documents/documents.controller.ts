import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { isExportableKind, type DocumentResponse } from '@quarry/contracts';
import type { SessionUser } from '../common/common.types';
import { CurrentUser } from '../common/current-user.decorator';
import { RequireProfileGuard } from '../profile/require-profile.guard';
import { DocumentsService } from './documents.service';
import { DocumentParamsDto } from './dto/document-params.dto';
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
    @Param() { sessionId, kind, documentId }: DocumentParamsDto,
  ): Promise<DocumentResponse> {
    return this.documentsService.getDocument(
      { userId: user.id, sessionId },
      kind,
      documentId,
    );
  }

  // Rendered from the saved document on every download.
  @Get(':kind/:documentId/export')
  async export(
    @CurrentUser() user: SessionUser,
    @Param() { sessionId, kind, documentId }: DocumentParamsDto,
    @Query() { format }: ExportDocumentDto,
  ): Promise<StreamableFile> {
    if (!isExportableKind(kind)) {
      throw new BadRequestException('Fit reports cannot be exported');
    }

    const document = await this.documentsService.getExportable(
      { userId: user.id, sessionId },
      kind,
      documentId,
    );

    const { content, contentType, fileName } = await this.exportService.render(
      document,
      format,
    );

    // The name is limited to a-z, 0-9 and hyphens, so it needs no escaping.
    return new StreamableFile(content, {
      type: contentType,
      disposition: `attachment; filename="${fileName}"`,
      length: content.length,
    });
  }
}
