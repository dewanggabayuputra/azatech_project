"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { AdminShell } from "@/components/admin-shell";
import { apiRequest } from "@/lib/api";
import { formatRupiah } from "@/lib/format";
import type { PaginationMeta, Product } from "@/types/api";

interface ProductsResponse {
  data: Product[];
  meta: PaginationMeta;
}

interface ProductPayload {
  product_code: string;
  product_name: string;
  stock: number;
  price: number;
}

const initialForm: ProductPayload = {
  product_code: "",
  product_name: "",
  stock: 0,
  price: 0,
};

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"name" | "price" | "stock">("name");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [editing, setEditing] = useState<Product | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<ProductPayload>(initialForm);
  const [formError, setFormError] = useState<string | null>(null);

  const productsQuery = useQuery({
    queryKey: ["products", page, search, sort, order],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        per_page: "10",
        sort,
        order,
      });
      if (search) params.set("search", search);
      return apiRequest<ProductsResponse>(`/products?${params}`);
    },
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      editing
        ? apiRequest<Product>(`/products/${editing.id}`, {
            method: "PUT",
            body: JSON.stringify(form),
          })
        : apiRequest<Product>("/products", {
            method: "POST",
            body: JSON.stringify(form),
          }),
    onSuccess: async () => {
      setFormOpen(false);
      setEditing(null);
      setForm(initialForm);
      setFormError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["products"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest<void>(`/products/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["products"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
    },
  });

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (!form.product_code.trim() || !form.product_name.trim()) {
      setFormError("Kode dan nama produk wajib diisi.");
      return;
    }
    if (!Number.isInteger(form.stock) || form.stock < 0 || form.price <= 0) {
      setFormError("Stok harus 0 atau lebih dan harga harus lebih dari 0.");
      return;
    }
    saveMutation.mutate();
  }

  function startEdit(product: Product) {
    setEditing(product);
    setForm({
      product_code: product.product_code,
      product_name: product.product_name,
      stock: product.stock,
      price: Number(product.price),
    });
    setFormError(null);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
    setForm(initialForm);
    setFormError(null);
    saveMutation.reset();
  }

  const result = productsQuery.data;

  return (
    <AdminShell title="Produk">
      <div className="space-y-5">
        <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <form className="flex flex-1 gap-2" onSubmit={submitSearch}>
            <label className="sr-only" htmlFor="product-search">
              Cari produk
            </label>
            <input
              className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              id="product-search"
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Cari nama atau kode produk"
              value={searchInput}
            />
            <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">
              Cari
            </button>
          </form>
          <button
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
            onClick={() => {
              closeForm();
              setEditing(null);
              setFormOpen(true);
            }}
            type="button"
          >
            Tambah produk
          </button>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <label className="text-sm text-slate-600">
              Urutkan
              <select
                className="ml-2 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
                onChange={(event) => setSort(event.target.value as typeof sort)}
                value={sort}
              >
                <option value="name">Nama</option>
                <option value="price">Harga</option>
                <option value="stock">Stok</option>
              </select>
            </label>
            <label className="text-sm text-slate-600">
              Arah
              <select
                className="ml-2 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
                onChange={(event) =>
                  setOrder(event.target.value as typeof order)
                }
                value={order}
              >
                <option value="asc">Naik</option>
                <option value="desc">Turun</option>
              </select>
            </label>
          </div>

          {productsQuery.isPending && (
            <p className="py-12 text-center text-sm text-slate-600">
              Memuat produk...
            </p>
          )}
          {productsQuery.isError && (
            <div
              className="rounded-lg bg-red-50 p-4 text-sm text-red-800"
              role="alert"
            >
              Gagal memuat produk: {productsQuery.error.message}
              <button
                className="ml-3 font-semibold underline"
                onClick={() => void productsQuery.refetch()}
                type="button"
              >
                Coba lagi
              </button>
            </div>
          )}
          {result && result.data.length === 0 && (
            <p className="py-12 text-center text-sm text-slate-600">
              Belum ada produk yang cocok.
            </p>
          )}
          {result && result.data.length > 0 && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-3">Kode</th>
                      <th className="px-3 py-3">Nama</th>
                      <th className="px-3 py-3">Stok</th>
                      <th className="px-3 py-3">Harga</th>
                      <th className="px-3 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.data.map((product) => (
                      <tr
                        className="border-b border-slate-100 last:border-0"
                        key={product.id}
                      >
                        <td className="px-3 py-3 font-medium">
                          {product.product_code}
                        </td>
                        <td className="px-3 py-3">{product.product_name}</td>
                        <td className="px-3 py-3">{product.stock}</td>
                        <td className="px-3 py-3">
                          {formatRupiah(product.price)}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <button
                            className="mr-3 font-medium text-blue-700 hover:underline"
                            onClick={() => startEdit(product)}
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            className="font-medium text-red-700 hover:underline disabled:opacity-50"
                            disabled={deleteMutation.isPending}
                            onClick={() => {
                              if (
                                window.confirm(`Hapus ${product.product_name}?`)
                              ) {
                                deleteMutation.mutate(product.id);
                              }
                            }}
                            type="button"
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination meta={result.meta} onPageChange={setPage} />
            </>
          )}

          {deleteMutation.isError && (
            <p className="mt-4 text-sm text-red-700" role="alert">
              Gagal menghapus produk: {deleteMutation.error.message}
            </p>
          )}
        </section>

        {formOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
            <section
              aria-labelledby="product-form-title"
              aria-modal="true"
              className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
              role="dialog"
            >
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-semibold" id="product-form-title">
                  {editing ? "Edit produk" : "Tambah produk"}
                </h2>
                <button
                  aria-label="Tutup form"
                  className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100"
                  onClick={closeForm}
                  type="button"
                >
                  ✕
                </button>
              </div>
              <form className="space-y-4" onSubmit={submitForm}>
                <TextField
                  label="Kode produk"
                  onChange={(value) =>
                    setForm({ ...form, product_code: value })
                  }
                  value={form.product_code}
                />
                <TextField
                  label="Nama produk"
                  onChange={(value) =>
                    setForm({ ...form, product_name: value })
                  }
                  value={form.product_name}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Stok
                    <input
                      className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2"
                      min={0}
                      onChange={(event) =>
                        setForm({ ...form, stock: Number(event.target.value) })
                      }
                      type="number"
                      value={form.stock}
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Harga
                    <input
                      className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2"
                      min={0.01}
                      onChange={(event) =>
                        setForm({ ...form, price: Number(event.target.value) })
                      }
                      step="0.01"
                      type="number"
                      value={form.price}
                    />
                  </label>
                </div>
                {(formError || saveMutation.isError) && (
                  <p className="text-sm text-red-700" role="alert">
                    {formError ?? saveMutation.error?.message}
                  </p>
                )}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
                    onClick={closeForm}
                    type="button"
                  >
                    Batal
                  </button>
                  <button
                    className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    disabled={saveMutation.isPending}
                    type="submit"
                  >
                    {saveMutation.isPending ? "Menyimpan..." : "Simpan"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </div>
    </AdminShell>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input
        className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2"
        onChange={(event) => onChange(event.target.value)}
        required
        value={value}
      />
    </label>
  );
}

function Pagination({
  meta,
  onPageChange,
}: {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm">
      <p className="text-slate-600">
        {meta.total} produk · halaman {meta.page} dari{" "}
        {Math.max(meta.total_pages, 1)}
      </p>
      <div className="flex gap-2">
        <button
          className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40"
          disabled={meta.page <= 1}
          onClick={() => onPageChange(meta.page - 1)}
          type="button"
        >
          Sebelumnya
        </button>
        <button
          className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40"
          disabled={meta.page >= meta.total_pages}
          onClick={() => onPageChange(meta.page + 1)}
          type="button"
        >
          Berikutnya
        </button>
      </div>
    </div>
  );
}
