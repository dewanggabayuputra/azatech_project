import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

function formatCustomer(customer: {
  id: string;
  customerName: string;
  customerAddress: string;
  gender: 'PRIA' | 'WANITA';
  birthDate: Date;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}) {
  return {
    id: customer.id,
    customer_name: customer.customerName,
    customer_address: customer.customerAddress,
    gender: customer.gender,
    birth_date: customer.birthDate.toISOString().slice(0, 10),
    phone: customer.phone,
    created_at: customer.createdAt,
    updated_at: customer.updatedAt,
    deleted_at: customer.deletedAt,
  };
}

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCustomerDto) {
    const customer = await this.prisma.customer.create({
      data: {
        customerName: dto.customer_name,
        customerAddress: dto.customer_address,
        gender: dto.gender,
        birthDate: new Date(dto.birth_date),
        phone: dto.phone,
      },
    });
    return formatCustomer(customer);
  }

  async findAll(params: { page: number; perPage: number; search?: string }) {
    const { page, perPage, search } = params;

    const where: Prisma.CustomerWhereInput = {
      deletedAt: null,
      ...(search
        ? {
            customerName: {
              contains: search,
              mode: 'insensitive',
            },
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { customerName: 'asc' },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      data: data.map(formatCustomer),
      meta: {
        page,
        per_page: perPage,
        total,
        total_pages: Math.ceil(total / perPage),
      },
    };
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, deletedAt: null },
    });

    if (!customer) {
      throw new NotFoundException('Pelanggan tidak ditemukan');
    }

    return formatCustomer(customer);
  }

  async update(id: string, dto: UpdateCustomerDto) {
    await this.findOne(id);

    const data: Prisma.CustomerUpdateInput = {
      ...(dto.customer_name !== undefined && {
        customerName: dto.customer_name,
      }),
      ...(dto.customer_address !== undefined && {
        customerAddress: dto.customer_address,
      }),
      ...(dto.gender !== undefined && { gender: dto.gender }),
      ...(dto.birth_date !== undefined && {
        birthDate: new Date(dto.birth_date),
      }),
      ...(dto.phone !== undefined && { phone: dto.phone }),
    };

    const customer = await this.prisma.customer.update({
      where: { id },
      data,
    });
    return formatCustomer(customer);
  }

  async remove(id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, deletedAt: null },
    });

    if (!customer) {
      throw new NotFoundException('Pelanggan tidak ditemukan');
    }

    await this.prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
