const API_BASE = process.env.NEXT_PUBLIC_API_BASE_PATH ?? "/api/v1";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }

  /** Field-level messages from a 422 validation response, keyed by the last path segment. */
  fieldErrors(): Record<string, string> {
    if (!Array.isArray(this.details)) return {};
    const result: Record<string, string> = {};
    for (const item of this.details as { loc?: unknown[]; msg?: string }[]) {
      const field = item.loc?.[item.loc.length - 1];
      if (typeof field === "string" && item.msg) result[field] = item.msg.replace(/^Value error, /, "");
    }
    return result;
  }
}

type Query = Record<string, string | number | boolean | string[] | undefined | null>;

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Query;
  signal?: AbortSignal;
}

let unauthorizedHandler: ((code: string) => void) | null = null;

/** Registered by the app shell so any 401 (expired session) sends the user to the login page. */
export function onUnauthorized(handler: ((code: string) => void) | null): void {
  unauthorizedHandler = handler;
}

export function buildUrl(path: string, query?: Query): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) value.forEach((v) => params.append(key, v));
    else params.append(key, String(value));
  }
  const qs = params.toString();
  return `${API_BASE}${path}${qs ? `?${qs}` : ""}`;
}

async function parseError(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as { error?: { code?: string; message?: string; details?: unknown } };
    if (body.error?.message) {
      return new ApiError(response.status, body.error.code ?? "error", body.error.message, body.error.details);
    }
  } catch {
    // Non-JSON error body (e.g. proxy failure); fall through to a generic message.
  }
  const message =
    response.status >= 500
      ? "The server is unavailable right now. Please try again shortly."
      : `Request failed (${response.status}).`;
  return new ApiError(response.status, "http_error", message);
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, signal } = options;
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const headers: Record<string, string> = { "X-Requested-With": "fetch", Accept: "application/json" };
  if (body !== undefined && !isForm) headers["Content-Type"] = "application/json";

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      credentials: "same-origin",
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(0, "network_error", "Could not reach the server. Check your connection and try again.");
  }

  if (!response.ok) {
    const error = await parseError(response);
    if (response.status === 401 && path !== "/auth/login" && path !== "/auth/me") unauthorizedHandler?.(error.code);
    throw error;
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function errorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (error instanceof ApiError) return error.message;
  return fallback;
}
