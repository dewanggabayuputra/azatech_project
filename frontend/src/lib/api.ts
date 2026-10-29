import { clearTokens, getAccessToken, refreshAccessToken } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly errors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getErrorMessage(body: unknown, status: number): string {
  if (isRecord(body)) {
    const message = body.message;
    if (typeof message === "string") {
      return message;
    }
    if (
      Array.isArray(message) &&
      message.every((item) => typeof item === "string")
    ) {
      return message.join(", ");
    }
  }

  return `Request gagal (${status})`;
}

function getFieldErrors(body: unknown): Record<string, string[]> {
  if (!isRecord(body)) {
    return {};
  }

  const errors = isRecord(body.errors)
    ? body.errors
    : isRecord(body.message) && isRecord(body.message.errors)
      ? body.message.errors
      : undefined;

  if (!errors) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(errors).flatMap(([field, messages]) => {
      if (typeof messages === "string") {
        return [[field, [messages]]];
      }
      if (
        Array.isArray(messages) &&
        messages.every((item) => typeof item === "string")
      ) {
        return [[field, messages]];
      }
      return [];
    }),
  );
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL belum dikonfigurasi");
  }

  const request = async (token: string | null) => {
    const headers = new Headers(options.headers);
    if (!headers.has("Content-Type") && options.body) {
      headers.set("Content-Type", "application/json");
    }
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return fetch(`${API_URL}${path}`, { ...options, headers });
  };

  const isAuthRequest = /^\/auth\/(login|refresh|logout)(?:\?|$)/.test(path);
  let response = await request(isAuthRequest ? null : getAccessToken());
  if (response.status === 401 && !isAuthRequest) {
    const renewedToken = await refreshAccessToken();
    if (!renewedToken) {
      clearTokens();
      throw new ApiRequestError("Sesi berakhir. Silakan masuk kembali.", 401);
    }
    response = await request(renewedToken);
    if (response.status === 401) {
      clearTokens();
      throw new ApiRequestError("Sesi berakhir. Silakan masuk kembali.", 401);
    }
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiRequestError(
      getErrorMessage(body, response.status),
      response.status,
      getFieldErrors(body),
    );
  }

  return body as T;
}
