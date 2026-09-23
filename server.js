import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Server } from 'socket.io';
import { router } from './src/routes.js';
import { initSockets } from './src/sockets.js';

// Load PORT from .env when present (Node 20.12+). Missing file is fine.
try {
  process.loadEnvFile?.();
} catch {
  // no .env, use defaults
}

const PORT = Number(process.env.PORT) || 3000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', router);

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Errors thrown by store validation carry a `status`; body-parser sets one too.
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error(err);
  let message = status < 500 ? err.message : 'Server error';
  if (err.type === 'entity.parse.failed') message = 'Invalid JSON body';
  res.status(status).json({ error: message });
});

initSockets(io);

server.listen(PORT, () => {
  console.log(`Live Order Queue on http://localhost:${PORT}`);
  console.log(`Kitchen board:    http://localhost:${PORT}/kitchen.html`);
});
