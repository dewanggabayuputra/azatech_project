"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { AdminShell } from "@/components/admin-shell";
import { apiRequest } from "@/lib/api";
import { formatRupiah } from "@/lib/format";
import type { Customer, Order, PaginationMeta } from "@/types/api";

interface OrdersResponse {
  data: Order[];
  meta: PaginationMeta;
}

interface CustomersResponse {
  data: Customer[];
}

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [fromInput, setFromInput] = useState("");
  const [toInput, setToInput] = useState("");
  const [customerInput, setCustomerInput] = useState("");
  const [filters, setFilters] = useState({
    from: "",
    to: "",
    customer_id: "",
  });
  const customersQuery = useQuery({
    queryKey: ["customers", "order-filters"],
    queryFn: () =>
      apiRequest<CustomersResponse>("/customers?page=1&per_page=100"),
  });

  const ordersQuery = useQuery({
    queryKey: ["orders", page, filters],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        per_page: "10",
      });
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);
      if (filters.customer_id) params.set("customer_id", filters.customer_id);
      return apiRequest<OrdersResponse>(`/orders?${params}`);
    },
  });

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setFilters({
      from: fromInput,
      to: toInput,
      customer_id: customerInput,
    });
  }

  const result = ordersQuery.data;

  return (
    <AdminShell title="Riwayat transaksi">
      <div className="space-y-5">
        <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-end lg:justify-between">
          <form
            className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
            onSubmit={applyFilters}
          >
            <label className="text-sm font-medium text-slate-700">
              Dari tanggal
              <input
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2"
                onChange={(event) => setFromInput(event.target.value)}
                type="date"
                value={fromInput}
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Sampai tanggal
              <input
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2"
                onChange={(event) => setToInput(event.target.value)}
                type="date"
                value={toInput}
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Pelanggan
              <select
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                onChange={(event) => setCustomerInput(event.target.value)}
                value={customerInput}
              >
                <option value="">Semua pelanggan</option>
                {customersQuery.data?.data.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.customer_name}
                  </option>
                ))}
              </select>
            </label>
            <button className="self-end rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">
              Terapkan filter
            </button>
          </form>
          <Link
            className="rounded-lg bg-blue-700 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-blue-800"
            href="/orders/new"
          >
            Buat transaksi
          </Link>
        </section>

        {customersQuery.isError && (
          <p className="text-sm text-red-700" role="alert">
            Gagal memuat pilihan pelanggan: {customersQuery.error.message}
          </p>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          {ordersQuery.isPending && (
            <p className="py-12 text-center text-sm text-slate-600">
              Memuat riwayat transaksi...
            </p>
          )}
          {ordersQuery.isError && (
            <div
              className="rounded-lg bg-red-50 p-4 text-sm text-red-800"
              role="alert"
            >
              Gagal memuat transaksi: {ordersQuery.error.message}
              <button
                className="ml-3 font-semibold underline"
                onClick={() => void ordersQuery.refetch()}
                type="button"
              >
                Coba lagi
              </button>
            </div>
          )}
          {result && result.data.length === 0 && (
            <p className="py-12 text-center text-sm text-slate-600">
              Tidak ada transaksi untuk filter tersebut.
            </p>
          )}
          {result && result.data.length > 0 && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-3">Nomor order</th>
                      <th className="px-3 py-3">Tanggal</th>
                      <th className="px-3 py-3">Pelanggan</th>
                      <th className="px-3 py-3">Item</th>
                      <th className="px-3 py-3 text-right">Total</th>
                      <th className="px-3 py-3 text-right">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.data.map((order) => (
                      <tr
                        className="border-b border-slate-100 last:border-0"
                        key={order.id}
                      >
                        <td className="px-3 py-3 font-medium">
                          {order.order_number}
                        </td>
                        <td className="px-3 py-3">
                          {new Date(order.order_date).toLocaleDateString(
                            "id-ID",
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {order.customer.customer_name}
                        </td>
                        <td className="px-3 py-3">{order.items.length}</td>
                        <td className="px-3 py-3 text-right font-medium">
                          {formatRupiah(order.total_amount)}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <Link
                            className="font-semibold text-blue-700 hover:underline"
                            href={`/orders/${order.id}`}
                          >
                            Lihat
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm">
                <p className="text-slate-600">
                  {result.meta.total} transaksi · halaman {result.meta.page}{" "}
                  dari {Math.max(result.meta.total_pages, 1)}
                </p>
                <div className="flex gap-2">
                  <button
                    className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => current - 1)}
                    type="button"
                  >
                    Sebelumnya
                  </button>
                  <button
                    className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40"
                    disabled={page >= result.meta.total_pages}
                    onClick={() => setPage((current) => current + 1)}
                    type="button"
                  >
                    Berikutnya
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
