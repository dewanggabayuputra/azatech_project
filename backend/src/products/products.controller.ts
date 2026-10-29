import {
  Body,
  Controller,
  Delete,
  BadRequestException,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';
import {
  ApiBearerAuth,
  ApiTags,
  ApiCreatedResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

function parseProductId(id: string): bigint {
  if (!/^[1-9]\d*$/.test(id)) {
    throw new BadRequestException('ID produk tidak valid');
  }
  return BigInt(id);
}

@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Post()
  @ApiOperation({ summary: 'Membuat produk' })
  @ApiCreatedResponse({ description: 'Produk berhasil dibuat' })
  create(@Body() dto: CreateProductDto) {
    return this.products.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Mengambil semua produk' })
  @ApiCreatedResponse({ description: 'Daftar produk berhasil diambil' })
  findAll(@Query() query: ListProductsQueryDto) {
    return this.products.findAll({
      page: query.page ?? 1,
      perPage: query.per_page ?? 10,
      search: query.search,
      sort: query.sort,
      order: query.order,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Mengambil detail produk' })
  @ApiCreatedResponse({ description: 'Detail produk berhasil diambil' })
  findOne(@Param('id') id: string) {
    return this.products.findOne(parseProductId(id));
  }

  @Put(':id')
  @ApiOperation({ summary: 'Memperbarui produk' })
  @ApiCreatedResponse({ description: 'Produk berhasil diperbarui' })
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.products.update(parseProductId(id), dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Menghapus produk' })
  @ApiCreatedResponse({ description: 'Produk berhasil dihapus' })
  remove(@Param('id') id: string) {
    return this.products.remove(parseProductId(id));
  }
}
