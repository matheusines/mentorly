import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

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
