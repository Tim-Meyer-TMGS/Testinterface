const http = require('http');
const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const dataFilePath = path.join(rootDir, 'data', 'app-data.json');
const port = process.env.PORT || 8000;

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
    const raw = fs.readFileSync(dataFilePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

function writeDataFile(payload) {
  fs.writeFileSync(dataFilePath, JSON.stringify(payload, null, 2));
}

function serveStaticFile(res, requestPath) {
  const safePath = path.normalize(requestPath).replace(/^([.][.][/\\])+/g, '');
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

    const ext = path.extname(fullPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  if (pathname === '/api/data') {
    if (req.method === 'GET') {
      const data = readDataFile();
      sendJson(res, 200, data || {});
      return;
    }

    if (req.method === 'PUT') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          writeDataFile(parsed);
          sendJson(res, 200, { ok: true, savedAt: new Date().toISOString() });
        } catch (error) {
          sendJson(res, 400, { error: 'Ungültiges JSON' });
        }
      });
      return;
    }
  }

  const requestedPath = pathname === '/' ? '/index.html' : pathname;
  serveStaticFile(res, requestedPath);
});

server.listen(port, () => {
  console.log(`Server läuft auf http://localhost:${port}`);
});
