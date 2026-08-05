import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UploadInvoiceDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'PDF invoice file to upload.',
  })
  file: any;

  @ApiPropertyOptional({
    example: 'Urgent client invoice',
    description: 'Optional internal note saved with the invoice.',
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({
    example: 'Gordon',
    description: 'Optional display name of the person uploading the invoice.',
  })
  @IsOptional()
  @IsString()
  uploadedBy?: string;
}

export class AttachInvoiceFilesDto {
  @ApiProperty({
    type: 'array',
    items: {
      type: 'string',
      format: 'binary',
    },
    description: 'One or more supporting files to attach to the invoice.',
  })
  files: any[];
}
