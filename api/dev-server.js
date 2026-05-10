// Local dev shim — runs the Vercel serverless functions via Express.
// Usage: node api/dev-server.js   (then run `npm run dev` in parallel)
// In production Vercel handles /api/* automatically; this file is not deployed.
import 'dotenv/config';
import express from 'express';
import summaryHandler from './summary.js';

const app = express();
app.use(express.json());

app.all('/api/summary', (req, res) => summaryHandler(req, res));

const PORT = 3001;
app.listen(PORT, () => console.log(`API dev server on http://localhost:${PORT}`));
