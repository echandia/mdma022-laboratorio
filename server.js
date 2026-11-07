const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3456;
const DATA_FILE = path.join(__dirname, 'datos_salas.json');

// Load persisted rooms from disk
let db = { sessions: {} };
try {
  if (fs.existsSync(DATA_FILE)) {
    db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    if (!db || typeof db.sessions !== 'object') db = { sessions: {} };
  }
} catch (e) {
  console.error('Error loading data file:', e);
}

function saveDb() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving data file:', e);
  }
}

function ensureRoom(room, ownerUid = '') {
  if (!db.sessions[room]) {
    db.sessions[room] = {
      meta: {
        ownerUid: String(ownerUid || ''),
        createdAt: new Date().toISOString(),
        title: 'MDMA 022 · Fuentes de variabilidad',
        focus: 'explora',
        selected: [],
        active: true
      },
      teams: {}
    };
    saveDb();
  }
  return db.sessions[room];
}

// Collect all teams across all active sessions, deduplicated by normalized group name or ID
function getAllTeamsUnified() {
  const byKey = {};
  for (const [roomCode, session] of Object.entries(db.sessions)) {
    for (const [teamId, team] of Object.entries(session.teams || {})) {
      const normGroup = String(team.grupo || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
      const key = normGroup.startsWith('grupo1') ? 'grupo_1'
        : normGroup.startsWith('grupo2') ? 'grupo_2'
        : normGroup.startsWith('grupo3') ? 'grupo_3'
        : normGroup.startsWith('grupo4') ? 'grupo_4'
        : normGroup.startsWith('grupo5') ? 'grupo_5'
        : normGroup.startsWith('grupo6') ? 'grupo_6'
        : (normGroup || teamId);
      const existing = byKey[key];
      if (!existing || String(team.updatedAt || '') >= String(existing.updatedAt || '')) {
        byKey[key] = { ...(existing || {}), ...team, id: existing?.id || teamId, sala: team.sala || roomCode };
      } else {
        // Merge any non-empty fields from earlier submission of same group
        const merged = { ...team, ...existing };
        for (const [k, v] of Object.entries(team)) {
          if (!merged[k] && v) merged[k] = v;
        }
        byKey[key] = merged;
      }
    }
  }
  return Object.values(byKey);
}

// SSE clients per room: Map<roomCode, Set<res>>
const roomClients = new Map();

function broadcastAllRooms() {
  const allTeams = getAllTeamsUnified();
  for (const [room, clients] of roomClients.entries()) {
    if (!clients || !clients.size) continue;
    const session = db.sessions[room];
    const payload = JSON.stringify({
      exists: Boolean(session),
      room: session ? session.meta : null,
      teams: allTeams
    });
    for (const res of clients) {
      try {
        res.write(`data: ${payload}\n\n`);
      } catch (e) {
        clients.delete(res);
      }
    }
  }
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(body);
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const ALL_FIELDS = [
  'grupo', 'curso',
  'o1', 'o2', 'q1', 'q2',
  'unidad', 'variable', 'limite', 'fuenteContexto', 'fuenteComposicion', 'fuenteRegistro', 'fuenteMuestreo',
  'h1tipo', 'h1', 'h1m', 'h1p', 'h1e', 'h1d',
  'h2tipo', 'h2', 'h2m', 'h2p', 'h2e', 'h2d',
  'contraste', 'noAfirmar',
  'pregunta', 'poblacion', 'periodo', 'variables', 'alcance', 'datos', 'representacion', 'limitacionP', 'civica',
  'respuestaInicial', 'm1q', 'm1r', 'm1f', 'm2q', 'm2r', 'm2f', 'm3q', 'm3r', 'm3f', 'm4q', 'm4r', 'm4f', 'sesgo', 'indicador',
  'ticket1', 'ticket2', 'ticket3',
  'stage'
];

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname || '/';

  try {
    // GET /api/rooms (List active rooms sorted by newest first)
    if (req.method === 'GET' && pathname === '/api/rooms') {
      const totalTeams = getAllTeamsUnified().length;
      const list = Object.entries(db.sessions)
        .map(([code, s]) => ({
          code,
          createdAt: s.meta?.createdAt || '',
          active: s.meta?.active !== false,
          focus: s.meta?.focus || 'explora',
          teamCount: totalTeams
        }))
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
      return sendJson(res, 200, { rooms: list, teams: getAllTeamsUnified() });
    }

    // GET /api/rooms/:room/stream (Server-Sent Events)
    const streamMatch = pathname.match(/^\/api\/rooms\/([A-Z0-9]{3,12})\/stream$/i);
    if (req.method === 'GET' && streamMatch) {
      const room = streamMatch[1].toUpperCase();
      ensureRoom(room);
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
        'Access-Control-Allow-Origin': '*'
      });
      if (!roomClients.has(room)) roomClients.set(room, new Set());
      roomClients.get(room).add(res);

      const session = db.sessions[room];
      const initial = JSON.stringify({
        exists: Boolean(session),
        room: session ? session.meta : null,
        teams: getAllTeamsUnified()
      });
      res.write(`data: ${initial}\n\n`);

      const keepAlive = setInterval(() => {
        try {
          res.write(': ping\n\n');
        } catch (e) {
          clearInterval(keepAlive);
        }
      }, 20000);

      req.on('close', () => {
        clearInterval(keepAlive);
        roomClients.get(room)?.delete(res);
      });
      return;
    }

    // GET /api/rooms/:room (Snapshot poll)
    const roomMatch = pathname.match(/^\/api\/rooms\/([A-Z0-9]{3,12})$/i);
    if (req.method === 'GET' && roomMatch) {
      const room = roomMatch[1].toUpperCase();
      const session = ensureRoom(room);
      return sendJson(res, 200, {
        exists: true,
        room: session.meta,
        teams: getAllTeamsUnified()
      });
    }

    // POST /api/rooms/:room (Create room)
    if (req.method === 'POST' && roomMatch) {
      const room = roomMatch[1].toUpperCase();
      const body = await readJsonBody(req);
      const existing = db.sessions[room];
      db.sessions[room] = {
        meta: {
          ownerUid: String(body.ownerUid || existing?.meta?.ownerUid || ''),
          createdAt: existing?.meta?.createdAt || new Date().toISOString(),
          title: String(body.title || 'MDMA 022 · Fuentes de variabilidad'),
          focus: String(body.focus || existing?.meta?.focus || 'explora'),
          selected: Array.isArray(body.selected) ? body.selected.slice(0, 2) : (existing?.meta?.selected || []),
          active: body.active !== false
        },
        teams: existing?.teams || {}
      };
      saveDb();
      broadcastAllRooms();
      return sendJson(res, 200, { ok: true, room: db.sessions[room].meta });
    }

    // PATCH /api/rooms/:room (Update room focus, selected, active)
    if (req.method === 'PATCH' && roomMatch) {
      const room = roomMatch[1].toUpperCase();
      const session = ensureRoom(room);
      const body = await readJsonBody(req);
      if (typeof body.focus === 'string') session.meta.focus = body.focus;
      if (Array.isArray(body.selected)) session.meta.selected = body.selected.slice(0, 2);
      if (typeof body.active === 'boolean') session.meta.active = body.active;
      saveDb();
      broadcastAllRooms();
      return sendJson(res, 200, { ok: true, room: session.meta });
    }

    // PUT /api/rooms/:room/teams/:teamId (Publish team progress)
    const teamMatch = pathname.match(/^\/api\/rooms\/([A-Z0-9]{3,12})\/teams\/([a-zA-Z0-9_-]{1,64})$/i);
    if (req.method === 'PUT' && teamMatch) {
      const room = teamMatch[1].toUpperCase();
      const teamId = teamMatch[2];
      const session = ensureRoom(room);
      if (session.meta.active === false) {
        return sendJson(res, 403, { error: 'La sala está cerrada para entregas' });
      }
      const body = await readJsonBody(req);
      const short = (v, n = 3000) => String(v ?? '').slice(0, n);
      const prev = session.teams[teamId] || {};
      const record = {
        ...prev,
        id: teamId,
        uid: teamId,
        sala: room,
        updatedAt: body.updatedAt || new Date().toISOString()
      };
      for (const f of ALL_FIELDS) {
        if (body[f] !== undefined && String(body[f]).trim() !== '') {
          record[f] = short(body[f], f === 'grupo' ? 90 : 3000);
        } else if (record[f] === undefined) {
          record[f] = '';
        }
      }
      if (!record.grupo) record.grupo = 'Equipo sin nombre';
      if (!record.stage) record.stage = 'explora';
      session.teams[teamId] = record;
      saveDb();
      broadcastAllRooms();
      return sendJson(res, 200, { ok: true, team: record });
    }

    // Static files
    let filePath = pathname === '/' ? '/index.html' : pathname;
    filePath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
    const fullPath = path.join(__dirname, filePath);

    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      const ext = path.extname(fullPath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      });
      fs.createReadStream(fullPath).pipe(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 No encontrado');
    }
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { error: err.message || 'Error interno del servidor' });
  }
});

server.listen(PORT, () => {
  console.log(`Servidor colaborativo MDMA 022 activo en http://localhost:${PORT}`);
});
