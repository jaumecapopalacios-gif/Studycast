import express from 'express';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
app.use(express.static(__dirname));

const GROQ_KEY = process.env.GROQ_API_KEY;

// 1. Generar Exámenes
app.post('/api/quiz', async (req, res) => {
  const { topic } = req.body;
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + GROQ_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: 'Devuelves SOLO un array JSON válido, sin markdown, con este formato exacto: [{"q":"pregunta","a":"correcta","opts":["opción1","opción2","opción3"]}]' },
          { role: 'user', content: 'Genera 5 preguntas de examen de inglés sobre: ' + topic }
        ]
      })
    });
    const data = await r.json();
    let text = data.choices[0].message.content.trim().replace(/```json|```/g, '');
    res.json({ questions: JSON.parse(text) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 2. Generar Podcasts
app.post('/api/podcast', async (req, res) => {
  const { topic } = req.body;
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + GROQ_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: 'Eres un profesor de inglés. Crea un diálogo corto de 6 líneas entre un "Host" (presentador) y un "Teacher" (profesor). Devuelve SOLO JSON válido: [{"who":"Host","text":"..."}, {"who":"Teacher","text":"..."}]' },
          { role: 'user', content: 'Crea el podcast sobre: ' + topic }
        ]
      })
    });
    const data = await r.json();
    let text = data.choices[0].message.content.trim().replace(/```json|```/g, '');
    res.json({ script: JSON.parse(text) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 3. Chat con Memoria a Largo Plazo
app.post('/api/chat', async (req, res) => {
  const { message, context, history } = req.body;
  try {
    let contextText = context ? "El alumno falló algunas preguntas del quiz: " + JSON.stringify(context) : "";
    
    let messages = [
      { 
        role: 'system', 
        content: 'Eres un tutor de inglés experto y conversacional. Responde SIEMPRE en español y luego en inglés. Usa emojis. ' +
                 'TIENES MEMORIA CONTEXTUAL. Si el usuario dice "hazme otro", "más resumido", "cámbialo", DEBES buscar en los mensajes anteriores de la conversación para saber a qué se refiere y mantener el mismo tema. ' + 
                 'No pierdas nunca el hilo de la conversación. ' + contextText 
      }
    ];

    if (history && Array.isArray(history)) {
      history.forEach(msg => {
        messages.push({ role: msg.role, content: msg.content });
      });
    }

    messages.push({ role: 'user', content: message });

    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + GROQ_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: messages
      })
    });
    
    const data = await r.json();
    res.json({ reply: data.choices[0].message.content });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
const PORT = process.env.PORT || 3000;
app.listen(PORT);
