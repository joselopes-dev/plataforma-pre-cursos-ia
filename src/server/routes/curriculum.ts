import { Router, Request, Response } from 'express';
import { MODULES, DISCIPLINES, getDisciplineLessons } from '../../db/seed-data.ts';

export const curriculumRouter = Router();

// Listar Módulos Acadêmicos
curriculumRouter.get('/modules', (_req: Request, res: Response) => {
  res.json({
    modules: MODULES,
    totalHours: 1000,
    modulesBreakdown: {
      modulo1: 340,
      modulo2: 320,
      modulo3: 340,
      sum: 340 + 320 + 340,
    },
  });
});

// Listar 20 Componentes Curriculares em ordem oficial
curriculumRouter.get('/disciplines', (_req: Request, res: Response) => {
  res.json({
    count: DISCIPLINES.length,
    disciplines: DISCIPLINES,
  });
});

// Detalhes de um Componente Curricular específico
curriculumRouter.get('/disciplines/:id', (req: Request, res: Response) => {
  const discipline = DISCIPLINES.find((d) => d.id === req.params.id);
  if (!discipline) {
    return res.status(404).json({ error: 'Componente curricular não localizado.' });
  }

  const lessons = getDisciplineLessons(discipline.id);

  // Retorna detalhes protegendo gabaritos
  return res.json({
    discipline,
    lessons,
    module: MODULES.find((m) => m.id === discipline.moduleId),
  });
});

// Aulas de um Componente Curricular
curriculumRouter.get('/disciplines/:id/lessons', (req: Request, res: Response) => {
  const discipline = DISCIPLINES.find((d) => d.id === req.params.id);
  if (!discipline) {
    return res.status(404).json({ error: 'Componente curricular não localizado.' });
  }

  const lessons = getDisciplineLessons(discipline.id);
  return res.json({ lessons });
});
