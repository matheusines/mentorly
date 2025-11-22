// backend/src/lessonsRoutes.js
const express = require("express");
const router = express.Router();

const supabase = require("./supabase");
const { sendNewLessonEmail, sendReminderEmail } = require("./emailService");

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function buildLessonDateTime(dateStr, timeStr) {
  // ex: "2025-11-21", "09:00"
  return new Date(`${dateStr}T${timeStr}:00`);
}

// GET /api/lessons -> lista aulas
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("lessons") // usa o nome da sua tabela de aulas
      .select("*")
      .order("date", { ascending: true });

    if (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro ao listar aulas" });
    }

    return res.json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno" });
  }
});

// POST /api/lessons -> cria aula + envia e-mail
router.post("/", async (req, res) => {
  try {
    const { studentName, studentEmail, date, time, location } = req.body;

    if (!studentName || !studentEmail || !date || !time || !location) {
      return res.status(400).json({ error: "Campos obrigatórios faltando" });
    }

    const lessonDateTime = buildLessonDateTime(date, time);

    const teacherName = req.user?.name || "Seu professor";

    const { data, error } = await supabase
      .from("lessons")
      .insert([
        {
          student_name: studentName,
          date,
          time,
          location,
          // não mexemos no schema do Supabase:
          // NÃO estamos salvando o email no banco aqui
        },
      ])
      .select()
      .single();

    if (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro ao criar aula" });
    }

    // e-mail imediato
    sendNewLessonEmail({
      to: studentEmail,
      studentName,
      teacherName,
      dateTime: lessonDateTime,
      location,
    }).catch((err) => {
      console.error("Erro ao enviar e-mail de confirmação:", err);
    });

    // lembrete em memória (1 dia antes)
    const now = Date.now();
    const whenToSend = lessonDateTime.getTime() - ONE_DAY_MS;
    const delayMs = whenToSend - now;

    if (delayMs > 0) {
      setTimeout(() => {
        sendReminderEmail({
          to: studentEmail,
          studentName,
          teacherName,
          dateTime: lessonDateTime,
          location,
        }).catch((err) => {
          console.error("Erro ao enviar e-mail de lembrete:", err);
        });
      }, delayMs);
    } else {
      console.log("Aula em menos de 24h: não agendando lembrete.");
    }

    return res.status(201).json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno" });
  }
});

// DELETE /api/lessons/:id -> apaga aula
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from("lessons")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro ao apagar aula" });
    }

    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno" });
  }
});

module.exports = router;
