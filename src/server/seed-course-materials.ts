import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function makePdf(titulo: string, tipo: string) {
  const text = `${tipo} - ${titulo}`;
  return `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>>>>>>endobj
4 0 obj<</Length 100>>stream
BT /F1 24 Tf 50 700 Td (${text}) Tj ET
endstream endobj
xref 0 5
trailer<</Size 5/Root 1 0 R>>
startxref 0





%%EOF`;
}

// MAPA OFICIAL (igual ao frontend)
const DISCIPLINES = [
  { code: 'INF-101', dir: 'modulo-1/01-fundamentos', num: '01', title: 'Fundamentos de Informática' },
  { code: 'LOG-102', dir: 'modulo-1/02-logica', num: '02', title: 'Lógica de Programação' },
  { code: 'PYTHON-103', dir: 'modulo-1/03-python', num: '03', title: 'Python Básico' },
  { code: 'BD-104', dir: 'modulo-1/04-banco-dados', num: '04', title: 'Banco de Dados' },
  { code: 'MAT-105', dir: 'modulo-1/05-matematica-estatistica', num: '05', title: 'Matemática e Estatística' },
  { code: 'IA-106', dir: 'modulo-1/06-fundamentos-ia', num: '06', title: 'Fundamentos de IA' },
  { code: 'CD-201', dir: 'modulo-2/07-python-ciencia-dados', num: '07', title: 'Python para Ciência de Dados' },
  { code: 'MLA-202', dir: 'modulo-2/08-ml-aplicado', num: '08', title: 'Machine Learning Aplicado' },
  { code: 'DL-203', dir: 'modulo-2/09-deep-learning', num: '09', title: 'Deep Learning' },
  { code: 'PLN-204', dir: 'modulo-2/10-pln-chatbots', num: '10', title: 'PLN e Chatbots' },
  { code: 'MET-205', dir: 'modulo-2/11-metodologia', num: '11', title: 'Metodologia Científica' },
  { code: 'PPS-206', dir: 'modulo-2/12-pratica-supervisionada-1', num: '12', title: 'Prática Supervisionada 1' },
  { code: 'SEG-301', dir: 'modulo-3/13-seguranca-lgpd', num: '13', title: 'Segurança e LGPD' },
  { code: 'ES-302', dir: 'modulo-3/14-engenharia-software-ia', num: '14', title: 'Engenharia de Software para IA' },
  { code: 'MLO-303', dir: 'modulo-3/15-mlops-deploy', num: '15', title: 'MLOps e Deploy' },
  { code: 'ASS-304', dir: 'modulo-3/16-assistentes-ia', num: '16', title: 'Assistentes de IA' },
  { code: 'LLM-305', dir: 'modulo-3/17-llms-ia', num: '17', title: 'LLMs e IA Generativa' },
  { code: 'VIS-306', dir: 'modulo-3/18-visao-computacional', num: '18', title: 'Visão Computacional' },
  { code: 'GP-307', dir: 'modulo-3/19-gestao-projetos-ia', num: '19', title: 'Gestão de Projetos de IA' },
  { code: 'PPS-308', dir: 'modulo-3/20-pratica-supervisionada-2', num: '20', title: 'Prática Supervisionada 2' },
];

export function seedAllCourseMaterials() {
  console.log('INICIO DO SEED - GERANDO PDF + VIDEO');

  const roots = [
    path.resolve(__dirname, '../public/cursos'),
    path.resolve(__dirname, '../../public/cursos'),
    path.resolve(__dirname, '../dist/public/cursos'),
    path.resolve(__dirname, '../../dist/public/cursos'),
    path.resolve(__dirname, 'public/cursos'),
  ];

  const uniqueRoots = [...new Set(roots)];

  for (const root of uniqueRoots) {
    if (!fs.existsSync(root)) fs.mkdirSync(root, { recursive: true });

    for (const d of DISCIPLINES) {
      const dp = path.join(root, d.dir);
      fs.mkdirSync(dp, { recursive: true });

      // PDFs
      fs.writeFileSync(path.join(dp, `apostila-aula-${d.num}.pdf`), makePdf(d.title, 'Apostila'));
      fs.writeFileSync(path.join(dp, `slides-aula-${d.num}.pdf`), makePdf(d.title, 'Slides'));
      fs.writeFileSync(path.join(dp, `material-complementar-${d.num}.pdf`), makePdf(d.title, 'Complementar'));
      fs.writeFileSync(path.join(dp, `referencias-exercicios-${d.num}.pdf`), makePdf(d.title, 'Referências'));

      // README
      fs.writeFileSync(
        path.join(dp, 'README.md'),
        `# ${d.code} - ${d.title}\n\nMaterial da disciplina.\n`
      );

      // VÍDEO (sempre cria / sobrescreve)
      const videoPath = path.join(dp, `video-aula-${d.num}.mp4`);
      fs.writeFileSync(videoPath, 'FAKE VIDEO PLACEHOLDER - TROCAR POR VIDEO REAL');
    }
  }

  console.log('SEED CONCLUIDO! 20 disciplinas com PDF + VIDEO.');
}