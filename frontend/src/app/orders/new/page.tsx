"use client";

import Link from "next/link";
import {
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin-shell";
import { apiRequest, ApiRequestError } from "@/lib/api";
import {
  getAccessToken,
  getServerAccessToken,
  subscribeToAuth,
} from "@/lib/auth";
import { formatRupiah } from "@/lib/format";
import type {
  CreateOrderPayload,
  Customer,
  OrderResponse,
  Product,
} from "@/types/api";

interface ListResponse<T> {
  data: T[];
}

interface OrderLine {
  key: number;
  productId: string;
  quantity: number;
}

function getErrorMessage(error: Error): string {
  return error.message || "Terjadi kesalahan. Silakan coba lagi.";
}

export default function NewOrderPage() {
  const queryClient = useQueryClient();
  const nextLineKey = useRef(1);
  const accessToken = useSyncExternalStore(
    subscribeToAuth,
    getAccessToken,
    getServerAccessToken,
  );
  const [customerId, setCustomerId] = useState("");
  const [lines, setLines] = useState<OrderLine[]>([
    { key: 0, productId: "", quantity: 1 },
  ]);
  const [formError, setFormError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<OrderResponse | null>(null);

  const customersQuery = useQuery({
    queryKey: ["customers", "order-form"],
    enabled: Boolean(accessToken),
    queryFn: () =>
      apiRequest<ListResponse<Customer>>("/customers?page=1&per_page=100", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
  });

  const productsQuery = useQuery({
    queryKey: ["products", "order-form"],
    enabled: Boolean(accessToken),
    queryFn: () =>
      apiRequest<ListResponse<Product>>("/products?page=1&per_page=100", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
  });

  const productsById = useMemo(
    () =>
      new Map(productsQuery.data?.data.map((product) => [product.id, product])),
    [productsQuery.data],
  );

  const total = lines.reduce((sum, line) => {
    const product = productsById.get(line.productId);
    return sum + (product ? Number(product.price) * line.quantity : 0);
  }, 0);

  const createOrderMutation = useMutation<
    OrderResponse,
    Error,
    CreateOrderPayload
  >({
    mutationFn: (payload) => {
      if (!accessToken) {
        throw new Error(
          "Silakan masuk terlebih dahulu untuk membuat transaksi.",
        );
      }

      return apiRequest<OrderResponse>("/orders", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(payload),
      });
    },
    onSuccess: async (order) => {
      setCreatedOrder(order);
      setFormError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["orders"] }),
        queryClient.invalidateQueries({ queryKey: ["products"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
    },
  });

  const stockErrors =
    createOrderMutation.error instanceof ApiRequestError
      ? createOrderMutation.error.errors
      : {};

  function updateLine(key: number, patch: Partial<Omit<OrderLine, "key">>) {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
    setCreatedOrder(null);
    createOrderMutation.reset();
  }

  function addLine() {
    setLines((current) => [
      ...current,
      { key: nextLineKey.current++, productId: "", quantity: 1 },
    ]);
  }

  function removeLine(key: number) {
    setLines((current) => current.filter((line) => line.key !== key));
    setCreatedOrder(null);
    createOrderMutation.reset();
  }

  function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setCreatedOrder(null);
    createOrderMutation.reset();

    if (!customerId) {
      setFormError("Pilih pelanggan terlebih dahulu.");
      return;
    }

    if (lines.length === 0 || lines.some((line) => !line.productId)) {
      setFormError("Pilih produk untuk setiap baris transaksi.");
      return;
    }

    if (
      lines.some(
        (line) => !Number.isInteger(line.quantity) || line.quantity < 1,
      )
    ) {
      setFormError("Jumlah produk minimal 1.");
      return;
    }

    const productIds = lines.map((line) => line.productId);
    if (new Set(productIds).size !== productIds.length) {
      setFormError("Produk yang sama hanya boleh ditambahkan satu kali.");
      return;
    }

    createOrderMutation.mutate({
      customer_id: customerId,
      items: lines.map((line) => ({
        product_id: line.productId,
        quantity: line.quantity,
      })),
    });
  }

  if (!accessToken) {
    return (
      <AdminShell title="Buat transaksi">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-700">
            Kamu perlu masuk sebelum membuat transaksi.
          </p>
          <Link
            className="mt-4 inline-flex rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
            href="/login"
          >
            Ke halaman login
          </Link>
        </section>
      </AdminShell>
    );
  }

  if (customersQuery.isPending || productsQuery.isPending) {
    return (
      <AdminShell title="Buat transaksi">
        <p className="text-sm text-slate-600">Memuat pelanggan dan produk...</p>
      </AdminShell>
    );
  }

  if (customersQuery.isError || productsQuery.isError) {
    const error = customersQuery.error ?? productsQuery.error;
    return (
      <AdminShell title="Buat transaksi">
        <section
          className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800"
          role="alert"
        >
          Gagal memuat data transaksi:{" "}
          {error?.message ?? "Terjadi kesalahan saat memuat data."}
        </section>
      </AdminShell>
    );
  }

  const customers = customersQuery.data.data;
  const products = productsQuery.data.data;

  return (
    <AdminShell title="Buat transaksi">
      <form className="space-y-6" onSubmit={submitOrder}>
        {formError && (
          <div
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            role="alert"
          >
            {formError}
          </div>
        )}

        {createOrderMutation.isError && (
          <div
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            role="alert"
          >
            {getErrorMessage(createOrderMutation.error)}
          </div>
        )}

        {createdOrder && (
          <div
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
            role="status"
          >
            <span> Transaksi {createdOrder.order_number} berhasil dibuat.</span>
            <Link
              className="font-semibold underline underline-offset-2"
              href={`/orders/${createdOrder.id}`}
            >
              Lihat transaksi
            </Link>
          </div>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <label className="block max-w-xl text-sm font-medium text-slate-700">
            Pelanggan
            <select
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              onChange={(event) => {
                setCustomerId(event.target.value);
                setCreatedOrder(null);
              }}
              required
              value={customerId}
            >
              <option value="">Pilih pelanggan</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.customer_name}
                </option>
              ))}
            </select>
          </label>

          {customers.length === 0 && (
            <p className="mt-3 text-sm text-amber-700">
              Belum ada pelanggan. Tambahkan pelanggan sebelum membuat
              transaksi.
            </p>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Produk transaksi</h2>
              <p className="mt-1 text-sm text-slate-600">
                Harga dan subtotal hanya perkiraan; total akhir dihitung
                backend.
              </p>
            </div>
            <button
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              onClick={addLine}
              type="button"
            >
              Tambah produk
            </button>
          </div>

          {products.length === 0 && (
            <p className="mb-4 text-sm text-amber-700">
              Belum ada produk aktif untuk ditambahkan ke transaksi.
            </p>
          )}

          <div className="space-y-4">
            {lines.map((line, index) => {
              const selectedProduct = productsById.get(line.productId);
              const quantityError =
                stockErrors[`items.${index}.quantity`]?.join(", ");
              const selectedElsewhere = new Set(
                lines
                  .filter((other) => other.key !== line.key)
                  .map((other) => other.productId),
              );

              return (
                <div
                  className="grid gap-4 rounded-lg border border-slate-200 p-4 md:grid-cols-[minmax(0,1fr)_140px_160px_auto] md:items-end"
                  key={line.key}
                >
                  <label className="block text-sm font-medium text-slate-700">
                    Produk
                    <select
                      className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                      onChange={(event) =>
                        updateLine(line.key, { productId: event.target.value })
                      }
                      required
                      value={line.productId}
                    >
                      <option value="">Pilih produk</option>
                      {products.map((product) => (
                        <option
                          disabled={selectedElsewhere.has(product.id)}
                          key={product.id}
                          value={product.id}
                        >
                          {product.product_name} · stok {product.stock}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-sm font-medium text-slate-700">
                    Jumlah
                    <input
                      aria-describedby={
                        quantityError ? `quantity-error-${line.key}` : undefined
                      }
                      aria-invalid={Boolean(quantityError)}
                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 aria-[invalid=true]:border-red-500"
                      min={1}
                      onChange={(event) =>
                        updateLine(line.key, {
                          quantity: Math.max(
                            1,
                            Number(event.target.value) || 1,
                          ),
                        })
                      }
                      type="number"
                      value={line.quantity}
                    />
                    {quantityError && (
                      <span
                        className="mt-1 block text-xs text-red-700"
                        id={`quantity-error-${line.key}`}
                      >
                        {quantityError}
                      </span>
                    )}
                  </label>

                  <div className="text-sm">
                    <span className="block font-medium text-slate-500">
                      Subtotal
                    </span>
                    <span className="mt-2 block font-semibold text-slate-900">
                      {formatRupiah(
                        selectedProduct
                          ? Number(selectedProduct.price) * line.quantity
                          : 0,
                      )}
                    </span>
                  </div>

                  <button
                    aria-label={`Hapus baris produk ${index + 1}`}
                    className="rounded-lg px-3 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                    onClick={() => removeLine(line.key)}
                    type="button"
                  >
                    Hapus
                  </button>
                </div>
              );
            })}
          </div>

          {lines.length === 0 && (
            <p className="mt-4 text-sm text-slate-600">
              Belum ada baris produk. Gunakan tombol “Tambah produk”.
            </p>
          )}
        </section>

        <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">
              Perkiraan total
            </p>
            <p className="mt-1 text-2xl font-semibold">{formatRupiah(total)}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              href="/orders"
            >
              Batal
            </Link>
            <button
              className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={
                createOrderMutation.isPending ||
                customers.length === 0 ||
                products.length === 0
              }
              type="submit"
            >
              {createOrderMutation.isPending
                ? "Menyimpan..."
                : "Simpan transaksi"}
            </button>
          </div>
        </section>
      </form>
    </AdminShell>
  );
}
