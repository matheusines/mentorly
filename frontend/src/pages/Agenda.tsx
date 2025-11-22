import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

import './agenda-aulas.css';

type Lesson = {
  id: string;
  user_id: string;
  student_name: string;
  start_time: string;   // timestamptz
  start_date?: string;  // date (YYYY-MM-DD) vindo do BD
  location: string;
  value?: number;       // valor da aula
  notification_email?: string; // email para notificação
  created_at: string;
  updated_at: string;
};

function todayLocalYMD(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

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

function fmtTimeLocal(isoLike: string) {
  const d = new Date(isoLike);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function ymdToSafeDate(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  // 12:00 UTC garante que, ao converter p/ local, não “volta” o dia
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0));
}

function byStartTimeAsc(a: Lesson, b: Lesson) {
  return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
}

// Funções para gerenciar valores das aulas no localStorage
function getLessonValues(): Record<string, number> {
  try {
    const stored = localStorage.getItem('lesson_values');
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveLessonValue(lessonId: string, value: number | null) {
  const values = getLessonValues();
  if (value !== null && value > 0) {
    values[lessonId] = value;
  } else {
    delete values[lessonId];
  }
  localStorage.setItem('lesson_values', JSON.stringify(values));
}

function deleteLessonValue(lessonId: string) {
  const values = getLessonValues();
  delete values[lessonId];
  localStorage.setItem('lesson_values', JSON.stringify(values));
}

// Funções para gerenciar emails de notificação das aulas no localStorage
function getLessonEmails(): Record<string, string> {
  try {
    const stored = localStorage.getItem('lesson_emails');
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveLessonEmail(lessonId: string, email: string | null) {
  const emails = getLessonEmails();
  if (email && email.trim()) {
    emails[lessonId] = email.trim();
  } else {
    delete emails[lessonId];
  }
  localStorage.setItem('lesson_emails', JSON.stringify(emails));
}

function deleteLessonEmail(lessonId: string) {
  const emails = getLessonEmails();
  delete emails[lessonId];
  localStorage.setItem('lesson_emails', JSON.stringify(emails));
}

export default function AgendaPage() {
  const nav = useNavigate();

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
  const [value, setValue] = useState('');
  const [notificationEmail, setNotificationEmail] = useState('');
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
      
      // Carrega valores e emails do localStorage e adiciona às aulas
      const values = getLessonValues();
      const emails = getLessonEmails();
      const lessonsWithValues = (data ?? []).map((lesson: any) => ({
        ...lesson,
        value: values[lesson.id] || undefined,
        notification_email: emails[lesson.id] || undefined,
      })) as Lesson[];
      
      setLessons(lessonsWithValues);
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
        start_time: buildRFC3339WithOffset(dateStr, timeStr),
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
        // Salva o valor no localStorage se fornecido
        const lessonValue = value && value.trim() ? parseFloat(value.replace(',', '.')) : null;
        if (lessonValue && lessonValue > 0) {
          saveLessonValue(data.id, lessonValue);
        }
        
        // Salva o email de notificação se fornecido
        const email = notificationEmail && notificationEmail.trim() ? notificationEmail.trim() : null;
        if (email) {
          saveLessonEmail(data.id, email);
          
          // Envia email de notificação + agenda lembrete (backend cuida disso)
          try {
            const { data: sessionData } = await supabase.auth.getSession();
            const session = sessionData.session;

            await fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:3000'}/api/lessons/notify`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token}`,
              },
              body: JSON.stringify({
                email,
                studentName: data.student_name,
                date: dateStr,     // formato YYYY-MM-DD (direto do input)
                time: timeStr,     // formato HH:MM (direto do input)
                location: data.location,
                value: lessonValue,
              }),
            });
          } catch (emailError) {
            console.error('Erro ao enviar email:', emailError);
            // Não bloqueia a criação da aula se o email falhar
          }
        }
        
        // Adiciona o valor e email à aula antes de adicionar ao estado
        const lessonWithValue = {
          ...data,
          value: lessonValue && lessonValue > 0 ? lessonValue : undefined,
          notification_email: email || undefined,
        } as Lesson;
        
        setLessons(prev => [...prev, lessonWithValue].sort(byStartTimeAsc));
      }

      setStudent('');
      setTimeStr('09:00');
      setLocation('');
      setValue('');
      setNotificationEmail('');
    } catch (e: any) {
      console.error(e);
      setMsg(e?.message ?? 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  async function removeLesson(id: string) {
    if (!confirm('Excluir esta aula?')) return;
    const prev = lessons;
    setLessons(prev.filter(l => l.id !== id));
    try {
      const { error } = await supabase.from('lessons').delete().eq('id', id);
      if (error) throw error;
      // Remove o valor e email do localStorage também
      deleteLessonValue(id);
      deleteLessonEmail(id);
    } catch (e) {
      console.error(e);
      setMsg('Não foi possível excluir.');
      setLessons(prev); // rollback
    }
  }

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

  // Estatísticas para o dashboard
  const stats = useMemo(() => {
    const now = new Date();
    const past = lessons.filter(l => new Date(l.start_time) < now);
    const future = lessons.filter(l => new Date(l.start_time) >= now);
    const totalValue = lessons.reduce((sum, l) => sum + (l.value || 0), 0);
    const pastValue = past.reduce((sum, l) => sum + (l.value || 0), 0);
    const futureValue = future.reduce((sum, l) => sum + (l.value || 0), 0);

    return {
      total: lessons.length,
      past: past.length,
      future: future.length,
      totalValue,
      pastValue,
      futureValue,
    };
  }, [lessons]);

  // Dados para o gráfico de pizza
  const chartData = useMemo(() => {
    const COLORS = ['#10b981', '#f59e0b', '#6366f1'];
    return [
      { name: 'Aulas Realizadas', value: stats.past, color: COLORS[0] },
      { name: 'Aulas Futuras', value: stats.future, color: COLORS[1] },
    ];
  }, [stats]);

  // Próxima aula
  const nextLesson = useMemo(() => {
    const now = new Date();
    const futureLessons = lessons
      .filter(l => new Date(l.start_time) >= now)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    return futureLessons[0] || null;
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

            {/* Dashboard com Estatísticas */}
            <div className="card shadow-sm day-panel-card mb-4">
              <div className="card-header">
                <h5 className="mb-0"><i className="bi bi-graph-up me-2"></i>Dashboard</h5>
              </div>
              <div className="card-body">
                <div className="row g-4">
                  {/* Gráfico de Pizza */}
                  <div className="col-md-6 col-lg-5">
                    <h6 className="mb-3">Distribuição de Aulas</h6>
                    {stats.total > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, value, percent }) => 
                              `${name}: ${value} (${percent ? (percent * 100).toFixed(0) : 0}%)`
                            }
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-muted text-center py-5">
                        <i className="bi bi-pie-chart" style={{ fontSize: '3rem' }}></i>
                        <p className="mt-2">Nenhuma aula cadastrada</p>
                      </div>
                    )}
                  </div>

                  {/* Estatísticas */}
                  <div className="col-md-6 col-lg-7">
                    <h6 className="mb-3">Estatísticas</h6>
                    <div className="row g-3">
                      <div className="col-6">
                        <div className="stat-card">
                          <div className="stat-icon" style={{ background: '#e0f2fe', color: '#0369a1' }}>
                            <i className="bi bi-calendar-check"></i>
                          </div>
                          <div className="stat-content">
                            <div className="stat-value">{stats.total}</div>
                            <div className="stat-label">Total de Aulas</div>
                          </div>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="stat-card">
                          <div className="stat-icon" style={{ background: '#dcfce7', color: '#166534' }}>
                            <i className="bi bi-check-circle"></i>
                          </div>
                          <div className="stat-content">
                            <div className="stat-value">{stats.past}</div>
                            <div className="stat-label">Aulas Realizadas</div>
                          </div>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="stat-card">
                          <div className="stat-icon" style={{ background: '#fef3c7', color: '#92400e' }}>
                            <i className="bi bi-clock"></i>
                          </div>
                          <div className="stat-content">
                            <div className="stat-value">{stats.future}</div>
                            <div className="stat-label">Aulas Futuras</div>
                          </div>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="stat-card">
                          <div className="stat-icon" style={{ background: '#f3e8ff', color: '#6b21a8' }}>
                            <i className="bi bi-currency-dollar"></i>
                          </div>
                          <div className="stat-content">
                            <div className="stat-value">R$ {stats.totalValue.toFixed(2)}</div>
                            <div className="stat-label">Valor Total</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-top">
                      <div className="row g-2 text-muted small">
                        <div className="col-6">
                          <i className="bi bi-check-circle-fill text-success me-1"></i>
                          Recebido: <strong>R$ {stats.pastValue.toFixed(2)}</strong>
                        </div>
                        <div className="col-6">
                          <i className="bi bi-clock-fill text-warning me-1"></i>
                          A receber: <strong>R$ {stats.futureValue.toFixed(2)}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Próxima Aula - Destaque */}
            {nextLesson ? (
              <div className="next-lesson-card mb-4">
                <div className="next-lesson-header">
                  <i className="bi bi-clock-history me-2"></i>
                  <span>Próxima Aula</span>
                </div>
                <div className="next-lesson-content">
                  <div className="next-lesson-main">
                    <div className="next-lesson-student">
                      <i className="bi bi-person-circle me-2"></i>
                      <span className="next-lesson-name">{nextLesson.student_name}</span>
                    </div>
                    <div className="next-lesson-details">
                      <div className="next-lesson-detail-item">
                        <i className="bi bi-calendar-event me-2"></i>
                        <span>
                          {ymdToSafeDate(nextLesson.start_date ?? nextLesson.start_time.slice(0, 10))
                            .toLocaleDateString('pt-BR', {
                              weekday: 'long',
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric'
                            })}
                        </span>
                      </div>
                      <div className="next-lesson-detail-item">
                        <i className="bi bi-clock me-2"></i>
                        <span>{fmtTimeLocal(nextLesson.start_time)}</span>
                      </div>
                      <div className="next-lesson-detail-item">
                        <i className="bi bi-geo-alt me-2"></i>
                        <span>{nextLesson.location}</span>
                      </div>
                      {nextLesson.value && (
                        <div className="next-lesson-detail-item">
                          <i className="bi bi-currency-dollar me-2"></i>
                          <span className="next-lesson-value">R$ {nextLesson.value.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="next-lesson-time-remaining">
                    {(() => {
                      const now = new Date();
                      const lessonDate = new Date(nextLesson.start_time);
                      const diff = lessonDate.getTime() - now.getTime();
                      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                      
                      if (days > 0) {
                        return `${days} ${days === 1 ? 'dia' : 'dias'} e ${hours}h`;
                      } else if (hours > 0) {
                        return `${hours}h e ${minutes}min`;
                      } else {
                        return `${minutes}min`;
                      }
                    })()}
                    <span className="next-lesson-time-label"> restantes</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="next-lesson-card mb-4 next-lesson-empty">
                <div className="next-lesson-content text-center py-4">
                  <i className="bi bi-calendar-x" style={{ fontSize: '3rem', color: '#9ca3af' }}></i>
                  <p className="mt-3 mb-0 text-muted">Nenhuma aula agendada</p>
                </div>
              </div>
            )}

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
                  <div>
                    <label className="agenda-label">Valor (R$)</label>
                    <input className="agenda-input" type="number" step="0.01" min="0" placeholder="0.00"
                           value={value} onChange={(e) => setValue(e.target.value)} />
                  </div>
                  <div>
                    <label className="agenda-label">Email para Notificação</label>
                    <input className="agenda-input" type="email" placeholder="aluno@exemplo.com"
                           value={notificationEmail} onChange={(e) => setNotificationEmail(e.target.value)} />
                    <small className="text-muted" style={{ fontSize: '11px', display: 'block', marginTop: '4px' }}>
                      Enviaremos um email quando a aula for criada e um lembrete 1 dia antes
                    </small>
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
                                  {l.value && (
                                    <span className="task-value"> • R$ {l.value.toFixed(2)}</span>
                                  )}
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
