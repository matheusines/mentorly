import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import './agenda-aulas.css';

type Student = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  created_at: string;
  updated_at: string;
};

export default function AlunosPage() {
  const nav = useNavigate();

  // fundo branco, mesmo esquema da Agenda
  useEffect(() => {
    document.body.classList.add('agenda');
    return () => document.body.classList.remove('agenda');
  }, []);

  const [displayName, setDisplayName] = useState('Professor');
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  // formulário
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // modo edição
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);

  function resetStudentForm() {
    setName('');
    setEmail('');
    setPhone('');
    setEditingStudentId(null);
  }

  // nome do usuário (navbar)
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const userEmail = session?.user?.email;
      const userName = (session?.user?.user_metadata as any)?.name ?? userEmail ?? 'Professor';
      setDisplayName(userName);
    })();
  }, []);

  async function loadStudents() {
    setLoadingList(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id,user_id,name,email,phone,created_at,updated_at')
        .order('name', { ascending: true });

      if (error) throw error;
      setStudents((data ?? []) as Student[]);
    } catch (e) {
      console.error(e);
      setMsg('Não foi possível carregar seus alunos.');
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    loadStudents();
  }, []);

  // realtime para students
  useEffect(() => {
    const channel = supabase
      .channel('public:students')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
        loadStudents();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  function goLogout() {
    nav('/logout');
  }

  function startEditStudent(s: Student) {
    setEditingStudentId(s.id);
    setName(s.name);
    setEmail(s.email);
    setPhone(s.phone);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEditStudent() {
    resetStudentForm();
  }

  async function addStudent(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        nav('/', { replace: true });
        return;
      }

      const base = {
        user_id: session.user.id,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
      };

      if (!base.name || !base.email || !base.phone) {
        setMsg('Preencha nome, e-mail e telefone.');
        return;
      }

      if (editingStudentId) {
        // UPDATE
        const { error } = await supabase
          .from('students')
          .update({
            name: base.name,
            email: base.email,
            phone: base.phone,
          })
          .eq('id', editingStudentId);

        if (error) throw error;

        await loadStudents();
        setEditingStudentId(null);
      } else {
        // CREATE
        const { data, error } = await supabase
          .from('students')
          .insert(base)
          .select('id,user_id,name,email,phone,created_at,updated_at')
          .single();

        if (error) throw error;

        if (data) {
          await loadStudents();
        }
      }

      resetStudentForm();
    } catch (e: any) {
      console.error(e);
      setMsg(e?.message ?? 'Erro ao salvar aluno.');
    } finally {
      setSaving(false);
    }
  }

  async function removeStudent(id: string) {
    if (!confirm('Excluir este aluno?')) return;
    const prev = students;
    setStudents(prev.filter((s) => s.id !== id));
    try {
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (error) throw error;
    } catch (e) {
      console.error(e);
      setMsg('Não foi possível excluir.');
      setStudents(prev); // rollback
    }
  }

  return (
    <>
      {/* NAVBAR */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary fixed-top">
        <div className="container-fluid">
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
            aria-controls="navbarNav"
            aria-expanded={false}
            aria-label="Alternar navegação"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          <Link className="navbar-brand fw-bold" to="/agenda">
            <i className="bi bi-person-badge-fill me-2"></i>Portal do Professor
          </Link>

          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav ms-auto align-items-lg-center gap-2">
              <li className="nav-item">
                <button
                  className="btn btn-light btn-sm d-none d-lg-inline-flex"
                  onClick={goLogout}
                >
                  <i className="bi bi-box-arrow-right me-1"></i>Sair
                </button>
              </li>
              <li className="nav-item dropdown">
                <a
                  className="nav-link dropdown-toggle text-white"
                  href="#"
                  id="userMenu"
                  role="button"
                  data-bs-toggle="dropdown"
                  aria-expanded={false}
                >
                  <i className="bi bi-person-circle me-1"></i>
                  {displayName}
                </a>
                <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="userMenu">
                  <li>
                    <a className="dropdown-item" href="#">
                      <i className="bi bi-person me-2"></i>Meu Perfil
                    </a>
                  </li>
                  <li>
                    <a className="dropdown-item" href="#">
                      <i className="bi bi-gear me-2"></i>Configurações
                    </a>
                  </li>
                  <li>
                    <hr className="dropdown-divider" />
                  </li>
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

      {/* LAYOUT PRINCIPAL */}
      <div className="container-fluid">
        <div className="row">
          {/* SIDEBAR */}
          <nav id="sidebar" className="col-md-3 col-lg-2 d-md-block sidebar collapse">
            <div className="position-sticky pt-3">
              <ul className="nav flex-column">
                <li className="nav-item">
                  <Link className="nav-link" to="/agenda">
                    <i className="bi bi-calendar-week me-2"></i>Agenda
                  </Link>
                </li>
                <li className="nav-item">
                  <span className="nav-link active">
                    <i className="bi bi-people me-2"></i>Alunos
                  </span>
                </li>
              </ul>

              <h6 className="sidebar-heading d-flex justify-content-between align-items-center px-3 mt-4 mb-1 text-muted">
                <span>Ações rápidas</span>
              </h6>
              <ul className="nav flex-column mb-2">
                <li className="nav-item">
                  <a className="nav-link" href="#form">
                    <i className="bi bi-plus-circle me-2"></i>Novo aluno
                  </a>
                </li>
              </ul>
            </div>
          </nav>

          {/* CONTEÚDO PRINCIPAL */}
          <main className="col-md-9 ms-sm-auto col-lg-10 px-md-4 main-content">
            <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
              <h1 className="h2 mb-0">Alunos</h1>
              <button
                className="btn btn-outline-secondary btn-sm d-lg-none"
                onClick={goLogout}
              >
                <i className="bi bi-box-arrow-right me-1"></i>Sair
              </button>
            </div>

            {/* FORMULÁRIO DE CADASTRO */}
            <div id="form" className="card shadow-sm day-panel-card mb-4">
              <div className="card-header">
                <h5 className="mb-0">{editingStudentId ? 'Editar aluno' : 'Novo aluno'}</h5>
              </div>
              <div className="card-body">
                {msg && <div className="agenda-alert">{msg}</div>}
                <form onSubmit={addStudent} className="form-grid">
                  <div>
                    <label className="agenda-label">Nome</label>
                    <input
                      className="agenda-input"
                      type="text"
                      placeholder="Nome do aluno"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="agenda-label">E-mail</label>
                    <input
                      className="agenda-input"
                      type="email"
                      placeholder="aluno@exemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="agenda-label">Telefone</label>
                    <input
                      className="agenda-input"
                      type="tel"
                      placeholder="(11) 99999-9999"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-actions">
                    <button className="agenda-btn" type="submit" disabled={saving}>
                      {saving
                        ? 'Salvando…'
                        : editingStudentId
                          ? 'Salvar alterações'
                          : 'Adicionar'}
                    </button>
                    {editingStudentId && (
                      <button
                        type="button"
                        className="btn btn-link btn-sm ms-2"
                        onClick={cancelEditStudent}
                      >
                        Cancelar edição
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>

            {/* LISTA DE ALUNOS */}
            <div className="card shadow-sm day-panel-card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Seus alunos</h5>
              </div>
              <div className="card-body">
                {loadingList ? (
                  <div className="text-muted small">Carregando…</div>
                ) : students.length === 0 ? (
                  <div className="text-muted small">
                    Nenhum aluno cadastrado. Adicione acima.
                  </div>
                ) : (
                  <div className="task-list">
                    {students.map((s) => (
                      <div key={s.id} className="task-card">
                        <div className="task-main">
                          <div className="task-title">
                            <i className="bi bi-person-circle me-2"></i>
                            {s.name}
                          </div>
                          <div className="task-sub">
                            <i className="bi bi-envelope me-2"></i>
                            {s.email}
                          </div>
                          <div className="task-sub">
                            <i className="bi bi-telephone me-2"></i>
                            {s.phone}
                          </div>
                        </div>
                        <div className="task-actions">
                          <button
                            className="task-edit"
                            type="button"
                            onClick={() => startEditStudent(s)}
                            title="Editar"
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            className="task-delete"
                            type="button"
                            onClick={() => removeStudent(s.id)}
                            title="Excluir"
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
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
