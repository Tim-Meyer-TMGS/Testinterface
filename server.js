import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const dataFilePath = path.join(rootDir, 'data', 'app-data.json');
const port = process.env.PORT || 8000;
const allowDataWrite = process.env.ALLOW_DATA_WRITE === 'true';
const maxBodySize = 1024 * 1024;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function readDataFile() {
  try {
    return JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
  } catch {
    return null;
  }
}

function isValidPayload(payload) {
  return payload
    && typeof payload === 'object'
    && Array.isArray(payload.accounts)
    && Array.isArray(payload.bookings)
    && Array.isArray(payload.inventoryItems)
    && Array.isArray(payload.inventoryMovements);
}

function serveStaticFile(res, requestPath) {
  const safePath = path.normalize(decodeURIComponent(requestPath)).replace(/^([.][.][/\\])+/g, '');
  const fullPath = path.join(rootDir, safePath);
  if (!fullPath.startsWith(rootDir)) {
    sendJson(res, 403, { error: 'Forbidden' });
    return;
  }

  fs.readFile(fullPath, (error, content) => {
    if (error) {
      sendJson(res, 404, { error: 'Not found' });
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME_TYPES[path.extname(fullPath).toLowerCase()] || 'application/octet-stream' });
    res.end(content);
  });
}

function handlePutData(req, res) {
  if (!allowDataWrite) {
    sendJson(res, 403, { error: 'Data writes are disabled. Set ALLOW_DATA_WRITE=true for local write mode.' });
    return;
  }

  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
    if (body.length > maxBodySize) {
      req.destroy();
    }
  });
  req.on('end', () => {
    try {
      const parsed = JSON.parse(body);
      if (!isValidPayload(parsed)) {
        sendJson(res, 400, { error: 'Ungültiges Datenformat' });
        return;
      }
      fs.writeFileSync(dataFilePath, JSON.stringify(parsed, null, 2));
      sendJson(res, 200, { ok: true, savedAt: new Date().toISOString() });
    } catch {
      sendJson(res, 400, { error: 'Ungültiges JSON' });
    }
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (url.pathname === '/api/data') {
    if (req.method === 'GET') {
      sendJson(res, 200, readDataFile() || {});
      return;
    }
    if (req.method === 'PUT') {
      handlePutData(req, res);
      return;
    }
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  serveStaticFile(res, url.pathname === '/' ? '/index.html' : url.pathname);
});

server.listen(port, () => {
  console.log(`Server läuft auf http://localhost:${port}`);
  console.log(`Daten-Schreibmodus: ${allowDataWrite ? 'aktiv' : 'deaktiviert'}`);
});
