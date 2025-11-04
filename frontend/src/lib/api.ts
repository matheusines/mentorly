import { supabase } from './supabase';

const BASE = import.meta.env.VITE_API_BASE as string;

export async function api<T = any>(path: string, init?: RequestInit): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || res.statusText);
  return body as T;
}
