import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  DOCUMENT_KINDS,
  type DocumentKind,
  type FitScoreDocumentResponse,
} from '@quarry/contracts';
import type { SessionUser } from '../common/common.types';
import { CurrentUser } from '../common/current-user.decorator';
import { RequireProfileGuard } from '../profile/require-profile.guard';
import { DocumentsService } from './documents.service';

// Documents are scoped by user and session in every query, so another
// user's session or document is a 404.
@Controller('sessions/:sessionId/documents')
@UseGuards(RequireProfileGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get(':kind/:documentId')
  async getOne(
    @CurrentUser() user: SessionUser,
    @Param('sessionId') sessionId: string,
    @Param('kind') kind: string,
    @Param('documentId') documentId: string,
  ): Promise<FitScoreDocumentResponse> {
    const owner = { userId: user.id, sessionId };

    switch (this.toKind(kind)) {
      case 'fit-score':
        return this.documentsService.getFitScore(owner, documentId);
      // Tailored resumes and cover letters arrive with their tools.
      case 'resume':
      case 'cover-letter':
        throw new NotFoundException('Document not found');
    }
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
