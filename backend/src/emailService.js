// backend/src/emailService.js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function formatDateTime(date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(date);
}

function buildNewLessonEmail({ studentName, teacherName, dateTime, location }) {
  const formatted = formatDateTime(dateTime);

  return {
    subject: "Nova aula agendada ✅",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>Olá, ${studentName}!</h2>
        <p>Sua aula foi agendada com <strong>${teacherName}</strong>.</p>
        <p>
          <strong>Data e horário:</strong> ${formatted}<br/>
          <strong>Local:</strong> ${location}
        </p>
        <p>Você receberá um lembrete um dia antes da aula 😉</p>
        <hr/>
        <p>Mentorly – Portal do Professor</p>
      </div>
    `,
  };
}

function buildReminderEmail({ studentName, teacherName, dateTime, location }) {
  const formatted = formatDateTime(dateTime);

  return {
    subject: "Lembrete de aula para amanhã 📚",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>Olá, ${studentName}!</h2>
        <p>Esse é um lembrete da sua aula com <strong>${teacherName}</strong>.</p>
        <p>
          <strong>Data e horário:</strong> ${formatted}<br/>
          <strong>Local:</strong> ${location}
        </p>
        <p>Qualquer dúvida, é só responder este e-mail.</p>
        <hr/>
        <p>Mentorly – Portal do Professor</p>
      </div>
    `,
  };
}

async function sendNewLessonEmail({ to, studentName, teacherName, dateTime, location }) {
  const { subject, html } = buildNewLessonEmail({
    studentName,
    teacherName,
    dateTime,
    location,
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
  });
}

async function sendReminderEmail({ to, studentName, teacherName, dateTime, location }) {
  const { subject, html } = buildReminderEmail({
    studentName,
    teacherName,
    dateTime,
    location,
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
  });
}

module.exports = {
  sendNewLessonEmail,
  sendReminderEmail,
};
