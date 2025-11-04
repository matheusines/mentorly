import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

import './agenda-aulas.css';

type Lesson = {
  id: string;
  user_id: string;
  student_name: string;
  start_time: string;   // timestamptz
  start_date?: string;  // date (YYYY-MM-DD) vindo do BD
  location: string;
  created_at: string;
  updated_at: string;
};

/** Hoje no fuso local p/ <input type="date"> */
function todayLocalYMD(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Monta RFC3339 com offset local (sem usar toISOString) */
function buildRFC3339WithOffset(dateStr: string, timeStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm]  = timeStr.split(':').map(Number);
  const local = new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0);

  const tz = -local.getTimezoneOffset(); // minutos
  const sign = tz >= 0 ? '+' : '-';
  const offH = String(Math.floor(Math.abs(tz) / 60)).padStart(2, '0');
  const offM = String(Math.abs(tz) % 60).padStart(2, '0');

  const YYYY = String(y).padStart(4, '0');
  const MM   = String(m).padStart(2, '0');
  const DD   = String(d).padStart(2, '0');
  const HH   = String(hh).padStart(2, '0');
  const MI   = String(mm).padStart(2, '0');

  return `${YYYY}-${MM}-${DD}T${HH}:${MI}:00${sign}${offH}:${offM}`;
}

/** Formata hora local */
function fmtTimeLocal(isoLike: string) {
  const d = new Date(isoLike);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}


function ymdToSafeDate(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  // 12:00 UTC garante que, ao converter p/ local, não “volta” o dia
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0));
}

/** (Opcional) Se quiser forçar +1 dia sempre (último caso): descomente */
// function ymdToSafeDatePlusOne(ymd: string): Date {
//   const dt = ymdToSafeDate(ymd);
//   dt.setUTCDate(dt.getUTCDate() + 1);
//   return dt;
// }

function byStartTimeAsc(a: Lesson, b: Lesson) {
  return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
}

