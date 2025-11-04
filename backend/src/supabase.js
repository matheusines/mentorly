import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

/**
 * Cria um cliente no contexto do usuário (sem service_role).
 * Todas as queries passam pela RLS.
 */
export function makeUserClient(accessToken) {
  if (!process.env.SUPABASE_URL) throw new Error('Missing SUPABASE_URL');
  if (!process.env.SUPABASE_ANON_KEY) throw new Error('Missing SUPABASE_ANON_KEY');
  if (!accessToken) throw new Error('Missing access token');

  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
  );
}
