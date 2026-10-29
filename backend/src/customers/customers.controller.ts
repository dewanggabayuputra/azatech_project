import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { ListCustomersQueryDto } from './dto/list-customers-query.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomersService } from './customers.service';
import {
  ApiBearerAuth,
  ApiTags,
  ApiCreatedResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Post()
  @ApiOperation({ summary: 'Membuat pelanggan' })
  @ApiCreatedResponse({ description: 'Pelanggan berhasil dibuat' })
  create(@Body() dto: CreateCustomerDto) {
    return this.customers.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Mengambil semua pelanggan' })
  @ApiCreatedResponse({ description: 'Daftar pelanggan berhasil diambil' })
  findAll(@Query() query: ListCustomersQueryDto) {
    return this.customers.findAll({
      page: query.page ?? 1,
      perPage: query.per_page ?? 10,
      search: query.search,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Mengambil detail pelanggan' })
  @ApiCreatedResponse({ description: 'Detail pelanggan berhasil diambil' })
  findOne(@Param('id') id: string) {
    return this.customers.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Memperbarui pelanggan' })
  @ApiCreatedResponse({ description: 'Pelanggan berhasil diperbarui' })
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customers.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Menghapus pelanggan' })
  @ApiCreatedResponse({ description: 'Pelanggan berhasil dihapus' })
  remove(@Param('id') id: string) {
    return this.customers.remove(id);
  }
}
