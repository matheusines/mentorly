import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect, useState, type ReactNode } from 'react';
import { supabase } from './lib/supabase';
import AuthForm from './components/AuthForm';
import AgendaPage from './pages/Agenda';

function Loading() { return null; }

function RequireAuth({ children }: { children: ReactNode }) {
  const [checked, setChecked] = useState(false);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted) { setOk(!!session); setChecked(true); }
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (mounted) setOk(!!session);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  if (!checked) return <Loading />;
  return ok ? <>{children}</> : <Navigate to="/" replace />;
}

function Logout() {
  const navigate = useNavigate();
  useEffect(() => {
    (async () => { try { await supabase.auth.signOut(); } catch {} navigate('/', { replace: true }); })();
  }, [navigate]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AuthForm />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/logout" element={<Logout />} />
        <Route path="/agenda" element={<RequireAuth><AgendaPage /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
