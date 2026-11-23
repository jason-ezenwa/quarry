import { Module } from '@nestjs/common';
import { r2BucketProvider } from './r2-bucket';
import { StorageService } from './storage.service';

@Module({
  providers: [r2BucketProvider, StorageService],
  exports: [StorageService],
})
export class StorageModule {}
