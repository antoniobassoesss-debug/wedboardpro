const http = require('http');
const fs = require('fs');
const path = require('path');

const dir = path.join(process.cwd(), 'dist', 'client');
const indexPath = path.join(dir, 'index.html');
const index = fs.existsSync(indexPath) ? fs.readFileSync(indexPath) : Buffer.from('<h1>Missing index</h1>');

const server = http.createServer((req, res) => {
  try {
    const urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath === '/' || urlPath === '') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(index);
      return;
    }

    let p = path.join(dir, urlPath);
    fs.stat(p, (err, stat) => {
      if (!err && stat.isFile()) {
        const ext = path.extname(p);
        const map = {
          '.css': 'text/css',
          '.js': 'application/javascript',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.svg': 'image/svg+xml',
          '.json': 'application/json',
          '.map': 'application/octet-stream',
        };
        res.writeHead(200, { 'Content-Type': map[ext] || 'application/octet-stream' });
        fs.createReadStream(p).pipe(res);
      } else {
        // SPA fallback
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(index);
      }
    });
  } catch (e) {
    res.writeHead(500);
    res.end('error');
  }
});

const port = process.env.PORT ? Number(process.env.PORT) : 5174;
const host = '127.0.0.1';
server.listen(port, host, () => {
  // eslint-disable-next-line no-console
  console.log(`SPA server running http://${host}:${port}`);
});




