import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const PROLOG_PATH = 'C:\\Program Files\\swipl\\bin\\swipl.exe';
const BRIDGE_PATH = path.join(__dirname, 'prolog_bridge.pl');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

function runPrologSolver(inputJson) {
  return new Promise((resolve, reject) => {
    const swipl = spawn(PROLOG_PATH, [
      '-s', BRIDGE_PATH,
      '-g', 'solve_from_json, halt.'
    ], { cwd: __dirname });

    let stdoutData = '';
    let stderrData = '';

    swipl.stdout.on('data', (chunk) => {
      stdoutData += chunk.toString();
    });

    swipl.stderr.on('data', (chunk) => {
      stderrData += chunk.toString();
    });

    swipl.on('error', (err) => {
      reject(err);
    });

    swipl.on('close', (code) => {
      // Find JSON block in stdout
      const jsonStart = stdoutData.indexOf('{');
      const jsonEnd = stdoutData.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const jsonSlice = stdoutData.slice(jsonStart, jsonEnd + 1);
        try {
          const parsed = JSON.parse(jsonSlice);
          resolve(parsed);
        } catch (e) {
          reject(new Error(`Failed to parse Prolog JSON output: ${e.message}\nRaw: ${stdoutData}`));
        }
      } else {
        if (code !== 0) {
          reject(new Error(`SWI-Prolog exited with code ${code}: ${stderrData || stdoutData}`));
        } else {
          reject(new Error(`No valid JSON output from SWI-Prolog. Output: ${stdoutData}`));
        }
      }
    });

    // Write input JSON to stdin of SWI-Prolog process
    swipl.stdin.write(JSON.stringify(inputJson) + '\n');
    swipl.stdin.end();
  });
}

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'POST' && url.pathname === '/api/solve') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const result = await runPrologSolver(payload);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: err.message
        }));
      }
    });
    return;
  }

  // Health check
  if (req.method === 'GET' && url.pathname === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', engine: 'SWI-Prolog CLP(FD)' }));
    return;
  }

  // Serve static files
  let filePath = path.join(PUBLIC_DIR, url.pathname === '/' ? 'index.html' : url.pathname);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
      }
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Exam Seating Arrangement Web Server running at http://localhost:${PORT}`);
});
