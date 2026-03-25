const BASE_URL = process.env.CODE_TANUKI_BASE_URL ?? 'http://127.0.0.1:3000';

export async function apiFetch(path: string, options?: RequestInit): Promise<unknown> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = (data as any)?.error ?? res.statusText;
    throw new Error(`API error ${res.status}: ${msg}`);
  }
  return data;
}
