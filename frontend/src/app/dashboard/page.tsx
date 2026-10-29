"use client";

import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin-shell";
import { apiRequest } from "@/lib/api";
import { formatRupiah } from "@/lib/format";
import type { DashboardSummary } from "@/types/api";

interface DashboardResponse {
  success: boolean;
  message: string;
  data: DashboardSummary;
}

export default function DashboardPage() {
  const summaryQuery = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: () => apiRequest<DashboardResponse>("/dashboard/summary"),
  });

  const summary = summaryQuery.data?.data;

  return (
    <AdminShell title="Dashboard">
      {summaryQuery.isPending && (
        <p className="py-12 text-center text-sm text-slate-600">
          Memuat ringkasan toko...
        </p>
      )}
      {summaryQuery.isError && (
        <div
          className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800"
          role="alert"
        >
          Gagal memuat dashboard: {summaryQuery.error.message}
          <button
            className="ml-3 font-semibold underline"
            onClick={() => void summaryQuery.refetch()}
            type="button"
          >
            Coba lagi
          </button>
        </div>
      )}
      {summary && (
        <div className="space-y-6">
          <section
            aria-label="Ringkasan toko"
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            <Metric
              label="Total transaksi"
              value={String(summary.total_transactions)}
            />
            <Metric
              label="Total penjualan"
              value={formatRupiah(summary.total_sales)}
            />
            <Metric
              label="Produk terlaris"
              value={String(summary.best_selling_products.length)}
              detail="produk tercatat"
            />
            <Metric
              label="Stok menipis"
              value={String(summary.low_stock_products.length)}
              detail="produk dengan stok di bawah 5"
            />
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold">Produk terlaris</h2>
              {summary.best_selling_products.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-500">
                  Belum ada transaksi produk.
                </p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="py-3 pr-3">Produk</th>
                        <th className="py-3 text-right">Terjual</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.best_selling_products.map((product) => (
                        <tr
                          className="border-b border-slate-100 last:border-0"
                          key={product.product_id}
                        >
                          <td className="py-3 pr-3">
                            {product.product_name ?? "Produk tidak tersedia"}
                          </td>
                          <td className="py-3 text-right font-medium">
                            {product.quantity_sold}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold">Stok menipis</h2>
              {summary.low_stock_products.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-500">
                  Tidak ada produk dengan stok menipis.
                </p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="py-3 pr-3">Produk</th>
                        <th className="py-3 pr-3">Kode</th>
                        <th className="py-3 text-right">Stok</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.low_stock_products.map((product) => (
                        <tr
                          className="border-b border-slate-100 last:border-0"
                          key={product.id}
                        >
                          <td className="py-3 pr-3">{product.product_name}</td>
                          <td className="py-3 pr-3 text-slate-600">
                            {product.product_code}
                          </td>
                          <td className="py-3 text-right font-semibold text-amber-700">
                            {product.stock}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </AdminShell>
  );
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-medium text-slate-600">{label}</h2>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
      {detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}
    </article>
  );
}
