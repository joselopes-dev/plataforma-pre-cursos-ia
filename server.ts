import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import express from 'express';
import { createExpressApp } from './src/server/app.ts';
import { seedAllCourseMaterials } from './src/server/seed-course-materials.ts'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function makePdfBuffer(titulo: string) {
  const text = `Material - ${titulo}`;
  return Buffer.from(`%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>>>>>>endobj
4 0 obj<</Length 100>>stream
BT /F1 24 Tf 50 700 Td (${text}) Tj ET
endstream endobj
xref 0 5
trailer<</Size 5/Root 1 0 R>>
startxref 0
%%EOF`);
}

async function startServer() {
  try {
    seedAllCourseMaterials();
  } catch (err) {
    console.warn('⚠️ Aviso no seed:', err);
  }

  const app = createExpressApp();
  const PORT = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  // Pasta base onde vamos garantir que os arquivos existem
  const baseCursosDir = path.resolve(__dirname, 'public/cursos');
  if (!fs.existsSync(baseCursosDir)) fs.mkdirSync(baseCursosDir, { recursive: true });

  // MIDDLEWARE MÁGICO: se pedir um arquivo que não existe, ele cria na hora
  app.use('/cursos', (req, res, next) => {
    const requestedPath = path.join(baseCursosDir, req.path);
    
    if (!fs.existsSync(requestedPath)) {
      // Se for uma pasta que não existe, cria a pasta
      const dir = path.dirname(requestedPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      // Se for PDF, cria PDF fake
      if (req.path.endsWith('.pdf')) {
        fs.writeFileSync(requestedPath, makePdfBuffer(req.path));
        console.log(`[Cursos] Criado na hora: ${requestedPath}`);
      }
      // Se for MP4, cria video fake
      if (req.path.endsWith('.mp4')) {
        fs.writeFileSync(requestedPath, 'FAKE VIDEO - TROCAR POR VIDEO REAL');
        console.log(`[Cursos] Criado na hora: ${requestedPath}`);
      }
    }
    next();
  });

  // Agora serve os arquivos (todos os lugares possíveis)
  const possibleCursosDirs = [
    baseCursosDir,
    path.resolve(__dirname, 'src/public/cursos'),
    path.resolve(__dirname, 'dist/public/cursos'),
  ];
  for (const dir of possibleCursosDirs) {
    if (fs.existsSync(dir)) {
      app.use('/cursos', express.static(dir));
    }
  }

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
        app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'API não encontrada' });
      if (req.path.startsWith('/cursos/')) return next();
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🎓 CAMPOS IA ativa em ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('❌ Falha fatal:', err);
  process.exit(1);
});