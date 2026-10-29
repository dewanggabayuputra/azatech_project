"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { AdminShell } from "@/components/admin-shell";
import { apiRequest } from "@/lib/api";
import type { Customer, PaginationMeta } from "@/types/api";

interface CustomersResponse {
  data: Customer[];
  meta: PaginationMeta;
}

interface CustomerPayload {
  customer_name: string;
  customer_address: string;
  gender: "PRIA" | "WANITA";
  birth_date: string;
  phone?: string;
}

const emptyForm: CustomerPayload = {
  customer_name: "",
  customer_address: "",
  gender: "PRIA",
  birth_date: "",
  phone: "",
};

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Customer | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<CustomerPayload>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const customersQuery = useQuery({
    queryKey: ["customers", page, search],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        per_page: "10",
      });
      if (search) params.set("search", search);
      return apiRequest<CustomersResponse>(`/customers?${params}`);
    },
  });

  const saveMutation = useMutation({
    mutationFn: (payload: CustomerPayload) =>
      editing
        ? apiRequest<Customer>(`/customers/${editing.id}`, {
            method: "PUT",
            body: JSON.stringify(payload),
          })
        : apiRequest<Customer>("/customers", {
            method: "POST",
            body: JSON.stringify(payload),
          }),
    onSuccess: async () => {
      setFormOpen(false);
      setEditing(null);
      setForm(emptyForm);
      await queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest<void>(`/customers/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["customers"] });
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
    if (
      !form.customer_name.trim() ||
      !form.customer_address.trim() ||
      !/^\d{4}-\d{2}-\d{2}$/.test(form.birth_date)
    ) {
      setFormError("Lengkapi nama, alamat, dan tanggal lahir yang valid.");
      return;
    }
    saveMutation.mutate({
      ...form,
      phone: form.phone?.trim() || undefined,
    });
  }

  function openCreateForm() {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    saveMutation.reset();
    setFormOpen(true);
  }

  function openEditForm(customer: Customer) {
    setEditing(customer);
    setForm({
      customer_name: customer.customer_name,
      customer_address: customer.customer_address,
      gender: customer.gender,
      birth_date: customer.birth_date.slice(0, 10),
      phone: customer.phone ?? "",
    });
    setFormError(null);
    saveMutation.reset();
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    saveMutation.reset();
  }

  const result = customersQuery.data;

  return (
    <AdminShell title="Pelanggan">
      <div className="space-y-5">
        <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <form className="flex flex-1 gap-2" onSubmit={submitSearch}>
            <label className="sr-only" htmlFor="customer-search">
              Cari pelanggan
            </label>
            <input
              className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              id="customer-search"
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Cari nama pelanggan"
              value={searchInput}
            />
            <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">
              Cari
            </button>
          </form>
          <button
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
            onClick={openCreateForm}
            type="button"
          >
            Tambah pelanggan
          </button>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          {customersQuery.isPending && (
            <p className="py-12 text-center text-sm text-slate-600">
              Memuat pelanggan...
            </p>
          )}
          {customersQuery.isError && (
            <div
              className="rounded-lg bg-red-50 p-4 text-sm text-red-800"
              role="alert"
            >
              Gagal memuat pelanggan: {customersQuery.error.message}
              <button
                className="ml-3 font-semibold underline"
                onClick={() => void customersQuery.refetch()}
                type="button"
              >
                Coba lagi
              </button>
            </div>
          )}
          {result && result.data.length === 0 && (
            <p className="py-12 text-center text-sm text-slate-600">
              Belum ada pelanggan yang cocok.
            </p>
          )}
          {result && result.data.length > 0 && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[780px] text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-3">Nama</th>
                      <th className="px-3 py-3">Alamat</th>
                      <th className="px-3 py-3">Gender</th>
                      <th className="px-3 py-3">Tanggal lahir</th>
                      <th className="px-3 py-3">Telepon</th>
                      <th className="px-3 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.data.map((customer) => (
                      <tr
                        className="border-b border-slate-100 last:border-0"
                        key={customer.id}
                      >
                        <td className="px-3 py-3 font-medium">
                          {customer.customer_name}
                        </td>
                        <td className="max-w-xs truncate px-3 py-3">
                          {customer.customer_address}
                        </td>
                        <td className="px-3 py-3">{customer.gender}</td>
                        <td className="px-3 py-3">
                          {customer.birth_date.slice(0, 10)}
                        </td>
                        <td className="px-3 py-3">{customer.phone ?? "—"}</td>
                        <td className="px-3 py-3 text-right">
                          <button
                            className="mr-3 font-medium text-blue-700 hover:underline"
                            onClick={() => openEditForm(customer)}
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            className="font-medium text-red-700 hover:underline disabled:opacity-50"
                            disabled={deleteMutation.isPending}
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Hapus ${customer.customer_name}?`,
                                )
                              ) {
                                deleteMutation.mutate(customer.id);
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
              Gagal menghapus pelanggan: {deleteMutation.error.message}
            </p>
          )}
        </section>

        {formOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
            <section
              aria-labelledby="customer-form-title"
              aria-modal="true"
              className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
              role="dialog"
            >
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-semibold" id="customer-form-title">
                  {editing ? "Edit pelanggan" : "Tambah pelanggan"}
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
                <Field
                  label="Nama pelanggan"
                  onChange={(value) =>
                    setForm({ ...form, customer_name: value })
                  }
                  value={form.customer_name}
                />
                <label className="block text-sm font-medium text-slate-700">
                  Alamat
                  <textarea
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2"
                    onChange={(event) =>
                      setForm({ ...form, customer_address: event.target.value })
                    }
                    required
                    rows={3}
                    value={form.customer_address}
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Gender
                    <select
                      className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                      onChange={(event) =>
                        setForm({
                          ...form,
                          gender: event.target
                            .value as CustomerPayload["gender"],
                        })
                      }
                      value={form.gender}
                    >
                      <option value="PRIA">Pria</option>
                      <option value="WANITA">Wanita</option>
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Tanggal lahir
                    <input
                      className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2"
                      max={new Date().toISOString().slice(0, 10)}
                      onChange={(event) =>
                        setForm({ ...form, birth_date: event.target.value })
                      }
                      required
                      type="date"
                      value={form.birth_date}
                    />
                  </label>
                </div>
                <Field
                  label="Nomor telepon (opsional)"
                  onChange={(value) => setForm({ ...form, phone: value })}
                  required={false}
                  value={form.phone ?? ""}
                />
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

function Field({
  label,
  value,
  onChange,
  required = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input
        className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2"
        onChange={(event) => onChange(event.target.value)}
        required={required}
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
        {meta.total} pelanggan · halaman {meta.page} dari{" "}
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
