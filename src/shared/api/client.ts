export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

/** A failed API call, in the backend's error format. */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string | string[] | undefined) {
    super(
      [message ?? []].flat().join(', ') ||
        `Request failed with status ${status}`,
    );
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Used by the generated API client. Customers have no account, so no token is sent. */
export async function apiFetch<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, init);
  const text = await response.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    body = text;
  }
  if (!response.ok) {
    throw new ApiError(
      response.status,
      (body as { message?: string | string[] } | undefined)?.message,
    );
  }
  return body as T;
}
