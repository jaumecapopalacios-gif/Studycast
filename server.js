import express from 'express';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json());
app.use(express.static(__dirname));

const GROQ_KEY = process.env.GROQ_API_KEY;
if (!GROQ_KEY) console.warn('⚠️ Falta GROQ_API_KEY. La IA no funcionará.');

/* ---------- Generar preguntas de examen ---------- */
app.post('/api/quiz', async (req, res) => {
  const { topic, level = 'A2-B1' } = req.body;
  if (!topic) return res.status(400).json({ error: 'Falta el tema' });

  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + GROQ_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content:
              'Eres un profesor de inglés preparando a un alumno para su examen. Devuelves SOLO JSON válido, sin texto extra, sin markdown. ' +
              'Formato exacto: {"questions":[{"q":"pregunta","a":"respuesta correcta","opts":["opción1","opción2","opción3"]}]}'
          },
          {
            role: 'user',
            content:
              'Genera 5 preguntas tipo test de nivel ' + level + ' sobre: ' + topic +
              '. Las preguntas deben estar en inglés. Cada pregunta tiene 3 opciones y una sola correcta. NO incluyas letras (A, B, C) en las opciones.'
          }
        ],
        temperature: 0.7
      })
    });

    if (!r.ok) {
      const err = await r.text();
      return res.status(500).json({ error: 'Groq error: ' + err });
    }

    const data = await r.json();
    let text = data.choices[0].message.content.trim();
    text = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(text);

    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      return res.status(500).json({ error: 'Formato inesperado de la IA' });
    }
    res.json({ questions: parsed.questions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/* ---------- Chat: El Examinador Bilingüe ---------- */
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Falta mensaje' });

  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + GROQ_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content:
              'Eres un examinador de inglés bilingüe. Estás ayudando a un estudiante a preparar su examen. ' +
              'SIEMPRE debes usar este formato en tus respuestas:\n' +
              '🇪🇸 [Explicación clara en español]\n\n' +
              '🇬🇧 [Explanation in English]\n\n' +
              'Si el alumno te pide un simulacro de examen, hazle UNA pregunta a la vez y espera su respuesta para corregirle. ' +
              'Sé estricto pero motivador.'
          },
          { role: 'user', content: message }
        ],
        temperature: 0.7
      })
    });

    const data = await r.json();
    res.json({ reply: data.choices[0].message.content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------- Servir la web ---------- */
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('✅ StudyCast en puerto ' + PORT));
