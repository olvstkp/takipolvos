// Basit yerel Zebra yazıcı ajanı
// HTTP POST /print { zpl: string, host: string, port: number }
// TCP Raw 9100 ile Zebra'ya gönderir

const http = require('http');
const net = require('net');

const PORT = process.env.ZEBRA_AGENT_PORT ? Number(process.env.ZEBRA_AGENT_PORT) : 18080;

function sendToZebra(host, port, zpl) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    client.setTimeout(10000);
    client.connect(port, host, () => {
      client.write(zpl, 'utf8', () => {
        // Bazı yazıcılar \n gerektirir, ZPL ^XZ ile bittiği sürece sorun olmaz
        client.end();
      });
    });
    client.on('error', reject);
    client.on('timeout', () => reject(new Error('TCP connection timeout')));
    client.on('close', hadError => {
      if (!hadError) resolve();
    });
  });
}

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/print') {
    try {
      let body = '';
      req.on('data', chunk => (body += chunk));
      req.on('end', async () => {
        try {
          const data = JSON.parse(body || '{}');
          const { zpl, host, port } = data;
          if (!zpl || !host || !port) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'zpl, host ve port zorunludur' }));
          }
          await sendToZebra(host, Number(port), zpl);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`Zebra Printer Agent listening on http://localhost:${PORT}`);
});


