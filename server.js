import express from 'express';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
app.use(express.static(__dirname));

const GROQ_KEY = process.env.GROQ_API_KEY;

app.post('/api/quiz', async (req, res) => {
  const { topic } = req.body;
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + GROQ_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: 'Devuelves SOLO un array JSON válido: [{"q":"pregunta","a":"correcta","opts":["a","b","c"]}]' },
          { role: 'user', content: 'Genera 5 preguntas de examen sobre: ' + topic }
        ]
      })
    });
    const data = await r.json();
    let text = data.choices[0].message.content.trim().replace(/```json|```/g, '');
    res.json({ questions: JSON.parse(text) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/podcast', async (req, res) => {
  const { topic } = req.body;
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + GROQ_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: 'Crea un diálogo corto entre "Host" y "Teacher". Devuelve SOLO JSON: [{"who":"Host","text":"..."}, {"who":"Teacher","text":"..."}]' },
          { role: 'user', content: 'Crea el podcast sobre: ' + topic }
        ]
      })
    });
    const data = await r.json();
    let text = data.choices[0].message.content.trim().replace(/```json|```/g, '');
    res.json({ script: JSON.parse(text) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// CHAT CON MEMORIA A LARGO PLAZO
app.post('/api/chat', async (req, res) => {
  const { message, context, history } = req.body;
  try {
    let contextText = context ? "El alumno falló algunas preguntas del quiz: " + JSON.stringify(context) : "";
    
    let messages = [
      { 
        role: 'system', 
        content: 'Eres un tutor de inglés conversacional. Responde en español y luego en inglés. Usa emojis. ' +
                 'TIENES MEMORIA CONTEXTUAL A LARGO PLAZO. ' +
                 'Si el usuario te da una orden y luego dice cosas como "hazme otro", "más resumido", "explícalo mejor", "tradúcelo" o "cambia el tono", ' +
                 'DEBES LEER LOS MENSAJES ANTERIORES de la conversación para saber exactamente a qué tema se refiere. ' +
                 'NUNCA pierdas el hilo del tema principal que se estaba tratando. ' + contextText 
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
