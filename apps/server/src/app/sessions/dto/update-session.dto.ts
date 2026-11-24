import { IsBoolean } from 'class-validator';

export class UpdateSessionDto {
  @IsBoolean()
  archived: boolean;
}
