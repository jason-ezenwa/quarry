import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  type PrimaryResumeResponse,
  type UploadedFileRef,
} from '@quarry/contracts';
import type { SessionUser } from '../common/common.types';
import { CurrentUser } from '../common/current-user.decorator';
import { RequireProfileGuard } from '../profile/require-profile.guard';
import { UploadFileDto } from '../storage/dto/upload-file.dto';
import { UploadedFileRefDto } from '../storage/dto/uploaded-file-ref.dto';
import { StorageService } from '../storage/storage.service';
import { UploadFileInterceptor } from '../storage/upload-file.interceptor';
import {
  RESUME_PARSE_THROTTLE,
  RESUME_UPLOAD_THROTTLE,
} from '../throttle/throttle.constants';
import { ThrottlePerUser } from '../throttle/throttle-per-user.decorator';
import { SaveResumeDto } from './dto/save-resume.dto';
import { ResumeService } from './resume.service';

@Controller('resumes')
@UseGuards(RequireProfileGuard)
export class ResumeController {
  constructor(
    private readonly resumeService: ResumeService,
    private readonly storageService: StorageService,
  ) {}

  // A replacement file, uploaded before PUT primary/file commits it.
  @Post('uploads')
  @ThrottlePerUser(RESUME_UPLOAD_THROTTLE)
  @UseInterceptors(UploadFileInterceptor('primary-resume'))
  async upload(
    @CurrentUser() user: SessionUser,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UploadFileDto,
  ): Promise<UploadedFileRef> {
    if (!file) {
      throw new BadRequestException('file is required');
    }

    return this.storageService.uploadPending(user.id, dto.purpose, file);
  }

  @Get('primary')
  async getPrimary(
    @CurrentUser() user: SessionUser,
  ): Promise<PrimaryResumeResponse> {
    return this.resumeService.getPrimary(user.id);
  }

  @Put('primary')
  async savePrimary(
    @CurrentUser() user: SessionUser,
    @Body() dto: SaveResumeDto,
  ): Promise<PrimaryResumeResponse> {
    return this.resumeService.savePrimary(user.id, dto);
  }

  @Post('primary/parse')
  @ThrottlePerUser(RESUME_PARSE_THROTTLE)
  @HttpCode(HttpStatus.ACCEPTED)
  async retryParse(@CurrentUser() user: SessionUser): Promise<void> {
    await this.resumeService.retryParse(user.id);
  }

  @Put('primary/file')
  async replaceFile(
    @CurrentUser() user: SessionUser,
    @Body() dto: UploadedFileRefDto,
  ): Promise<PrimaryResumeResponse> {
    return this.resumeService.replaceFile(user.id, dto);
  }
}
