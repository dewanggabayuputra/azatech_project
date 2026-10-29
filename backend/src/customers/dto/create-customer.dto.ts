import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty({ example: 'Budi Santoso', maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  customer_name!: string;

  @ApiProperty({ example: 'Jl. Merdeka No. 10', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  customer_address!: string;

  @ApiProperty({ enum: Gender, example: Gender.PRIA })
  @IsEnum(Gender, { message: 'gender harus berupa PRIA atau WANITA' })
  gender!: Gender;

  @ApiProperty({ example: '1990-05-21', format: 'date', description: 'Format: YYYY-MM-DD' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'birth_date harus berformat YYYY-MM-DD' })
  birth_date!: string;

  @ApiPropertyOptional({ example: '+628123456789', maxLength: 20 })
  @IsOptional()
  @IsString()
  @IsPhoneNumber('ID', { message: 'Nomor telepon tidak valid untuk wilayah Indonesia' }) // Opsional: atau pakai @Matches(/^[0-9+\-\s]+$/)
  @MaxLength(20)
  phone?: string;
}