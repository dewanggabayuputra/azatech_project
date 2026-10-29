# Azatech Online Shop

Aplikasi administrasi toko online untuk mengelola produk, pelanggan, dan transaksi penjualan. Project ini terdiri dari frontend Next.js, REST API NestJS, PostgreSQL, dan Prisma ORM.

## Fitur

- Login admin dengan access token dan refresh token.
- Dashboard berisi total transaksi, total penjualan, produk terlaris, dan stok menipis.
- CRUD produk dengan pencarian, pagination, pengurutan, dan soft delete.
- CRUD pelanggan dengan pencarian, pagination, dan soft delete.
- Pembuatan order dengan beberapa produk, pengecekan stok, dan snapshot harga.
- Riwayat order dengan filter tanggal/pelanggan dan halaman detail transaksi.
- Endpoint API dilindungi JWT; respons API menggunakan field `snake_case`.

## Teknologi

- Frontend: Next.js 16, React 19, TypeScript, TanStack Query.
- Backend: NestJS 11, TypeScript, Passport JWT, class-validator.
- Database: PostgreSQL 17.
- ORM/migrasi: Prisma 6.
- Container: Docker Compose.

## Menjalankan project dengan Docker

Persyaratan: Docker Desktop dengan Docker Compose, serta port `3000`, `3001`, dan `5433` tersedia.

1. Buat file konfigurasi lokal dari template:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Jalankan seluruh service:

   ```powershell
   docker compose up --build -d
   ```

   Compose menunggu PostgreSQL sehat, menerapkan migrasi yang belum berjalan, kemudian menyalakan backend dan frontend.

3. Isi database contoh:

   ```powershell
   docker compose --profile seed run --rm seed
   ```

   Seed menggunakan upsert dan aman dijalankan kembali untuk data demo yang sama. Seed tidak berjalan otomatis saat aplikasi dimulai.

4. Buka aplikasi:

   | Service | URL |
   | --- | --- |
   | Frontend | <http://localhost:3000> |
   | REST API | <http://localhost:3001/api> |
   | Swagger | <http://localhost:3001/api/docs> |
   | PostgreSQL dari host | `localhost:5433` |

   Akun admin demo setelah seed:

   ```text
   Email:    admin@azatech.id
   Password: Admin123!
   ```

   Kredensial ini hanya untuk development lokal. Ganti sebelum digunakan di lingkungan lain.

### Perintah Docker yang berguna

```powershell
# Status container
docker compose ps

# Log semua service atau satu service
docker compose logs -f
docker compose logs -f backend

# Terapkan migrasi terbaru (juga dijalankan otomatis saat stack dimulai)
docker compose run --rm migrate

# Jalankan ulang seed demo
docker compose --profile seed run --rm seed

# Hentikan container, pertahankan data database
docker compose down
```

Data PostgreSQL disimpan pada named volume `postgres_data` dan tetap ada setelah `docker compose down`. **Jangan gunakan `docker compose down -v` kecuali memang ingin menghapus volume dan seluruh data database.**

Jika port default bentrok, ubah `POSTGRES_PORT`, `BACKEND_PORT`, atau `FRONTEND_PORT` pada `.env`. `NEXT_PUBLIC_API_URL` dimasukkan saat image frontend dibangun; setelah mengubah nilainya, build ulang frontend:

```powershell
docker compose build frontend
docker compose up -d frontend
```

## Migrasi database

Migrasi Prisma disimpan di `backend/prisma/migrations`. Saat container backend dijalankan melalui Compose, service `migrate` menjalankan `prisma migrate deploy` sebelum backend start. Perintah ini hanya menerapkan migrasi yang belum tercatat dan tidak membuat migrasi baru.

Untuk membuat migrasi baru saat mengembangkan schema:

1. Pastikan PostgreSQL Docker aktif dan `backend/.env` mengarah ke port host (default `5433`).
2. Dari folder `backend`, jalankan:

   ```powershell
   npx prisma migrate dev --name nama_perubahan
   ```

3. Commit folder migrasi yang baru bersama perubahan schema.
4. Compose akan menerapkannya pada database target ketika stack dijalankan:

   ```powershell
   docker compose up --build -d
   ```

Untuk memeriksa status migrasi database Docker:

```powershell
docker compose run --rm migrate npx prisma migrate status
```

### Menggunakan database Docker lama yang dibuat dengan `prisma db push`

Database yang sudah berisi tabel dari `prisma db push` belum memiliki riwayat migrasi Prisma. Jika tabelnya sudah sesuai dengan migrasi awal `20261029160000_init`, baseline migrasi itu **satu kali saja**:

```powershell
docker compose up -d postgres
docker compose run --rm migrate npx prisma migrate resolve --applied 20261029160000_init
docker compose up --build -d
```

`migrate resolve --applied` hanya mencatat riwayat migrasi; perintah ini tidak membuat tabel dan tidak boleh digunakan pada database kosong. Database baru tidak memerlukan baseline—migrasi akan membuat skema secara otomatis. Pastikan URL migrasi mengarah ke database yang benar sebelum menjalankan perintah.

## Konfigurasi environment

Root `.env.example` adalah template konfigurasi Docker. Salin menjadi `.env` dan sesuaikan bila diperlukan:

| Variabel | Kegunaan | Default lokal |
| --- | --- | --- |
| `POSTGRES_DB` | Nama database | `azatech_shop` |
| `POSTGRES_USER` | User PostgreSQL | `shop_user` |
| `POSTGRES_PASSWORD` | Password PostgreSQL | `123456` |
| `POSTGRES_PORT` | Port PostgreSQL pada host | `5433` |
| `BACKEND_PORT` | Port API pada host | `3001` |
| `FRONTEND_PORT` | Port web pada host | `3000` |
| `NEXT_PUBLIC_API_URL` | URL API yang dipakai browser | `http://localhost:3001/api` |
| `JWT_ACCESS_SECRET` | Secret access token | Ganti sebelum deployment |
| `JWT_REFRESH_SECRET` | Secret refresh token | Ganti sebelum deployment |

Di dalam jaringan Compose, backend dan migrator terhubung ke database menggunakan hostname `postgres` dan port internal `5432`. Jangan gunakan `localhost` pada `DATABASE_URL` container. File `backend/.env` untuk menjalankan perintah Prisma dari host bersifat lokal dan tidak dimasukkan ke image.

## Endpoint API

Semua endpoint memiliki prefix `/api`. Kecuali endpoint auth publik (`login`, `refresh`, dan `logout`), endpoint membutuhkan header `Authorization: Bearer <access_token>`.

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Login admin |
| `POST` | `/api/auth/refresh` | Rotasi refresh token |
| `POST` | `/api/auth/logout` | Cabut refresh session |
| `GET` | `/api/auth/me` | Profil pengguna aktif |
| `GET` | `/api/dashboard/summary` | Ringkasan dashboard |
| `GET`, `POST` | `/api/products` | Daftar dan tambah produk |
| `GET`, `PUT`, `DELETE` | `/api/products/:id` | Detail, update, dan soft delete produk |
| `GET`, `POST` | `/api/customers` | Daftar dan tambah pelanggan |
| `GET`, `PUT`, `DELETE` | `/api/customers/:id` | Detail, update, dan soft delete pelanggan |
| `GET`, `POST` | `/api/orders` | Daftar dan buat order |
| `GET` | `/api/orders/:id` | Detail order beserta item |

Parameter list yang tersedia antara lain `page`, `per_page`, dan `search`. Produk juga mendukung `sort` dan `order`; order mendukung filter `from`, `to`, dan `customer_id`. Lihat Swagger untuk skema request dan response lengkap.

## Struktur repository

```text
backend/
  prisma/                Schema, migrasi, dan seed database
  src/auth/              Login, refresh token, JWT guard/strategy
  src/customers/         CRUD pelanggan
  src/dashboard/         Ringkasan dashboard
  src/orders/            Transaksi dan riwayat order
  src/products/          CRUD produk
frontend/
  src/app/               Halaman login, dashboard, produk, pelanggan, order
  src/components/        Komponen tampilan
  src/lib/               API client, auth, dan helper format
  src/types/             Tipe request/response API
docker-compose.yml       Definisi service dan urutan startup
```

## Pengembangan lokal tanpa container aplikasi

PostgreSQL tetap dapat dijalankan di Docker, sementara backend dan frontend dijalankan dari terminal terpisah:

```powershell
# Dari root repository
docker compose up -d postgres
```

Pastikan `backend/.env` memakai URL host seperti `postgresql://shop_user:123456@localhost:5433/azatech_shop?schema=public`, lalu:

```powershell
# Terminal backend
Set-Location backend
npm ci
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

```powershell
# Terminal frontend
Set-Location frontend
npm ci
npm run dev
```

## Pengujian dan build

```powershell
# Backend
Set-Location backend
npm test -- --runInBand
npm run build

# Frontend
Set-Location ..\frontend
npm run lint
npm run build
```
