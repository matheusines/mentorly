import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { requireAuth } from './authMiddleware.js';

const app = express();
app.use(cors({ origin: ['http://localhost:5173'] }));
app.use(express.json());

// Healthcheck
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Quem sou eu (via token)
app.get('/api/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// Perfil (RLS: só o próprio)
app.get('/api/profiles/me', requireAuth, async (req, res) => {
  const { data, error } = await req.supabase
    .from('profiles')
    .select('id, email, username, created_at')
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ profile: data });
});

app.patch('/api/profiles/me', requireAuth, async (req, res) => {
  const { username } = req.body || {};
  const { data, error } = await req.supabase
    .from('profiles')
    .update({ username })
    .select('id, email, username, created_at')
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json({ profile: data });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API em http://localhost:${port}`));
