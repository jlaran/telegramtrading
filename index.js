require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.{API_KEY};
const BOT_TOKEN = process.env.{TELEGRAM_BOT_TOKEN};
const CHANNEL_ID = process.env.{TELEGRAM_CHANNEL_ID};

// Importante: usar texto plano para compatibilidad con MT5
app.use(express.text({ type: "*/*" }));

// Middleware de API Key
app.use((req, res, next) => {
  const key = req.headers['x-api-key'];
  if (!key || key !== API_KEY) {
    res.setHeader('Content-Type', 'text/plain');
    return res.status(403).send('Unauthorized');
  }
  next();
});

app.post('/send-message', async (req, res) => {
    try {
      const raw = req.body;
  
      // Depuración
      console.log("🟡 Body crudo:", raw);
      const buffer = Buffer.from(raw);
      console.log("🔎 Bytes recibidos:", buffer);
  
      const cleaned = raw.trim().replace(/\uFEFF/g, '');
  
      const data = JSON.parse(cleaned);
      const message = data.message;  // ✅ const permitida aquí
  
      if (!message) {
        res.setHeader('Content-Type', 'text/plain');
        return res.status(400).send('Missing message');
      }
  
      // ✅ Enviar a Telegram
      await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        chat_id: CHANNEL_ID,
        text: message,
        parse_mode: "HTML"
      });
  
      res.setHeader('Content-Type', 'text/plain');
      res.status(200).send('OK');
    } catch (err) {
      console.error('❌ Error al parsear JSON o enviar:', err.message);
      res.setHeader('Content-Type', 'text/plain');
      res.status(400).send('Invalid JSON');
    }
});
    

app.listen(PORT, () => {
  console.log(`🚀 API funcionando en http://localhost:${PORT}`);
});
