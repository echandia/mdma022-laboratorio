#!/usr/bin/env node
'use strict';

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 3457;
const DEFAULT_ROOM = sanitizeRoom(process.argv[2] || process.env.SALA || 'CLASE5');
const NTFY_PREFIX = 'https://ntfy.sh/mdma022_ucsc_2026_c5_';
const DATA_FILE = path.join(__dirname, 'datos_clase5.json');
const CSV_FILE = path.join(__dirname, 'respuestas_clase5.csv');
const INDEX_FILE = path.join(__dirname, 'index.html');

const ACTS = {
  feria: '1 · La feria',
  intuiciones: '2 · Intuiciones',
  interpretaciones: '3 · Interpretaciones',
  modelo: '4 · Modelo',
  simulacion: '5 · Simulación',
  rediseno: '6 · Rediseño',
  ticket: '7 · Ticket de salida'
};

const QUESTIONS = [
  { k: 'feria.decisiones', act: 'feria', label: 'Decisiones individuales y sus justificaciones' },
  { k: 'feria.significado', act: 'feria', label: 'Significado del 40 %' },
  { k: 'feria.depende', act: 'feria', label: '¿Depende solo de la probabilidad?' },
  { k: 'feria.aleatorio', act: 'feria', label: '¿Es la lluvia aleatoria?' },
  { k: 'feria._matriz', act: 'feria', label: 'Matriz de pérdidas usada' },
  { k: 'feria.consecuencias', act: 'feria', label: 'Probabilidad, consecuencias y decisión' },
  { k: 'intuiciones._urnas', act: 'intuiciones', label: 'Patrón en las urnas (ítems 1-5)' },
  { k: 'intuiciones.items', act: 'intuiciones', label: 'Ítems que discriminan estrategias' },
  { k: 'intuiciones.diferencia', act: 'intuiciones', label: 'Anticipar vs. comprender' },
  { k: 'intuiciones.ensenanza', act: 'intuiciones', label: 'Papel de la enseñanza formal' },
  { k: 'interpretaciones.A.razon', act: 'interpretaciones', label: 'Estudiante A · Razonamiento' },
  { k: 'interpretaciones.A.comprende', act: 'interpretaciones', label: 'Estudiante A · Comprende / no comprende' },
  { k: 'interpretaciones.A.pregunta', act: 'interpretaciones', label: 'Estudiante A · Pregunta docente' },
  { k: 'interpretaciones.B.razon', act: 'interpretaciones', label: 'Estudiante B · Razonamiento' },
  { k: 'interpretaciones.B.comprende', act: 'interpretaciones', label: 'Estudiante B · Comprende / no comprende' },
  { k: 'interpretaciones.B.pregunta', act: 'interpretaciones', label: 'Estudiante B · Pregunta docente' },
  { k: 'interpretaciones.C.razon', act: 'interpretaciones', label: 'Estudiante C · Razonamiento' },
  { k: 'interpretaciones.C.comprende', act: 'interpretaciones', label: 'Estudiante C · Comprende / no comprende' },
  { k: 'interpretaciones.C.pregunta', act: 'interpretaciones', label: 'Estudiante C · Pregunta docente' },
  { k: 'interpretaciones.D.razon', act: 'interpretaciones', label: 'Estudiante D · Razonamiento' },
  { k: 'interpretaciones.D.comprende', act: 'interpretaciones', label: 'Estudiante D · Comprende / no comprende' },
  { k: 'interpretaciones.D.pregunta', act: 'interpretaciones', label: 'Estudiante D · Pregunta docente' },
  { k: 'interpretaciones.E.razon', act: 'interpretaciones', label: 'Estudiante E · Razonamiento' },
  { k: 'interpretaciones.E.comprende', act: 'interpretaciones', label: 'Estudiante E · Comprende / no comprende' },
  { k: 'interpretaciones.E.pregunta', act: 'interpretaciones', label: 'Estudiante E · Pregunta docente' },
  { k: 'interpretaciones.regularidades', act: 'interpretaciones', label: 'Regularidades e incertidumbre' },
  { k: 'modelo._evento', act: 'modelo', label: 'Evento definido' },
  { k: 'modelo.supuestos', act: 'modelo', label: 'Supuestos y pérdida de información' },
  { k: 'modelo.esperanza', act: 'modelo', label: 'Interpretación de E(X)' },
  { k: 'modelo.prediccion20', act: 'modelo', label: 'Predicción para 20 jornadas' },
  { k: 'simulacion.variabilidad', act: 'simulacion', label: 'Variabilidad de Y y significado de E(Y)' },
  { k: 'simulacion.compatible', act: 'simulacion', label: 'Compatibilidad con el modelo' },
  { k: 'simulacion.phat', act: 'simulacion', label: 'Variabilidad de p̂ y de Y' },
  { k: 'simulacion.calibracion', act: 'simulacion', label: 'Calibración del pronóstico' },
  { k: 'rediseno.oa', act: 'rediseno', label: 'OA seleccionado' },
  { k: 'rediseno.enunciado', act: 'rediseno', label: 'Enunciado de la tarea' },
  { k: 'rediseno.proposito', act: 'rediseno', label: 'Propósito' },
  { k: 'rediseno.fenomeno', act: 'rediseno', label: 'Fenómeno' },
  { k: 'rediseno.modelo', act: 'rediseno', label: 'Modelo' },
  { k: 'rediseno.dificultades', act: 'rediseno', label: 'Dificultades anticipadas' },
  { k: 'rediseno.mediacion', act: 'rediseno', label: 'Mediación docente' },
  { k: 'rediseno.evidencia', act: 'rediseno', label: 'Evidencia de comprensión' },
  { k: 'rediseno.pertinencia', act: 'rediseno', label: 'Pertinencia para el nivel' }
];

