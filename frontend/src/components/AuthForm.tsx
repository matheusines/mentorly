import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import '../styles/auth.css';

export default function AuthForm() {
  const navigate = useNavigate();

  // Garante que NUNCA fique com a classe da agenda no body quando estamos no login
  useEffect(() => {
    document.body.classList.remove('agenda');
  }, []);

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  // Se já estiver logado, manda para a Agenda
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) navigate('/agenda', { replace: true });
    })();
  }, [navigate]);

  // Redireciona quando a sessão mudar (fallback)
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate('/agenda', { replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null); setIsError(false); setLoading(true);

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) { setIsError(true); setMsg(error.message); return; }
        setMsg('Conta criada! Verifique seu e-mail se a confirmação estiver habilitada.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) { setIsError(true); setMsg(error.message); return; }
        navigate('/agenda');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrapper">
      <div className="glass-card">
        <div className="brand">
          <span className="logo-dot" />
          <h1>Bem-vindo de volta</h1>
          <p className="subtitle">Acesse para continuar seu projeto.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="label">E-mail</label>
          <input
            className="input"
            type="email"
            placeholder="voce@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
          />

          <label className="label">Senha</label>
          <div className="input-with-button">
            <input
              className="input"
              type={showPw ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            />
            <button
              type="button"
              className="ghost"
              onClick={() => setShowPw(s => !s)}
            >
              {showPw ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>

          {msg && <div className={`alert ${isError ? 'alert-error' : 'alert-ok'}`}>{msg}</div>}

          <button type="submit" className="primary" disabled={loading || !email || !password}>
            {loading ? 'Aguarde…' : mode === 'signin' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        <div className="footer">
          {mode === 'signin' ? (
            <>
              <span>Novo por aqui?</span>
              <button className="link" onClick={() => setMode('signup')}>Criar conta</button>
            </>
          ) : (
            <>
              <span>Já tem conta?</span>
              <button className="link" onClick={() => setMode('signin')}>Entrar</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
