import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { createExpressApp } from './src/server/app.ts';
import { seedAllCourseMaterials } from './src/server/seed-course-materials.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  // Inicialização do acervo didático local (PDF e texto) para o motor RAG
  try {
    seedAllCourseMaterials();
  } catch (err) {
    console.warn('⚠️ [Server] Aviso na verificação de materiais didáticos:', err);
  }

  const app = createExpressApp();
  const PORT = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  // Servir materiais didáticos (/cursos) estaticamente em desenvolvimento e produção
  const coursesDir = path.resolve(__dirname, 'public/cursos');
  app.use('/cursos', express.static(coursesDir));

  if (!isProd) {
    // Em desenvolvimento: Vite SPA middleware mode
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('⚡ [Vite] Middleware de desenvolvimento integrado ao Express.');
  } else {
    // Em produção (Render.com): serve arquivos construídos de /dist
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      // Se for uma rota de API não encontrada, responde 404 JSON ao invés da página HTML
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'Endpoint da API não encontrado.' });
      }
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
    console.log(`📦 [Prod] Servindo build estático a partir de: ${distPath}`);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🎓 CAMPOS IA ativa em http://0.0.0.0:${PORT}`);
    console.log(`🩺 Endpoint de saúde disponível em http://0.0.0.0:${PORT}/api/health`);
  });
}

startServer().catch((err) => {
  console.error('❌ Falha fatal ao iniciar o servidor:', err);
  process.exit(1);
});
