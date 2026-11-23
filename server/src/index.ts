import fs from 'node:fs';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import { config } from './config.js';
import { attachUser } from './auth.js';
import { authRouter } from './routes/auth.js';
import { puzzlesRouter, rushRouter } from './routes/puzzles.js';
import { leaderboardRouter, statsRouter } from './routes/stats.js';
import { dataset } from './puzzles.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '64kb' }));
app.use(attachUser);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, puzzles: dataset.size, uptime: process.uptime() });
});

app.use('/api/auth', authRouter);
app.use('/api/puzzles', puzzlesRouter);
app.use('/api/rush', rushRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api', statsRouter);

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'not-found' });
});

// ---- serve the built React app (single-port production / preview mode) ----
const indexHtml = path.join(config.clientDist, 'index.html');
if (fs.existsSync(indexHtml)) {
  app.use(express.static(config.clientDist, { maxAge: '1h', index: false }));
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') return next();
    res.sendFile(indexHtml);
  });
} else {
  app.get('/', (_req, res) => {
    res
      .status(200)
      .type('html')
      .send(
        `<body style="font-family:system-ui;background:#262421;color:#eee;padding:40px">
           <h1>Puzzle Arena API</h1>
           <p>The client bundle was not found. Run <code>npm run build</code>, or start the Vite dev server
           with <code>npm run dev</code>.</p>
           <p><a style="color:#81b64c" href="/api/health">/api/health</a></p>
         </body>`,
      );
  });
}

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[error]', err);
  const message = err instanceof Error ? err.message : 'unexpected error';
  res.status(500).json({ error: 'server-error', message });
});

app.listen(config.port, config.host, () => {
  console.log(`♟  Puzzle Arena API on http://${config.host}:${config.port}  (${dataset.size} puzzles)`);
});
