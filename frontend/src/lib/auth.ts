const ACCESS_TOKEN_KEY = "azatech_access_token";
const REFRESH_TOKEN_KEY = "azatech_refresh_token";
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export type AuthStatus = "checking" | "authenticated" | "unauthenticated";

let authStatus: AuthStatus = "checking";
let sessionInitialization: Promise<void> | null = null;
let refreshInProgress: Promise<string | null> | null = null;
const listeners = new Set<() => void>();

function emitAuthChange(): void {
  listeners.forEach((listener) => listener());
}

function setAuthStatus(status: AuthStatus): void {
  authStatus = status;
  if (typeof window !== "undefined") {
    emitAuthChange();
  }
}

export function getAuthStatus(): AuthStatus {
  return authStatus;
}

export function getServerAuthStatus(): AuthStatus {
  return "checking";
}

export function subscribeToAuth(callback: () => void): () => void {
  listeners.add(callback);
  if (typeof window === "undefined") {
    return () => listeners.delete(callback);
  }

  const onStorage = () => {
    if (!localStorage.getItem(ACCESS_TOKEN_KEY)) {
      authStatus = "unauthenticated";
    } else {
      authStatus = "authenticated";
    }
    emitAuthChange();
  };

  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getServerAccessToken(): null {
  return null;
}

export function saveTokens(tokens: AuthTokens): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
  setAuthStatus("authenticated");
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  setAuthStatus("unauthenticated");
}

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshInProgress) {
    return refreshInProgress;
  }

  refreshInProgress = (async () => {
    const refreshToken = getRefreshToken();
    if (!API_URL || !refreshToken) {
      clearTokens();
      return null;
    }

    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        clearTokens();
        return null;
      }

      const tokens = (await response.json()) as Pick<
        AuthTokens,
        "access_token" | "refresh_token"
      >;
      if (!tokens.access_token || !tokens.refresh_token) {
        clearTokens();
        return null;
      }

      saveTokens(tokens);
      return tokens.access_token;
    } catch {
      clearTokens();
      return null;
    } finally {
      refreshInProgress = null;
    }
  })();

  return refreshInProgress;
}

export async function initializeSession(): Promise<void> {
  if (sessionInitialization) {
    return sessionInitialization;
  }

  sessionInitialization = (async () => {
    if (!getRefreshToken()) {
      setAuthStatus("unauthenticated");
      return;
    }

    const accessToken = await refreshAccessToken();
    if (!accessToken) {
      clearTokens();
      return;
    }

    setAuthStatus("authenticated");
  })().finally(() => {
    sessionInitialization = null;
  });

  return sessionInitialization;
}

export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();
  if (API_URL && refreshToken) {
    try {
      const response = await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!response.ok && response.status >= 500) {
        throw new Error("Gagal mengakhiri sesi di server.");
      }
    } finally {
      clearTokens();
    }
    return;
  }

  clearTokens();
}
