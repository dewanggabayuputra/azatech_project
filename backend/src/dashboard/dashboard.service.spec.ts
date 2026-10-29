import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;
  const prisma = {
    order: { count: jest.fn(), aggregate: jest.fn() },
    orderItem: { groupBy: jest.fn() },
    product: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns summary metrics for all orders', async () => {
    prisma.order.count.mockResolvedValue(30);
    prisma.order.aggregate.mockResolvedValue({
      _sum: { totalAmount: new Prisma.Decimal('1250000.00') },
    });
    prisma.orderItem.groupBy.mockResolvedValue([
      { productId: 2n, _sum: { quantity: 8 } },
    ]);
    prisma.product.findMany
      .mockResolvedValueOnce([
        {
          id: 3n,
          productCode: 'P0003',
          productName: 'Low stock',
          stock: 2,
        },
      ])
      .mockResolvedValueOnce([{ id: 2n, productName: 'Best seller' }]);

    await expect(service.getSummary()).resolves.toEqual({
      success: true,
      message: 'OK',
      data: {
        total_transactions: 30,
        total_sales: '1250000.00',
        best_selling_products: [
          {
            product_id: '2',
            product_name: 'Best seller',
            quantity_sold: 8,
          },
        ],
        low_stock_products: [
          {
            id: '3',
            product_code: 'P0003',
            product_name: 'Low stock',
            stock: 2,
          },
        ],
      },
    });
    expect(prisma.order.count).toHaveBeenCalledWith();
    expect(prisma.order.aggregate).toHaveBeenCalledWith({
      _sum: { totalAmount: true },
    });
    expect(prisma.orderItem.groupBy).toHaveBeenCalledWith({
      by: ['productId'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    });
    expect(prisma.product.findMany).toHaveBeenNthCalledWith(1, {
      where: { deletedAt: null, stock: { lt: 5 } },
      orderBy: { stock: 'asc' },
      take: 100,
    });
  });
});
