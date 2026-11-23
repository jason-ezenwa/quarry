import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  UPLOAD_PURPOSES,
  type ProfileResponse,
  type UploadedFileRef,
} from '@quarry/contracts';
import type { SessionUser } from '../common/common.types';
import { CurrentUser } from '../common/current-user.decorator';
import { UploadFileDto } from '../storage/dto/upload-file.dto';
import { StorageService } from '../storage/storage.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { ProfileService } from './profile.service';
import { toProfileResponse } from './profile.utils';

@Controller('profiles')
export class ProfileController {
  constructor(
    private readonly profileService: ProfileService,
    private readonly storageService: StorageService,
  ) {}

  // The resume is uploaded before the profile exists.
  @Post('uploads')
  @UseInterceptors(
    FileInterceptor('file', {
      // Browsers send UTF-8 file names; multer otherwise reads them as latin1.
      defParamCharset: 'utf8',
      limits: {
        fileSize: UPLOAD_PURPOSES['primary-resume'].maxBytes,
        files: 1,
      },
    }),
  )
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

  @Post()
  async create(
    @CurrentUser() user: SessionUser,
    @Body() dto: CreateProfileDto,
  ): Promise<ProfileResponse> {
    return toProfileResponse(await this.profileService.create(user.id, dto));
  }

  @Get('me')
  async getMe(@CurrentUser() user: SessionUser): Promise<ProfileResponse> {
    const profile = await this.profileService.findByUserId(user.id);

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return toProfileResponse(profile);
  }
}