export default function AgendaPage() {
  const nav = useNavigate();

  // Fundo branco só na Agenda
  useEffect(() => {
    document.body.classList.add('agenda');
    return () => document.body.classList.remove('agenda');
  }, []);

  const [displayName, setDisplayName] = useState('Professor');
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  // formulário
  const [student, setStudent] = useState('');
  const [dateStr, setDateStr] = useState(() => todayLocalYMD());
  const [timeStr, setTimeStr] = useState('09:00');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // nome do usuário
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const email = session?.user?.email;
      const name = (session?.user?.user_metadata as any)?.name ?? email ?? 'Professor';
      setDisplayName(name);
    })();
  }, []);

  async function loadLessons() {
    setLoadingList(true);
    try {
      const { data, error } = await supabase
        .from('lessons')
        .select('id,user_id,student_name,start_time,start_date,location,created_at,updated_at')
        .order('start_time', { ascending: true });
      if (error) throw error;
      setLessons((data ?? []) as Lesson[]);
    } catch (e) {
      console.error(e);
      setMsg('Não foi possível carregar suas aulas.');
    } finally {
      setLoadingList(false);
    }
  }
  useEffect(() => { loadLessons(); }, []);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('public:lessons')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lessons' }, () => {
        loadLessons();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  function goLogout() {
    nav('/logout');
  }

  // INSERT com offset explícito + update otimista
  async function addLesson(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { nav('/', { replace: true }); return; }

      const payload = {
        user_id: session.user.id,
        student_name: student.trim(),
        start_time: buildRFC3339WithOffset(dateStr, timeStr), // 👈 sem toISOString()
        location: location.trim(),
      };
      if (!payload.student_name || !payload.location) {
        setMsg('Preencha aluno e local.');
        return;
      }

      const { data, error } = await supabase
        .from('lessons')
        .insert(payload)
        .select('id,user_id,student_name,start_time,start_date,location,created_at,updated_at')
        .single();
      if (error) throw error;

      if (data) {
        setLessons(prev => [...prev, data as Lesson].sort(byStartTimeAsc));
      }

      setStudent('');
      setTimeStr('09:00');
      setLocation('');
    } catch (e: any) {
      console.error(e);
      setMsg(e?.message ?? 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  // DELETE otimista
  async function removeLesson(id: string) {
    if (!confirm('Excluir esta aula?')) return;
    const prev = lessons;
    setLessons(prev.filter(l => l.id !== id));
    try {
      const { error } = await supabase.from('lessons').delete().eq('id', id);
      if (error) throw error;
    } catch (e) {
      console.error(e);
      setMsg('Não foi possível excluir.');
      setLessons(prev); // rollback
    }
  }

  // Agrupa pelo DIA vindo do BD (start_date)
  const groups = useMemo(() => {
    const map = new Map<string, Lesson[]>();
    for (const l of lessons) {
      const key = l.start_date ?? l.start_time.slice(0, 10);
      const arr = map.get(key) ?? [];
      arr.push(l);
      map.set(key, arr);
    }
    return Array.from(map.entries()).sort(([a],[b]) => a.localeCompare(b));
  }, [lessons]);

  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary fixed-top">
        <div className="container-fluid">
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav"
                  aria-controls="navbarNav" aria-expanded={false} aria-label="Alternar navegação">
            <span className="navbar-toggler-icon"></span>
          </button>

        <Link className="navbar-brand fw-bold" to="/agenda">
            <i className="bi bi-person-badge-fill me-2"></i>Portal do Professor
          </Link>

          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav ms-auto align-items-lg-center gap-2">
              <li className="nav-item">
                <button className="btn btn-light btn-sm d-none d-lg-inline-flex" onClick={goLogout}>
                  <i className="bi bi-box-arrow-right me-1"></i>Sair
                </button>
              </li>
              <li className="nav-item dropdown">
                <a className="nav-link dropdown-toggle text-white" href="#" id="userMenu" role="button"
                   data-bs-toggle="dropdown" aria-expanded={false}>
                  <i className="bi bi-person-circle me-1"></i>{displayName}
                </a>
                <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="userMenu">
                  <li><a className="dropdown-item" href="#"><i className="bi bi-person me-2"></i>Meu Perfil</a></li>
                  <li><a className="dropdown-item" href="#"><i className="bi bi-gear me-2"></i>Configurações</a></li>
                  <li><hr className="dropdown-divider" /></li>
                  <li>
                    <button className="dropdown-item" onClick={goLogout}>
                      <i className="bi bi-box-arrow-right me-2"></i>Sair
                    </button>
                  </li>
                </ul>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      <div className="container-fluid">
        <div className="row">
          <nav id="sidebar" className="col-md-3 col-lg-2 d-md-block sidebar collapse">
            <div className="position-sticky pt-3">
              <ul className="nav flex-column">
                <li className="nav-item"><span className="nav-link active"><i className="bi bi-calendar-week me-2"></i>Agenda</span></li>
              </ul>
              <h6 className="sidebar-heading d-flex justify-content-between align-items-center px-3 mt-4 mb-1 text-muted">
                <span>Ações rápidas</span>
              </h6>
              <ul className="nav flex-column mb-2">
                <li className="nav-item"><a className="nav-link" href="#form"><i className="bi bi-plus-circle me-2"></i>Nova aula</a></li>
              </ul>
            </div>
          </nav>

          <main className="col-md-9 ms-sm-auto col-lg-10 px-md-4 main-content">
            <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
              <h1 className="h2 mb-0">Agenda de Aulas</h1>
              <button className="btn btn-outline-secondary btn-sm d-lg-none" onClick={goLogout}>
                <i className="bi bi-box-arrow-right me-1"></i>Sair
              </button>
            </div>

            <div id="form" className="card shadow-sm day-panel-card mb-4">
              <div className="card-header">
                <h5 className="mb-0">Nova aula</h5>
              </div>
              <div className="card-body">
                {msg && <div className="agenda-alert">{msg}</div>}
                <form onSubmit={addLesson} className="form-grid">
                  <div>
                    <label className="agenda-label">Aluno</label>
                    <input className="agenda-input" type="text" placeholder="Nome do aluno"
                           value={student} onChange={(e) => setStudent(e.target.value)} required />
                  </div>
                  <div>
                    <label className="agenda-label">Data</label>
                    <input className="agenda-input" type="date" value={dateStr}
                           onChange={(e) => setDateStr(e.target.value)} required />
                  </div>
                  <div>
                    <label className="agenda-label">Hora</label>
                    <input className="agenda-input" type="time" value={timeStr}
                           onChange={(e) => setTimeStr(e.target.value)} required />
                  </div>
                  <div>
                    <label className="agenda-label">Local</label>
                    <input className="agenda-input" type="text" placeholder="Sala 12 / Online / Biblioteca..."
                           value={location} onChange={(e) => setLocation(e.target.value)} required />
                  </div>

                  <div className="form-actions">
                    <button className="agenda-btn" type="submit" disabled={saving}>
                      {saving ? 'Salvando…' : 'Adicionar'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <div className="card shadow-sm day-panel-card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Suas aulas</h5>
              </div>
              <div className="card-body">
                {loadingList ? (
                  <div className="text-muted small">Carregando…</div>
                ) : lessons.length === 0 ? (
                  <div className="text-muted small">Nenhuma aula cadastrada. Adicione acima.</div>
                ) : (
                  <div className="task-list">
                    {groups.map(([day, items]) => (
                      <div key={day} className="day-group">
                        <div className="day-title">
                          {ymdToSafeDate(day).toLocaleDateString('pt-BR', {
                            weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric'
                          })}
                          {/* Se quiser forçar +1 dia no visual, troque por:
                          {ymdToSafeDatePlusOne(day).toLocaleDateString('pt-BR', {...})}
                          */}
                        </div>
                        {items.map((l) => {
                          const tm = fmtTimeLocal(l.start_time);
                          return (
                            <div key={l.id} className="task-card">
                              <div className="task-main">
                                <div className="task-title">
                                  {l.student_name}
                                  <span className="task-time"> • {tm}</span>
                                </div>
                                <div className="task-sub">{l.location}</div>
                              </div>
                              <div className="task-actions">
                                <button className="task-delete" onClick={() => removeLesson(l.id)}>
                                  <i className="bi bi-trash"></i>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </main>
        </div>
      </div>
    </>
  );
}
