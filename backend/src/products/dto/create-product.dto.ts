import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNumber,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'P0001' })
  @IsString()
  @MaxLength(20)
  product_code!: string;

  @ApiProperty({ example: 'Hydrococo 150ml' })
  @IsString()
  @MaxLength(150)
  product_name!: string;

  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(0)
  stock!: number;

  @ApiProperty({ example: 12000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  price!: number;
}