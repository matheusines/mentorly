import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';

type Profile = { id: string; email: string | null; username: string | null; created_at: string };

export default function Dashboard() {
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [username, setUsername] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setEmail(session?.user?.email ?? null);

      const me = await api<{ user: { id: string } }>('/api/me');
      const p = await api<{ profile: Profile }>('/api/profiles/me');
      setProfile(p.profile);
      setUsername(p.profile?.username ?? '');
    })();
  }, []);

  async function saveUsername() {
    setSaving(true);
    try {
      const resp = await api<{ profile: Profile }>('/api/profiles/me', {
        method: 'PATCH',
        body: JSON.stringify({ username })
      });
      setProfile(resp.profile);
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.reload();
  }

  return (
    <div style={{ maxWidth: 600, margin: '24px auto', fontFamily: 'system-ui' }}>
      <h2>Dashboard</h2>
      <p>Logado como: <b>{email}</b></p>

      <div style={{ marginTop: 16, padding: 12, background: '#f7f7f7' }}>
        <h3>Seu perfil</h3>
        <pre style={{ background: '#fff', padding: 12 }}>
{JSON.stringify(profile, null, 2)}
        </pre>

        <label>
          Username:
          <input value={username} onChange={e => setUsername(e.target.value)} style={{ marginLeft: 8, padding: 6 }} />
        </label>
        <button onClick={saveUsername} disabled={saving} style={{ marginLeft: 8, padding: 8 }}>
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      <button onClick={signOut} style={{ padding: 10, marginTop: 16 }}>Sair</button>
    </div>
  );
}
