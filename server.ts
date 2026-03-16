import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { nanoid } from 'nanoid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  const DATA_DIR = path.join(__dirname, 'data');
  const QUIZZES_FILE = path.join(DATA_DIR, 'quizzes.json');
  const RESULTS_FILE = path.join(DATA_DIR, 'results.json');

  // Ensure data directory and files exist
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      await fs.access(QUIZZES_FILE);
    } catch {
      await fs.writeFile(QUIZZES_FILE, JSON.stringify([]));
    }
    try {
      await fs.access(RESULTS_FILE);
    } catch {
      await fs.writeFile(RESULTS_FILE, JSON.stringify([]));
    }
  } catch (err) {
    console.error('Error initializing data directory:', err);
  }

  // API Routes
  app.get('/api/quizzes', async (req, res) => {
    try {
      const data = await fs.readFile(QUIZZES_FILE, 'utf-8');
      res.json(JSON.parse(data));
    } catch (error) {
      res.status(500).json({ error: 'Failed to read quizzes' });
    }
  });

  app.get('/api/quizzes/:id', async (req, res) => {
    try {
      const data = await fs.readFile(QUIZZES_FILE, 'utf-8');
      const quizzes = JSON.parse(data);
      const quiz = quizzes.find((q: any) => q.id === req.params.id);
      if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
      res.json(quiz);
    } catch (error) {
      res.status(500).json({ error: 'Failed to read quiz' });
    }
  });

  app.post('/api/quizzes', async (req, res) => {
    try {
      const data = await fs.readFile(QUIZZES_FILE, 'utf-8');
      const quizzes = JSON.parse(data);
      const newQuiz = {
        ...req.body,
        id: nanoid(10),
        createdAt: new Date().toISOString()
      };
      quizzes.push(newQuiz);
      await fs.writeFile(QUIZZES_FILE, JSON.stringify(quizzes, null, 2));
      res.status(201).json(newQuiz);
    } catch (error) {
      res.status(500).json({ error: 'Failed to save quiz' });
    }
  });

  app.delete('/api/quizzes/:id', async (req, res) => {
    try {
      const data = await fs.readFile(QUIZZES_FILE, 'utf-8');
      let quizzes = JSON.parse(data);
      quizzes = quizzes.filter((q: any) => q.id !== req.params.id);
      await fs.writeFile(QUIZZES_FILE, JSON.stringify(quizzes, null, 2));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete quiz' });
    }
  });

  app.get('/api/results/:quizId', async (req, res) => {
    try {
      const data = await fs.readFile(RESULTS_FILE, 'utf-8');
      const results = JSON.parse(data);
      const quizResults = results
        .filter((r: any) => r.quizId === req.params.quizId)
        .sort((a: any, b: any) => {
          if (b.score !== a.score) return b.score - a.score;
          return a.time - b.time;
        });
      res.json(quizResults);
    } catch (error) {
      res.status(500).json({ error: 'Failed to read results' });
    }
  });

  app.post('/api/results', async (req, res) => {
    try {
      const data = await fs.readFile(RESULTS_FILE, 'utf-8');
      const results = JSON.parse(data);
      const newResult = {
        ...req.body,
        id: nanoid(10),
        completedAt: new Date().toISOString()
      };
      results.push(newResult);
      await fs.writeFile(RESULTS_FILE, JSON.stringify(results, null, 2));
      res.status(201).json(newResult);
    } catch (error) {
      res.status(500).json({ error: 'Failed to save result' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
