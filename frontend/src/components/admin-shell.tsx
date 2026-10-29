"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useSyncExternalStore } from "react";
import {
  getAuthStatus,
  getServerAuthStatus,
  logout,
  subscribeToAuth,
} from "@/lib/auth";

const navigation = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/products", label: "Produk" },
  { href: "/customers", label: "Pelanggan" },
  { href: "/orders", label: "Transaksi" },
];

export function AdminShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const authStatus = useSyncExternalStore(
    subscribeToAuth,
    getAuthStatus,
    getServerAuthStatus,
  );

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.replace("/login");
    }
  }, [authStatus, router]);

  if (authStatus !== "authenticated") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 text-sm text-slate-600">
        Memeriksa sesi...
      </main>
    );
  }

  async function handleLogout() {
    try {
      await logout();
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 sm:px-8 md:flex-row md:items-center md:justify-between">
          <Link className="text-lg font-bold tracking-tight" href="/dashboard">
            Azatech <span className="text-blue-700">Shop</span>
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <nav aria-label="Navigasi utama" className="flex flex-wrap gap-2">
              {navigation.map((item) => (
                <Link
                  className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <button
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              onClick={() => void handleLogout()}
              type="button"
            >
              Keluar
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">{title}</h1>
        {children}
      </main>
    </div>
  );
}
