import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { successResponse } from '../common/response';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    // Summary metrics cover all orders; no date range is applied.
    const [totalTransactions, sales, bestSelling, lowStock] = await Promise.all(
      [
        this.prisma.order.count(),
        this.prisma.order.aggregate({
          _sum: { totalAmount: true },
        }),
        this.prisma.orderItem.groupBy({
          by: ['productId'],
          _sum: { quantity: true },
          orderBy: { _sum: { quantity: 'desc' } },
          take: 5,
        }),
        this.prisma.product.findMany({
          where: { deletedAt: null, stock: { lt: 5 } },
          orderBy: { stock: 'asc' },
          take: 100,
        }),
      ],
    );

    const productIds = bestSelling.map((item) => item.productId);
    const products = productIds.length
      ? await this.prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, productName: true },
        })
      : [];
    const productNames = new Map(
      products.map((product) => [product.id, product.productName]),
    );

    return successResponse({
      total_transactions: totalTransactions,
      total_sales: (sales._sum.totalAmount ?? new Prisma.Decimal(0)).toFixed(2),
      best_selling_products: bestSelling.map((item) => ({
        product_id: item.productId.toString(),
        product_name: productNames.get(item.productId) ?? null,
        quantity_sold: item._sum.quantity ?? 0,
      })),
      low_stock_products: lowStock.map((product) => ({
        id: product.id.toString(),
        product_code: product.productCode,
        product_name: product.productName,
        stock: product.stock,
      })),
    });
  }
}
