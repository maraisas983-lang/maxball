import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  
  // Serve index.html for all routes
  if (req.method === 'GET') {
    try {
      const filePath = path.join(ROOT, 'index.html');
      const content = fs.readFileSync(filePath, 'utf-8');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(200).send(content);
    } catch (error) {
      res.status(404).send('Not found');
    }
  } else {
    res.status(405).send('Method not allowed');
  }
}
