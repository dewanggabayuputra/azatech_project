"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import { apiRequest, ApiRequestError } from "@/lib/api";
import {
  getAuthStatus,
  getServerAuthStatus,
  saveTokens,
  subscribeToAuth,
  type AuthTokens,
} from "@/lib/auth";

interface LoginPayload {
  email: string;
  password: string;
}

interface LoginResponse extends AuthTokens {
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export default function LoginPage() {
  const router = useRouter();
  const authStatus = useSyncExternalStore(
    subscribeToAuth,
    getAuthStatus,
    getServerAuthStatus,
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const loginMutation = useMutation<LoginResponse, Error, LoginPayload>({
    mutationFn: (payload) =>
      apiRequest<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: (tokens) => {
      saveTokens(tokens);
      router.replace("/dashboard");
      router.refresh();
    },
  });

  useEffect(() => {
    if (authStatus === "authenticated") {
      router.replace("/dashboard");
    }
  }, [authStatus, router]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError(null);
    loginMutation.reset();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setValidationError("Masukkan alamat email yang valid.");
      return;
    }
    if (password.length < 8) {
      setValidationError("Password minimal 8 karakter.");
      return;
    }
    loginMutation.mutate({ email, password });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold text-blue-700">AZATECH SHOP</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          Masuk ke akun
        </h1>
        <form className="mt-7 space-y-4" onSubmit={submit}>
          <label className="block text-sm font-medium text-slate-700">
            Email
            <input
              autoComplete="email"
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              onChange={(event) => setEmail(event.target.value)}
              name="email"
              placeholder="nama@contoh.com"
              required
              type="email"
              value={email}
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Password
            <input
              autoComplete="current-password"
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              onChange={(event) => setPassword(event.target.value)}
              name="password"
              placeholder="Masukkan password"
              required
              type="password"
              value={password}
            />
          </label>
          {(validationError || loginMutation.isError) && (
            <p
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
              role="alert"
            >
              {validationError ??
                (loginMutation.error instanceof ApiRequestError
                  ? loginMutation.error.message
                  : loginMutation.error?.message)}
            </p>
          )}
          <button
            className="block w-full rounded-lg bg-blue-700 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loginMutation.isPending}
            type="submit"
          >
            {loginMutation.isPending ? "Memeriksa..." : "Masuk"}
          </button>
        </form>
      </section>
    </main>
  );
}
