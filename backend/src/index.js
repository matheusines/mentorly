// backend/src/index.js
import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import nodemailer from 'nodemailer';
import { requireAuth } from './authMiddleware.js';

const app = express();
app.use(cors({ origin: ['http://localhost:5173'] }));
app.use(express.json());

// Configurar transporter de email
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true para 465, false para outras portas
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ===== Helpers para e-mail / lembrete =====
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Junta data + hora em um objeto Date
// Aqui estou assumindo que o front manda "YYYY-MM-DD" e "HH:MM".
// Se estiver vindo em outro formato (ex: "21/11/2025"), depois a gente adapta.
function buildLessonDateTime(dateStr, timeStr) {
  return new Date(`${dateStr}T${timeStr}:00`);
}

// E-mail principal de confirmação de agendamento
function createLessonMailOptions({ email, studentName, date, time, location, value }) {
  const valueText = value ? `\nValor: R$ ${parseFloat(value).toFixed(2)}` : '';

  return {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: `Aula agendada - ${studentName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .info-box { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #667eea; }
          .info-label { font-weight: bold; color: #667eea; margin-bottom: 5px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📚 Aula Agendada!</h1>
          </div>
          <div class="content">
            <p>Olá!</p>
            <p>Uma nova aula foi agendada com os seguintes detalhes:</p>
            
            <div class="info-box">
              <div class="info-label">👤 Aluno:</div>
              <div>${studentName}</div>
            </div>
            
            <div class="info-box">
              <div class="info-label">📅 Data:</div>
              <div>${date}</div>
            </div>
            
            <div class="info-box">
              <div class="info-label">🕐 Horário:</div>
              <div>${time}</div>
            </div>
            
            <div class="info-box">
              <div class="info-label">📍 Local:</div>
              <div>${location}</div>
            </div>
            
            ${value ? `
            <div class="info-box">
              <div class="info-label">💰 Valor:</div>
              <div>R$ ${parseFloat(value).toFixed(2)}</div>
            </div>
            ` : ''}
            
            <p style="margin-top: 20px;">Nos vemos em breve!</p>
            
            <div class="footer">
              <p>Este é um email automático do sistema Mentorly.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Aula Agendada!

Uma nova aula foi agendada com os seguintes detalhes:

Aluno: ${studentName}
Data: ${date}
Horário: ${time}
Local: ${location}${valueText}

Nos vemos em breve!

---
Este é um email automático do sistema Mentorly.
    `,
  };
}

// E-mail de lembrete (1 dia antes)
function createReminderMailOptions({ email, studentName, date, time, location, value }) {
  const valueText = value ? `\nValor: R$ ${parseFloat(value).toFixed(2)}` : '';

  return {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: `Lembrete de aula - ${studentName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .info-box { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #667eea; }
          .info-label { font-weight: bold; color: #667eea; margin-bottom: 5px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Lembrete de Aula</h1>
          </div>
          <div class="content">
            <p>Olá!</p>
            <p>Este é um lembrete da sua aula agendada para amanhã:</p>
            
            <div class="info-box">
              <div class="info-label">👤 Aluno:</div>
              <div>${studentName}</div>
            </div>
            
            <div class="info-box">
              <div class="info-label">📅 Data:</div>
              <div>${date}</div>
            </div>
            
            <div class="info-box">
              <div class="info-label">🕐 Horário:</div>
              <div>${time}</div>
            </div>
            
            <div class="info-box">
              <div class="info-label">📍 Local:</div>
              <div>${location}</div>
            </div>
            
            ${value ? `
            <div class="info-box">
              <div class="info-label">💰 Valor:</div>
              <div>R$ ${parseFloat(value).toFixed(2)}</div>
            </div>
            ` : ''}
            
            <p style="margin-top: 20px;">Qualquer dúvida, é só responder este email.</p>
            
            <div class="footer">
              <p>Este é um email automático do sistema Mentorly.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Lembrete de Aula

Lembrete da sua aula agendada:

Aluno: ${studentName}
Data: ${date}
Horário: ${time}
Local: ${location}${valueText}

Qualquer dúvida, é só responder este email.

---
Este é um email automático do sistema Mentorly.
    `,
  };
}

// ========= Rotas =========

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

// Endpoint para enviar notificação de aula + agendar lembrete
app.post('/api/lessons/notify', requireAuth, async (req, res) => {
  try {
    const { email, studentName, date, time, location, value } = req.body;

    if (!email || !studentName || !date || !time || !location) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('SMTP não configurado. Email não será enviado.');
      return res.json({ message: 'Email não configurado', sent: false });
    }

    // 1) Envio imediato – confirmação da aula
    const mailOptions = createLessonMailOptions({
      email,
      studentName,
      date,
      time,
      location,
      value,
    });

    await transporter.sendMail(mailOptions);

    // 2) Agendar lembrete 1 dia antes (em memória)
    const lessonDateTime = buildLessonDateTime(date, time);
    const now = Date.now();
    const whenToSend = lessonDateTime.getTime() - ONE_DAY_MS;
    const delayMs = whenToSend - now;

    if (delayMs > 0) {
      const reminderOptions = createReminderMailOptions({
        email,
        studentName,
        date,
        time,
        location,
        value,
      });

      setTimeout(() => {
        transporter
          .sendMail(reminderOptions)
          .then(() => console.log('Lembrete enviado para', email))
          .catch((err) => console.error('Erro ao enviar lembrete:', err));
      }, delayMs);
    } else {
      console.log('Aula em menos de 24h ou já passou, não agendando lembrete.');
    }

    res.json({
      message: 'Email enviado com sucesso',
      sent: true,
      reminderScheduled: delayMs > 0,
    });
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    res.status(500).json({ error: 'Erro ao enviar email', details: error.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API em http://localhost:${port}`));
