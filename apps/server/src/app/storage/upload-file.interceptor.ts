import { FileInterceptor } from '@nestjs/platform-express';
import { UPLOAD_PURPOSES, type UploadPurpose } from '@quarry/contracts';

// Multer for one upload purpose's single `file` field, capped at its size limit.
export const UploadFileInterceptor = (purpose: UploadPurpose) =>
  FileInterceptor('file', {
    // Browsers send UTF-8 file names; multer otherwise reads them as latin1.
    defParamCharset: 'utf8',
    limits: { fileSize: UPLOAD_PURPOSES[purpose].maxBytes, files: 1 },
  });
