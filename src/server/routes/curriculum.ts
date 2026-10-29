import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
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

// ==============================================================
// ARQUIVOS INDIVIDUAIS DA DISCIPLINA (ACERVO FÍSICO LOCAL)
// ==============================================================
curriculumRouter.get('/disciplines/:id/files', (req: Request, res: Response) => {
  const discipline = DISCIPLINES.find((d) => d.id === req.params.id);
  if (!discipline) {
    return res.status(404).json({ error: 'Componente curricular não localizado.' });
  }

  const folderPath = path.resolve(process.cwd(), 'public' + discipline.localMaterialPath);
  if (!fs.existsSync(folderPath)) {
    return res.json({
      disciplineId: discipline.id,
      disciplineCode: discipline.code,
      disciplineTitle: discipline.title,
      files: [],
    });
  }

  try {
    const fileNames = fs.readdirSync(folderPath);
    const files = fileNames
      .filter((name) => !name.startsWith('.'))
      .map((name) => {
        const fullFilePath = path.join(folderPath, name);
        const stats = fs.statSync(fullFilePath);
        const ext = path.extname(name).toLowerCase();

        let type: 'pdf' | 'text' | 'markdown' = 'text';
        if (ext === '.pdf') type = 'pdf';
        else if (ext === '.md') type = 'markdown';
        else if (ext === '.txt') type = 'text';

        // Título amigável e descrição pedagógica
        let label = name;
        let description = 'Arquivo técnico disponível no acervo acadêmico.';

        if (name === 'slides-aula-01.pdf') {
          label = 'Slides de Apresentação (Aula 01 — PDF)';
          description = 'Lâminas conceituais, diagramas de fluxo e esquemas visuais da aula.';
        } else if (name === 'apostila-aula-01.pdf') {
          label = 'Apostila Didática da Aula 01 (PDF)';
          description = 'Fundamentação teórica, tutoriais de código e exercícios práticos da aula.';
        } else if (name === 'apostila-aula-01.txt') {
          label = 'Apostila em Texto Integral (Aula 01 — TXT)';
          description = 'Versão textual pura formatada para leitura direta no navegador e acessibilidade.';
        } else if (name.startsWith('apostila-') && name.endsWith('.pdf')) {
          label = `Livro Técnico Completo da Disciplina (${discipline.code} — PDF)`;
          description = `Compêndio pedagógico integral com todas as seções e bibliografia de ${discipline.title}.`;
        } else if (name === 'material-estudo.txt' || name === 'material-estudo-experimental.txt') {
          label = 'Material Oficial de Estudo (TXT)';
          description = 'Anotações conceituais estruturadas, objetivos pedagógicos e resumo temático da disciplina.';
        } else if (name === 'README.md') {
          label = 'Ementa & Plano de Ensino Oficial (Markdown)';
          description = 'Diretrizes curriculares, competências técnicas e plano instrucional.';
        }

        const formattedSize =
          stats.size > 1024 * 1024
            ? `${(stats.size / (1024 * 1024)).toFixed(1)} MB`
            : `${Math.round(stats.size / 1024)} KB`;

        return {
          name,
          url: `${discipline.localMaterialPath}/${name}`,
          size: stats.size,
          formattedSize,
          type,
          label,
          description,
        };
      })
      .sort((a, b) => {
        // Ordena: Slides primeiro, depois Apostila Aula 01, depois Livro Completo, depois Textos e README
        const orderWeight: Record<string, number> = {
          'slides-aula-01.pdf': 1,
          'apostila-aula-01.pdf': 2,
          'apostila-aula-01.txt': 3,
        };
        const weightA = orderWeight[a.name] || (a.name.startsWith('apostila-') && a.name.endsWith('.pdf') ? 4 : 5);
        const weightB = orderWeight[b.name] || (b.name.startsWith('apostila-') && b.name.endsWith('.pdf') ? 4 : 5);
        if (weightA !== weightB) return weightA - weightB;
        return a.name.localeCompare(b.name);
      });

    return res.json({
      disciplineId: discipline.id,
      disciplineCode: discipline.code,
      disciplineTitle: discipline.title,
      localMaterialPath: discipline.localMaterialPath,
      totalFiles: files.length,
      files,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao inspecionar arquivos da disciplina: ' + err.message });
  }
});

// ==============================================================
// LEITURA DO CONTEÚDO DE ARQUIVO TEXTUAL/MARKDOWN DA DISCIPLINA
// ==============================================================
curriculumRouter.get('/disciplines/:id/file-content', (req: Request, res: Response) => {
  const discipline = DISCIPLINES.find((d) => d.id === req.params.id);
  if (!discipline) {
    return res.status(404).json({ error: 'Componente curricular não localizado.' });
  }

  const rawFilename = req.query.filename as string;
  if (!rawFilename) {
    return res.status(400).json({ error: 'Parâmetro filename obrigatório.' });
  }

  // Prevenção de Path Traversal
  const safeFilename = path.basename(rawFilename);
  const folderPath = path.resolve(process.cwd(), 'public' + discipline.localMaterialPath);
  const fullFilePath = path.join(folderPath, safeFilename);

  if (!fullFilePath.startsWith(folderPath) || !fs.existsSync(fullFilePath)) {
    return res.status(404).json({ error: 'Arquivo não encontrado no acervo da disciplina.' });
  }

  const ext = path.extname(safeFilename).toLowerCase();
  const fileUrl = `${discipline.localMaterialPath}/${safeFilename}`;

  if (ext === '.pdf') {
    return res.json({
      filename: safeFilename,
      url: fileUrl,
      type: 'pdf',
      isBinary: true,
    });
  }

  try {
    const content = fs.readFileSync(fullFilePath, 'utf8');
    const lines = content.split('\n');
    return res.json({
      filename: safeFilename,
      url: fileUrl,
      type: ext === '.md' ? 'markdown' : 'text',
      content,
      linesCount: lines.length,
      charactersCount: content.length,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao ler arquivo: ' + err.message });
  }
});

// ==============================================================
// QUESTÕES DE FIXAÇÃO PERSONALIZADAS PARA QUALQUER AULA
// ==============================================================
curriculumRouter.get('/disciplines/:id/lessons/:lessonId/quiz', (req: Request, res: Response) => {
  const discipline = DISCIPLINES.find((d) => d.id === req.params.id);
  if (!discipline) {
    return res.status(404).json({ error: 'Componente curricular não localizado.' });
  }

  const lessons = getDisciplineLessons(discipline.id);
  const currentLesson = lessons.find((l) => l.id === req.params.lessonId) || lessons[0];

  const questions = getLessonQuizQuestions(discipline, currentLesson);

  return res.json({
    disciplineId: discipline.id,
    lessonId: currentLesson.id,
    lessonTitle: currentLesson.title,
    questions,
  });
});

function getLessonQuizQuestions(discipline: any, lesson: any) {
  // Questões pedagógicas especializadas por código curricular
  const questionsMap: Record<string, any[]> = {
    'INF-101': [
      {
        question: `1. No contexto de ${discipline.title}, qual a principal vantagem do ecossistema Linux e do terminal CLI no fluxo de desenvolvimento em IA?`,
        options: [
          'Eliminar a necessidade de compilação de código.',
          'Permitir automação via scripts Bash, manipulação de processos em tempo real e orquestração de GPU.',
          'Impedir o uso de múltiplos usuários no mesmo computador.',
        ],
      },
      {
        question: `2. Em arquitetura de hardware para IA abordada na ${lesson.title}, por que Tensor Cores superam processadores de uso geral?`,
        options: [
          'Porque utilizam menor tensão elétrica apenas.',
          'Porque funcionam sem barramentos PCIe.',
          'Devido à aceleração de operações matriciais densas (GEMM) em precisão mista (FP16/BF16/INT8).',
        ],
      },
      {
        question: `3. Qual a boa prática recomendada para versionamento com Git em projetos com datasets e modelos volumosos?`,
        options: [
          'Ignorar dados e pesos no Git via .gitignore e rastreá-los com ferramentas específicas como DVC e MLflow.',
          'Armazenar arquivos binários pesados de gigabytes diretamente no repositório Git.',
          'Desativar o histórico de commits para não consumir espaço.',
        ],
      },
    ],
    'LOG-102': [
      {
        question: `1. Na disciplina de ${discipline.title}, qual a finalidade da análise de complexidade assintótica (Notação Big-O)?`,
        options: [
          'Calcular o número exato de linhas de código do programa.',
          'Mensurar o crescimento do tempo de execução e consumo de memória conforme a entrada de dados aumenta.',
          'Substituir a necessidade de escrever laços for e while.',
        ],
      },
      {
        question: `2. Ao desenvolver algoritmos estruturados na ${lesson.title}, por que a modularização em funções puras é recomendada?`,
        options: [
          'Para forçar o uso de variáveis globais em todas as partes.',
          'Porque funções puras não podem retornar valores numéricos.',
          'Para garantir testabilidade, ausência de efeitos colaterais e facilidade de manutenção.',
        ],
      },
      {
        question: `3. Como vetores e matrizes fundamentam a manipulação de dados em problemas de inteligência artificial?`,
        options: [
          'Representam tensores unidimensionais e bidimensionais que modelam dados tabulares, sinais e imagens.',
          'Servem apenas para formatar o layout gráfico de páginas web.',
          'Substituem os compiladores de código-fonte.',
        ],
      },
    ],
    'PYT-103': [
      {
        question: `1. Por que bibliotecas como NumPy e Pandas são indispensáveis no ecossistema Python para IA?`,
        options: [
          'Listas nativas de Python não aceitam strings.',
          'NumPy oferece estruturas contíguas em C com vetorização SIMD de alta velocidade e Pandas organiza DataFrames analíticos.',
          'Porque essas bibliotecas convertem automaticamente código Python para HTML.',
        ],
      },
      {
        question: `2. No contexto da ${lesson.title}, qual o papel do tratamento robusto de exceções em pipelines de dados?`,
        options: [
          'Ocultar avisos do sistema operacional para acelerar o código.',
          'Impedir que variáveis sejam reatribuídas em memória.',
          'Capturar falhas de IO, formatos inesperados e liberar conexões sem abortar rotinas de treino demoradas.',
        ],
      },
      {
        question: `3. Como o paradigma de Programação Orientada a Objetos (POO) é aplicado na modelagem de estimadores em IA?`,
        options: [
          'Encapsulando hiperparâmetros e estado em classes com métodos padronizados como fit, transform e predict.',
          'Tornando todos os atributos públicos e desprotegidos.',
          'Eliminando a necessidade de funções e métodos auxiliares.',
        ],
      },
    ],
  };

  // Se a disciplina possuir questões pré-configuradas:
  if (questionsMap[discipline.code]) {
    return questionsMap[discipline.code];
  }

  // Gerador dinâmico de alta fidelidade para os demais componentes curriculares (disc-04 a disc-20):
  return [
    {
      question: `1. No contexto do componente ${discipline.title}, qual é o princípio orientador fundamental da organização modular e estruturada?`,
      options: [
        'Eliminar a necessidade de validação e testes dos dados.',
        'Garantir desacoplamento dos módulos, reprodutibilidade técnica e manutenção escalável dos modelos.',
        'Tornar o pipeline dependente estritamente de uma única ferramenta proprietária.',
      ],
    },
    {
      question: `2. Considerando as competências técnicas da ${lesson.title}, qual a diretriz mandatória de segurança e integridade operacional?`,
      options: [
        'Expor credenciais de banco e chaves de APIs no cliente frontend.',
        'Permitir que agentes de IA alterem estados do sistema sem controle de acesso.',
        'Executar todas as chamadas críticas no servidor com tratamento rigoroso de exceções e credenciais protegidas.',
      ],
    },
    {
      question: `3. Por que a verificação de requisitos e progressão acadêmica é implementada no backend da plataforma CAMPOS IA?`,
      options: [
        'Para assegurar a integridade do percurso formativo e impedir bypass de etapas no cliente.',
        'Apenas para aumentar a latência de rede nas requisições HTTP.',
        'Porque os navegadores não suportam verificação condicional de regras.',
      ],
    },
  ];
}
