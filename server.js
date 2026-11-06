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
          { role: 'system', content: 'Devuelves SOLO JSON válido: {"questions":[{"q":"pregunta","a":"correcta","opts":["a","b","c"]}]}' },
          { role: 'user', content: 'Genera 5 preguntas sobre: ' + topic }
        ]
      })
    });
    const data = await r.json();
    let text = data.choices[0].message.content.trim().replace(/```json|```/g, '');
    res.json({ questions: JSON.parse(text).questions });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/chat', async (req, res) => {
  const { message, context } = req.body;
  
  try {
    // Si el alumno acaba de hacer un quiz, preparamos el texto con sus errores
    let contextText = "";
    if (context && context.length > 0) {
      contextText = "El alumno acaba de hacer un quiz. Aquí están los detalles de sus respuestas:\n" + 
                    JSON.stringify(context, null, 2) + 
                    "\n\nUsa esta información si el alumno te pregunta sobre sus errores o el quiz.";
    }

    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + GROQ_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [
          { 
            role: 'system', 
            content: 'Eres un examinador bilingüe. Responde en ESPAÑOL y luego en INGLÉS. Sé claro y motivador.\n\n' + contextText 
          },
          { role: 'user', content: message }
        ]
      })
    });
    
    const data = await r.json();
    res.json({ reply: data.choices[0].message.content });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
const PORT = process.env.PORT || 3000;
app.listen(PORT);
