import { PrismaClient, Gender } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const password = await bcrypt.hash('Admin123!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@azatech.id' },
    update: {},
    create: {
      name: 'Admin AZA',
      email: 'admin@azatech.id',
      password,
    },
  });

  const products = [];

  for (let i = 1; i <= 20; i++) {
    const product = await prisma.product.upsert({
      where: { productCode: `P${String(i).padStart(4, '0')}` },
      update: {},
      create: {
        productCode: `P${String(i).padStart(4, '0')}`,
        productName: `Produk ${i}`,
        stock: i % 6,
        price: 10000 + i * 1500,
      },
    });

    products.push(product);
  }

  const customers = [];

  for (let i = 1; i <= 15; i++) {
    const customer = await prisma.customer.upsert({
      where: {
        id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
      },
      update: {},
      create: {
        id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
        customerName: `Customer ${i}`,
        customerAddress: `Alamat ${i}, Jakarta`,
        gender: i % 2 === 0 ? Gender.WANITA : Gender.PRIA,
        birthDate: new Date(Date.UTC(1990, 0, i)),
        phone: `081234567${String(i).padStart(3, '0')}`,
      },
    });

    customers.push(customer);
  }

  // Contoh histori order selama 30 hari terakhir.
  // Implementasikan create order dan item secara atomik.
  // Jangan membuat order langsung jika stok tidak mencukupi.
  for (let i = 0; i < 30; i++) {
    const orderDate = new Date();
    orderDate.setDate(orderDate.getDate() - (i % 30));

    // Pilih customer dan produk yang stoknya cukup.
    // Buat Order + OrderItem dalam prisma.$transaction.
    // Isi unitPrice/subtotal dari harga produk saat order dibuat.
    // Gunakan nomor INV-YYYYMMDD-... yang unik.
  }

  console.log({
    admin: admin.email,
    products: products.length,
    customers: customers.length,
  });
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });