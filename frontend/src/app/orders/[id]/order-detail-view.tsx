"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { formatRupiah } from "@/lib/format";
import type { Order } from "@/types/api";

export function OrderDetailView({ id }: { id: string }) {
  const orderQuery = useQuery({
    queryKey: ["orders", id],
    queryFn: () => apiRequest<Order>(`/orders/${id}`),
  });

  if (orderQuery.isPending) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">Memuat detail transaksi...</p>
      </section>
    );
  }

  if (orderQuery.isError) {
    return (
      <section
        className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800"
        role="alert"
      >
        Gagal memuat detail transaksi: {orderQuery.error.message}
        <button
          className="ml-3 font-semibold underline"
          onClick={() => void orderQuery.refetch()}
          type="button"
        >
          Coba lagi
        </button>
      </section>
    );
  }

  const order = orderQuery.data;

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">Nomor order</p>
            <h2 className="mt-1 text-xl font-semibold">{order.order_number}</h2>
          </div>
          <Link
            className="text-sm font-semibold text-blue-700 hover:underline"
            href="/orders"
          >
            Kembali ke transaksi
          </Link>
        </div>
        <dl className="mt-6 grid gap-5 sm:grid-cols-3">
          <div>
            <dt className="text-sm text-slate-500">Tanggal</dt>
            <dd className="mt-1 font-medium">
              {new Date(order.order_date).toLocaleString("id-ID")}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">Pelanggan</dt>
            <dd className="mt-1 font-medium">{order.customer.customer_name}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">Alamat</dt>
            <dd className="mt-1 font-medium">
              {order.customer.customer_address}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Item transaksi</h2>
        {order.items.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-600">
            Tidak ada item pada transaksi ini.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-3 pr-3">Produk</th>
                  <th className="py-3 pr-3">Harga saat transaksi</th>
                  <th className="py-3 pr-3">Jumlah</th>
                  <th className="py-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr
                    className="border-b border-slate-100 last:border-0"
                    key={item.id}
                  >
                    <td className="py-3 pr-3 font-medium">
                      {item.product_name}
                    </td>
                    <td className="py-3 pr-3">
                      {formatRupiah(item.unit_price)}
                    </td>
                    <td className="py-3 pr-3">{item.quantity}</td>
                    <td className="py-3 text-right">
                      {formatRupiah(item.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th className="pt-4 text-left text-base" colSpan={3}>
                    Total
                  </th>
                  <th className="pt-4 text-right text-base">
                    {formatRupiah(order.total_amount)}
                  </th>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
