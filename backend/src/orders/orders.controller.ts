import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiCreatedResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtUser } from '../auth/jwt.strategy';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Membuat transaksi penjualan' })
  @ApiCreatedResponse({ description: 'Order berhasil dibuat' })
  create(@Body() dto: CreateOrderDto, @Req() req: { user: JwtUser }) {
    return this.orders.create(dto, req.user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Mengambil semua transaksi penjualan' })
  @ApiCreatedResponse({ description: 'Daftar order berhasil diambil' })
  findAll(@Query() query: ListOrdersQueryDto) {
    return this.orders.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Mengambil detail transaksi penjualan' })
  @ApiCreatedResponse({ description: 'Detail order berhasil diambil' })
  findOne(@Param('id') id: string) {
    return this.orders.findOne(id);
  }
}
