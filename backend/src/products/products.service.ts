import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

const SORT_FIELDS = {
  name: 'productName',
  price: 'price',
  stock: 'stock',
} as const;

type ProductSort = keyof typeof SORT_FIELDS;

function formatProduct(product: {
  id: bigint;
  productCode: string;
  productName: string;
  stock: number;
  price: Prisma.Decimal;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}) {
  return {
    id: product.id.toString(),
    product_code: product.productCode,
    product_name: product.productName,
    stock: product.stock,
    price: product.price.toString(),
    created_at: product.createdAt,
    updated_at: product.updatedAt,
    deleted_at: product.deletedAt,
  };
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto) {
    try {
      const product = await this.prisma.product.create({
        data: {
          productCode: dto.product_code,
          productName: dto.product_name,
          stock: dto.stock,
          price: new Prisma.Decimal(dto.price),
        },
      });

      return formatProduct(product);
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Kode produk sudah digunakan');
      }
      throw error;
    }
  }

  async findAll(params: {
    page: number;
    perPage: number;
    search?: string;
    sort?: ProductSort;
    order?: 'asc' | 'desc';
  }) {
    const { page, perPage, search, sort = 'name', order = 'asc' } = params;

    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { productName: { contains: search, mode: 'insensitive' } },
              { productCode: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { [SORT_FIELDS[sort]]: order },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: items.map(formatProduct),
      meta: {
        page,
        per_page: perPage,
        total,
        total_pages: Math.ceil(total / perPage),
      },
    };
  }

  async findOne(id: bigint) {
    const product = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
    });

    if (!product) {
      throw new NotFoundException('Produk tidak ditemukan');
    }

    return formatProduct(product);
  }

  async update(id: bigint, dto: UpdateProductDto) {
    await this.findOne(id);

    const data: Prisma.ProductUpdateInput = {
      ...(dto.product_code !== undefined && {
        productCode: dto.product_code,
      }),
      ...(dto.product_name !== undefined && {
        productName: dto.product_name,
      }),
      ...(dto.stock !== undefined && { stock: dto.stock }),
      ...(dto.price !== undefined && {
        price: new Prisma.Decimal(dto.price),
      }),
    };

    try {
      const product = await this.prisma.product.update({
        where: { id },
        data,
      });

      return formatProduct(product);
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Kode produk sudah digunakan');
      }
      throw error;
    }
  }

  async remove(id: bigint) {
    const product = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
    });

    if (!product) {
      throw new NotFoundException('Produk tidak ditemukan');
    }

    await this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