function sanitizeRoom(r) {
  const clean = String(r || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 16);
  return clean || 'CLASE5';
}

// Estado persistente por sala: { rooms: { [room]: { groups:{}, tickets:{}, posts:[] } } }
let db = { rooms: {} };
try {
  if (fs.existsSync(DATA_FILE)) {
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    if (parsed && typeof parsed.rooms === 'object') db = parsed;
  }
} catch (e) {
  console.error('No se pudo leer datos_clase5.json, iniciando vacío:', e.message);
}

function getRoom(room) {
  const code = sanitizeRoom(room);
  if (!db.rooms[code]) db.rooms[code] = { groups: {}, tickets: {}, posts: [] };
  return db.rooms[code];
}

let saveTimer = null;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushDisk, 600);
}

function flushDisk() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf8');
    writeCsv();
  } catch (e) {
    console.error('Error guardando respaldo en disco:', e.message);
  }
}

function escCsv(v) {
  return '"' + String(v ?? '').replace(/"/g, '""') + '"';
}

function writeCsv() {
  const header = ['Sala', 'Grupo', 'Integrantes', 'Última actualización', ...QUESTIONS.map(q => `[${ACTS[q.act]}] ${q.label}`)];
  const lines = [header.map(escCsv).join(';')];
  const allTickets = [];

  for (const [roomCode, state] of Object.entries(db.rooms)) {
    const groups = Object.values(state.groups || {}).sort((a, b) => String(a.grupo || '').localeCompare(String(b.grupo || ''), 'es'));
    for (const g of groups) {
      const row = [
        roomCode,
        g.grupo || '',
        g.integrantes || '',
        g.updatedAt ? new Date(g.updatedAt).toISOString() : '',
        ...QUESTIONS.map(q => (g.fields && g.fields[q.k]) || '')
      ];
      lines.push(row.map(escCsv).join(';'));
    }
    for (const tk of Object.values(state.tickets || {})) {
      allTickets.push({ roomCode, ...tk });
    }
  }

  if (allTickets.length) {
    lines.push('');
    lines.push(['TICKETS INDIVIDUALES', 'Sala', 'Nombre', 'Grupo', 'Fecha', 'Concepción revelada', 'Intervención docente'].map(escCsv).join(';'));
    allTickets.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    for (const t of allTickets) {
      lines.push(['Ticket', t.roomCode, t.nombre || '', t.grupo || '', t.updatedAt ? new Date(t.updatedAt).toISOString() : '', t.concepcion || '', t.intervencion || ''].map(escCsv).join(';'));
    }
  }

  fs.writeFileSync(CSV_FILE, '\ufeff' + lines.join('\r\n'), 'utf8');
}

const sseClients = new Map(); // room -> Set<res>
function broadcast(roomCode, pkt) {
  const set = sseClients.get(roomCode);
  if (!set || !set.size) return;
  const payload = `data: ${JSON.stringify(pkt)}\n\n`;
  for (const res of set) {
    try { res.write(payload); } catch (e) { set.delete(res); }
  }
}

function mergePacket(pkt) {
  if (!pkt || typeof pkt !== 'object') return false;
  const roomCode = sanitizeRoom(pkt.r || DEFAULT_ROOM);
  const state = getRoom(roomCode);
  const ts = Number(pkt.t) || Date.now();
  let changed = false;

  if (pkt.k === 'ticket') {
    const tid = String(pkt.tid || pkt.u || ('t_' + ts));
    const prev = state.tickets[tid] || { id: tid, nombre: '', grupo: '', concepcion: '', intervencion: '', updatedAt: 0 };
    if (ts >= (prev.updatedAt || 0)) {
      state.tickets[tid] = {
        id: tid,
        nombre: String(pkt.n || prev.nombre || 'Sin nombre').slice(0, 120),
        grupo: String(pkt.g || prev.grupo || '').slice(0, 80),
        concepcion: pkt.c !== undefined ? String(pkt.c) : prev.concepcion,
        intervencion: pkt.i !== undefined ? String(pkt.i) : prev.intervencion,
        updatedAt: ts
      };
      changed = true;
    }
    if (pkt.pub && (pkt.c || pkt.i)) {
      const pid = `pub_ticket_${tid}_${ts}`;
      if (!state.posts.some(p => p.id === pid)) {
        const texto = (pkt.c ? 'Concepción revelada:\n' + pkt.c : '') + (pkt.c && pkt.i ? '\n\n' : '') + (pkt.i ? 'Intervención docente:\n' + pkt.i : '');
        state.posts.unshift({ id: pid, grupo: String(pkt.n || pkt.g || 'Estudiante'), integrantes: pkt.g || '', actividad: 'ticket', texto, ts });
        state.posts.sort((a, b) => (b.ts || 0) - (a.ts || 0));
        if (state.posts.length > 300) state.posts.length = 300;
        changed = true;
      }
    }
  } else if (pkt.k === 'live' || pkt.k === 'pub') {
    const gid = String(pkt.id || (pkt.g ? pkt.g.toLowerCase().replace(/[^a-z0-9]+/g, '_') : '') || pkt.u || '');
    if (!gid) return false;
    const prev = state.groups[gid] || { id: gid, grupo: String(pkt.g || gid), integrantes: '', fields: {}, fieldTs: {}, published: {}, updatedAt: 0 };
    if (pkt.g) prev.grupo = String(pkt.g).slice(0, 100);
    if (pkt.w && ts >= (prev.updatedAt || 0) - 60000) prev.integrantes = String(pkt.w).slice(0, 200);
    if (pkt.f && typeof pkt.f === 'object') {
      for (const [fk, fv] of Object.entries(pkt.f)) {
        const val = String(fv ?? '');
        const prevTs = prev.fieldTs[fk] || 0;
        if (ts >= prevTs && val.trim() !== '') {
          prev.fields[fk] = val;
          prev.fieldTs[fk] = ts;
          changed = true;
        }
      }
    }
    if (pkt.pub && pkt.a) {
      prev.published[pkt.a] = Math.max(prev.published[pkt.a] || 0, ts);
      const pid = `pub_${gid}_${pkt.a}_${ts}`;
      const bodyParts = [];
      QUESTIONS.filter(q => q.act === pkt.a).forEach(q => {
        if (prev.fields[q.k]) bodyParts.push(`${q.label}:\n${prev.fields[q.k]}`);
      });
      const texto = pkt.txt ? String(pkt.txt) : bodyParts.join('\n\n');
      if (texto && !state.posts.some(p => p.id === pid)) {
        state.posts.unshift({ id: pid, grupo: prev.grupo, integrantes: prev.integrantes, actividad: pkt.a, texto, ts });
        state.posts.sort((a, b) => (b.ts || 0) - (a.ts || 0));
        if (state.posts.length > 300) state.posts.length = 300;
        changed = true;
      }
    }
    if (ts > (prev.updatedAt || 0)) prev.updatedAt = ts;
    state.groups[gid] = prev;
  }

  if (changed) {
    scheduleSave();
    broadcast(roomCode, pkt);
  }
  return changed;
}

// Suscripción automática al canal ntfy.sh para respaldar en tiempo real aunque los estudiantes entren por GitHub Pages
const activeNtfyRooms = new Set();
function subscribeNtfy(roomCode) {
  const code = sanitizeRoom(roomCode);
  if (activeNtfyRooms.has(code)) return;
  activeNtfyRooms.add(code);

  const url = `${NTFY_PREFIX}${code.toLowerCase()}/sse?since=12h`;
  const connect = () => {
    const req = https.get(url, res => {
      if (res.statusCode !== 200) {
        res.resume();
        setTimeout(connect, 5000);
        return;
      }
      console.log(`✓ Escuchando sala ${code} en la nube (${NTFY_PREFIX}${code.toLowerCase()})`);
      let buf = '';
      res.setEncoding('utf8');
      res.on('data', chunk => {
        buf += chunk;
        let idx;
        while ((idx = buf.indexOf('\n')) !== -1) {
          const line = buf.slice(0, idx).trim();
          buf = buf.slice(idx + 1);
          if (!line.startsWith('data:')) continue;
          try {
            const outer = JSON.parse(line.slice(5).trim());
            if (outer && outer.event === 'message' && outer.message) {
              const pkt = JSON.parse(outer.message);
              const changed = mergePacket(pkt);
              if (changed) {
                const who = pkt.k === 'ticket' ? `Ticket (${pkt.n || 'Estudiante'})` : `${pkt.g || 'Grupo'} [${pkt.a || 'en vivo'}]`;
                console.log(`  [${new Date().toLocaleTimeString('es-CL')}] Guardado: ${who}`);
              }
            }
          } catch (e) {}
        }
      });
      res.on('end', () => setTimeout(connect, 3000));
      res.on('error', () => setTimeout(connect, 5000));
    });
    req.on('error', () => setTimeout(connect, 5000));
  };
  connect();
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', c => {
      body += c;
      if (body.length > 512 * 1024) { req.destroy(); reject(new Error('Body too large')); }
    });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (u.pathname === '/api/state' && req.method === 'GET') {
    const code = sanitizeRoom(u.searchParams.get('room') || DEFAULT_ROOM);
    subscribeNtfy(code);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(getRoom(code)));
    return;
  }

  if (u.pathname === '/api/sync' && req.method === 'POST') {
    try {
      const pkt = await readBody(req);
      const code = sanitizeRoom(pkt.r || DEFAULT_ROOM);
      subscribeNtfy(code);
      mergePacket(pkt);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
    return;
  }

  if (u.pathname === '/api/stream' && req.method === 'GET') {
    const code = sanitizeRoom(u.searchParams.get('room') || DEFAULT_ROOM);
    subscribeNtfy(code);
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    });
    res.write(':\n\n');
    if (!sseClients.has(code)) sseClients.set(code, new Set());
    sseClients.get(code).add(res);
    req.on('close', () => sseClients.get(code)?.delete(res));
    return;
  }

  if (u.pathname === '/' || u.pathname === '/index.html') {
    try {
      const html = fs.readFileSync(INDEX_FILE, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch (e) {
      res.writeHead(404); res.end('index.html no encontrado');
    }
    return;
  }

  res.writeHead(404);
  res.end('No encontrado');
});

server.listen(PORT, () => {
  console.log('\n===============================================================');
  console.log(' MDMA 022 · Clase 5 · Servidor y grabador de respuestas en vivo');
  console.log('===============================================================');
  console.log(` • Vista local docente : http://localhost:${PORT}/#muro`);
  console.log(` • Sala monitoreada    : ${DEFAULT_ROOM}`);
  console.log(` • Respaldo JSON       : ${DATA_FILE}`);
  console.log(` • Respaldo CSV Excel  : ${CSV_FILE}`);
  console.log('---------------------------------------------------------------');
  console.log(' Puedes dejar esta ventana abierta durante la clase: todo lo que');
  console.log(' escriban los grupos en GitHub Pages se guardará aquí al instante.');
  console.log('===============================================================\n');
  subscribeNtfy(DEFAULT_ROOM);
});
