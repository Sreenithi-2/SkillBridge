/**
 * SkillBridge - Local Static Development Server
 * Zero-dependency HTTP server providing reliable origins for localStorage, cookies,
 * and session state across student and recruiter portals.
 *
 * Usage:
 *   node server.js
 *   Access at: http://localhost:3000/
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const FRONTEND_DIR = path.join(__dirname, 'frontend');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  // Strip query parameters and decode URL
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/role-selection.html';
  }

  // Normalize /frontend prefix if present so paths work with or without it
  if (reqPath.startsWith('/frontend/')) {
    reqPath = reqPath.slice('/frontend'.length);
    if (reqPath === '/' || reqPath === '') {
      reqPath = '/role-selection.html';
    }
  } else if (reqPath === '/frontend') {
    reqPath = '/role-selection.html';
  }

  // Resolve path inside frontend directory
  let filePath = path.join(FRONTEND_DIR, reqPath);

  // Security check - prevent directory traversal outside frontend
  if (!filePath.startsWith(FRONTEND_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  // Stat file
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end(`404 Not Found: ${reqPath}`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`===============================================================`);
    console.log(`  SKILLBRIDGE DEVELOPMENT SERVER STARTED                        `);
    console.log(`  URL: http://localhost:${PORT}/                                `);
    console.log(`  Recruiter Login: http://localhost:${PORT}/company-login.html   `);
    console.log(`  Student Login:   http://localhost:${PORT}/login.html           `);
    console.log(`===============================================================`);
  });
}

module.exports = server;
