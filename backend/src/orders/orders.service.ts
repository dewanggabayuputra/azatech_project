import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';

const ORDER_INCLUDE = {
  customer: true,
  items: { include: { product: true } },
} satisfies Prisma.OrderInclude;

type OrderWithRelations = Prisma.OrderGetPayload<{
  include: typeof ORDER_INCLUDE;
}>;

function formatOrder(order: OrderWithRelations) {
  return {
    id: order.id.toString(),
    order_number: order.orderNumber,
    customer_id: order.customerId,
    created_by: order.createdBy,
    order_date: order.orderDate,
    total_amount: order.totalAmount.toString(),
    created_at: order.createdAt,
    updated_at: order.updatedAt,
    customer: {
      id: order.customer.id,
      customer_name: order.customer.customerName,
      customer_address: order.customer.customerAddress,
      gender: order.customer.gender,
      birth_date: order.customer.birthDate.toISOString().slice(0, 10),
      phone: order.customer.phone,
    },
    items: order.items.map((item) => ({
      id: item.id.toString(),
      product_id: item.productId.toString(),
      quantity: item.quantity,
      unit_price: item.unitPrice.toString(),
      subtotal: item.subtotal.toString(),
      product_name: item.product.productName,
      product_code: item.product.productCode,
    })),
  };
}

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: {
    page?: number;
    per_page?: number;
    from?: string;
    to?: string;
    customer_id?: string;
  }) {
    const page = query.page ?? 1;
    const perPage = query.per_page ?? 10;
    const from = query.from
      ? new Date(`${query.from}T00:00:00.000Z`)
      : undefined;
    const to = query.to ? new Date(`${query.to}T00:00:00.000Z`) : undefined;

    if (from && to && from > to) {
      throw new BadRequestException(
        'from harus lebih awal dari atau sama dengan to',
      );
    }

    const where: Prisma.OrderWhereInput = {
      ...(query.customer_id && { customerId: query.customer_id }),
      ...((from || to) && {
        orderDate: {
          ...(from && { gte: from }),
          ...(to && { lt: new Date(to.getTime() + 24 * 60 * 60 * 1000) }),
        },
      }),
    };

    const [orders, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { orderDate: 'desc' },
        include: ORDER_INCLUDE,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders.map(formatOrder),
      meta: {
        page,
        per_page: perPage,
        total,
        total_pages: Math.ceil(total / perPage),
      },
    };
  }

  async findOne(id: string) {
    if (!/^[1-9]\d*$/.test(id)) {
      throw new BadRequestException('ID order tidak valid');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: BigInt(id) },
      include: ORDER_INCLUDE,
    });

    if (!order) {
      throw new NotFoundException('Order tidak ditemukan');
    }

    return formatOrder(order);
  }

  async create(dto: CreateOrderDto, userId: string) {
    // Validasi ID sebelum masuk ke transaksi.
    const productIds = dto.items.map((item) => {
      if (!/^[1-9]\d*$/.test(item.product_id)) {
        throw new NotFoundException('ID produk tidak valid');
      }
      return BigInt(item.product_id);
    });

    const date = new Date();
    const datePart = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('');

    // Retry terbatas untuk benturan nomor order atau konflik serialisasi.
    for (let attempt = 0; attempt < 3; attempt++) {
      const orderNumber = `INV-${datePart}-${randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()}`;

      try {
        const order = await this.prisma.$transaction(
          async (tx) => {
            const customer = await tx.customer.findFirst({
              where: {
                id: dto.customer_id,
                deletedAt: null,
              },
            });

            if (!customer) {
              throw new NotFoundException('Customer tidak ditemukan');
            }

            const products = await tx.product.findMany({
              where: {
                id: { in: productIds },
                deletedAt: null,
              },
            });

            if (products.length !== dto.items.length) {
              throw new NotFoundException(
                'Satu atau lebih produk tidak ditemukan',
              );
            }

            const productMap = new Map(
              products.map((product) => [product.id.toString(), product]),
            );

            const orderItems: {
              productId: bigint;
              quantity: number;
              unitPrice: Prisma.Decimal;
              subtotal: Prisma.Decimal;
            }[] = [];

            let total = new Prisma.Decimal(0);

            for (const item of dto.items) {
              const product = productMap.get(item.product_id);

              if (!product) {
                throw new NotFoundException('Produk tidak ditemukan');
              }

              if (product.stock < item.quantity) {
                throw new ConflictException({
                  message: 'Stok tidak mencukupi',
                  errors: {
                    [`items.${dto.items.indexOf(item)}.quantity`]: [
                      `Stok ${product.productName} tersisa ${product.stock}, diminta ${item.quantity}`,
                    ],
                  },
                });
              }

              const subtotal = product.price.mul(item.quantity);
              total = total.add(subtotal);

              orderItems.push({
                productId: product.id,
                quantity: item.quantity,
                unitPrice: product.price,
                subtotal,
              });
            }

            // Nomor order, header, item, dan stok berada dalam satu transaksi.
            const createdOrder = await tx.order.create({
              data: {
                orderNumber,
                customerId: customer.id,
                createdBy: userId,
                totalAmount: total,
                items: {
                  create: orderItems.map((item) => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    subtotal: item.subtotal,
                  })),
                },
              },
              include: {
                items: { include: { product: true } },
                customer: true,
              },
            });

            // Update stok secara kondisional untuk mencegah overselling.
            for (const item of orderItems) {
              const result = await tx.product.updateMany({
                where: {
                  id: item.productId,
                  deletedAt: null,
                  stock: { gte: item.quantity },
                },
                data: {
                  stock: { decrement: item.quantity },
                },
              });

              if (result.count !== 1) {
                throw new ConflictException(
                  'Stok berubah atau tidak mencukupi. Silakan coba lagi.',
                );
              }
            }

            return createdOrder;
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );

        return formatOrder(order);
      } catch (error: unknown) {
        // P2034 = konflik transaksi yang dapat dicoba ulang.
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2034' &&
          attempt < 2
        ) {
          continue;
        }
        throw error;
      }
    }

    throw new ConflictException('Transaksi bentrok. Silakan coba kembali.');
  }
}
