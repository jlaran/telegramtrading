const express = require('express');
const axios = require('axios');
const app = express();
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;

const DB_PATH = path.join(__dirname, 'idMap.json');

// Leer archivo de forma segura
function readIdMap() {
  try {
    if (!fs.existsSync(DB_PATH)) return {};
    const content = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    console.error("❌ Error leyendo idMap.json:", err.message);
    return {};
  }
}

function deleteIdEntry(id) {
  const idMap = readIdMap();
  if (idMap[id]) {
    delete idMap[id];
    writeIdMap(idMap);
    console.log(`🗑️ Entrada con ID "${id}" eliminada.`);
    return true;
  }
  return false;
}

// Guardar archivo de forma segura
function writeIdMap(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error("❌ Error escribiendo idMap.json:", err.message);
  }
}

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
    const cleaned = raw.trim().replace(/\uFEFF/g, '');
    const data = JSON.parse(cleaned);
    const message = data.message;
    const id = data.id;
    const signalType = data.signalType;

    if (!message) {
      res.setHeader('Content-Type', 'text/plain');
      return res.status(400).send('Missing message');
    }

    const idMap = readIdMap(); // Leer el archivo actual
    let channelID = '';

    // Enviar mensaje
    if (signalType == 'deriv'){
      channelID = CHANNEL_ID_DERIV;
    } else if(signalType == 'weltrade'){
      channelID = CHANNEL_ID_WELTRADE;
    } else if(signalType == 'forex'){
      channelID = CHANNEL_ID_FOREX;
    }

    // Armar el payload del mensaje
    const payload = {
      chat_id: channelID,
      text: message,
      parse_mode: "HTML"
    };

    // Si ya existe un message_id, lo usamos como respuesta
    if (id && idMap[id]) {
      payload.reply_to_message_id = idMap[id];
    }

    const response = await axios.post(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      payload
    );

    // Si es nuevo, guardar el message_id
    if (id && !idMap[id]) {
      const messageId = response.data.result.message_id;
      idMap[id] = messageId;
      writeIdMap(idMap);
      console.log(`💾 Guardado en idMap.json: ${id} ↔ message_id ${messageId}`);
    }

    res.setHeader('Content-Type', 'text/plain');
    res.status(200).send('OK');
  } catch (err) {
    console.error('❌ Error al procesar la solicitud:', err.message);
    res.setHeader('Content-Type', 'text/plain');
    res.status(400).send('Invalid JSON');
  }
});

app.post('/delete-id', express.json(), (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).send('Falta el campo "id"');
  
  const success = deleteIdEntry(id);
  res.setHeader('Content-Type', 'text/plain');
  if (success) {
    res.send(`ID "${id}" eliminado.`);
  } else {
    res.status(404).send(`ID "${id}" no encontrado.`);
  }
});


// app.post('/send-message', async (req, res) => {
//     try {
//       const raw = req.body;
  
//       // Depuración
//       console.log("🟡 Body crudo:", raw);
//       const buffer = Buffer.from(raw);
//       console.log("🔎 Bytes recibidos:", buffer);
  
//       const cleaned = raw.trim().replace(/\uFEFF/g, '');
  
//       const data = JSON.parse(cleaned);
//       const message = data.message;  // ✅ const permitida aquí
  
//       if (!message) {
//         res.setHeader('Content-Type', 'text/plain');
//         return res.status(400).send('Missing message');
//       }
  
//       // ✅ Enviar a Telegram
//       await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
//         chat_id: CHANNEL_ID,
//         text: message,
//         parse_mode: "HTML"
//       });
  
//       res.setHeader('Content-Type', 'text/plain');
//       res.status(200).send('OK');
//     } catch (err) {
//       console.error('❌ Error al parsear JSON o enviar:', err.message);
//       res.setHeader('Content-Type', 'text/plain');
//       res.status(400).send('Invalid JSON');
//     }
// });
    
app.listen(PORT, () => {
  console.log(`🚀 API funcionando en http://localhost:${PORT}`);
});
