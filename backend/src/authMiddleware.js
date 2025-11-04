import { makeUserClient } from './supabase.js';

export async function requireAuth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing_token' });

  const supabase = makeUserClient(token);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return res.status(401).json({ error: 'invalid_token' });

  req.user = data.user;
  req.supabase = supabase; // use este cliente nas rotas
  next();
}
