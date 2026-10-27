import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootCoursesDir = path.resolve(__dirname, '../../public/cursos');

function generateValidPDF(title: string, author: string, pages: Array<{ header: string; text: string }>): Buffer {
  const objects: string[] = [];
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj');
  const kids = pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ');
  objects.push(`2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${pages.length || 1} >>\nendobj`);

  const effectivePages = pages.length > 0 ? pages : [{ header: 'Conteudo', text: `Material didatico de ${title}` }];

  effectivePages.forEach((page, i) => {
    const pageObjNum = 3 + i * 3;
    const contentObjNum = 4 + i * 3;
    const fontObjNum = 5 + i * 3;
    objects.push(`${pageObjNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentObjNum} 0 R /Resources << /Font << /F1 ${fontObjNum} 0 R >> >> >>\nendobj`);
    
    // VERSAO LIMPA - SEM AVISO EXPERIMENTAL
    const fullText = `${title} - PAGINA ${i + 1}\n\n${page.header}\n\n${page.text}`;
    const lines = fullText.split('\n').filter(l => l.trim().length > 0);
    let streamText = 'BT\n/F1 11 Tf\n45 740 Td\n14 TL\n';
    lines.forEach((line) => {
      const words = line.split(' ');
      let currentLine = '';
      words.forEach((w) => {
        if (!currentLine) currentLine = w;
        else if ((currentLine + ' ' + w).length <= 85) currentLine += ' ' + w;
        else {
          const escaped = currentLine.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
          streamText += `(${escaped}) '\n`;
          currentLine = w;
        }
      });
      if (currentLine) {
        const escaped = currentLine.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
        streamText += `(${escaped}) '\n`;
      }
    });
    streamText += 'ET';
    const streamLen = Buffer.byteLength(streamText, 'utf8');
    objects.push(`${contentObjNum} 0 obj\n<< /Length ${streamLen} >>\nstream\n${streamText}\nendstream\nendobj`);
    objects.push(`${fontObjNum} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj`);
  });

  let body = '%PDF-1.4\n';
  const offsets: number[] = [0];
  objects.forEach((obj) => { offsets.push(Buffer.byteLength(body, 'utf8')); body += obj + '\n'; });
  const xrefOffset = Buffer.byteLength(body, 'utf8');
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(body + xref + trailer, 'utf8');
}

/** Gera conteúdo de texto simples a partir das páginas */
function generateTextContent(title: string, pages: Array<{ header: string; text: string }>): string {
  let content = `${title}\n${'='.repeat(title.length)}\n\n`;
  pages.forEach((page, i) => {
    content += `--- Página ${i + 1} ---\n`;
    content += `${page.header}\n\n`;
    content += `${page.text}\n\n`;
  });
  return content;
}

export const ALL_DISCIPLINES_MATERIALS = [
  { dir: 'modulo-1/01-fundamentos', number: '01', title: 'INF-101: Fundamentos de Informatica e Linux CLI', pages: [{ header: 'Arquitetura e Linux', text: 'Hardware, GPU, Tensor Cores, Linux CLI ls cd mkdir ps nvidia-smi, Git e venv.' }] },
  { dir: 'modulo-1/02-logica', number: '02', title: 'LOG-102: Logica de Programacao', pages: [{ header: 'Big-O e Estruturas', text: 'O1 OlogN NlogN, vetores, matrizes, funcoes puras.' }] },
  { dir: 'modulo-1/03-python', number: '03', title: 'PYTHON-103: Python Aplicado a IA', pages: [{ header: 'Python Cientifico', text: 'Listas, dicts, NumPy ndarray vetorizado, Pandas DataFrame, OOP fit predict.' }] },
  { dir: 'modulo-1/04-banco-dados', number: '04', title: 'BD-104: Bancos de Dados', pages: [{ header: 'Relacional e Vetorial', text: 'PostgreSQL ACID, MongoDB Redis pgvector RAG.' }] },
  { dir: 'modulo-1/05-matematica-estatistica', number: '05', title: 'MAT-105: Matematica e Estatistica', pages: [{ header: 'Algebra Linear', text: 'Tensores, produto escalar, SVD, PCA, Bayes.' }] },
  { dir: 'modulo-1/06-fundamentos-ia', number: '06', title: 'IA-106: Fundamentos da IA', pages: [{ header: 'Historia e Taxonomia', text: 'Turing, Dartmouth, Supervisionado, Nao Supervisionado, Reforco.' }] },
  { dir: 'modulo-2/07-python-ciencia-dados', number: '07', title: 'CD-201: Python para Ciencia de Dados', pages: [{ header: 'Pandas e Visualizacao', text: 'DataFrames, Matplotlib Seaborn, Pipeline ColumnTransformer.' }] },
  { dir: 'modulo-2/08-ml-aplicado', number: '08', title: 'MLA-202: Machine Learning Aplicado', pages: [{ header: 'Modelos', text: 'Regressao, Random Forest, XGBoost, SVM, KMeans, F1 ROC AUC.' }] },
  { dir: 'modulo-2/09-deep-learning', number: '09', title: 'DL-203: Deep Learning', pages: [{ header: 'Redes Neurais', text: 'MLP Backprop ReLU Adam Dropout CNN LSTM PyTorch.' }] },
  { dir: 'modulo-2/10-pln-chatbots', number: '10', title: 'PLN-204: PLN e Chatbots', pages: [{ header: 'PLN', text: 'TFIDF Word2Vec intents NER BLEU.' }] },
  { dir: 'modulo-2/11-metodologia', number: '11', title: 'MET-205: Metodologia Tecnica', pages: [{ header: 'ABNT', text: 'NBR 10719 Model Cards comunicacao de resultados.' }] },
  { dir: 'modulo-2/12-pratica-supervisionada-1', number: '12', title: 'PPS-206: Pratica Supervisionada I', pages: [{ header: 'CRISP-DM', text: 'Negocio Dados Preparacao Modelagem Avaliacao.' }] },
  { dir: 'modulo-3/13-seguranca-lgpd', number: '13', title: 'SEG-301: Seguranca e LGPD', pages: [{ header: 'LGPD', text: 'Finalidade Adequacao k-Anonimato Privacidade Diferencial.' }] },
  { dir: 'modulo-3/14-engenharia-software-ia', number: '14', title: 'ES-302: Engenharia de Software para IA', pages: [{ header: 'Engenharia', text: 'SOLID TDD REST Docker.' }] },
  { dir: 'modulo-3/15-mlops-deploy', number: '15', title: 'MLO-303: MLOps e Deploy', pages: [{ header: 'MLOps', text: 'MLflow Canary Blue Green Drift KS.' }] },
  { dir: 'modulo-3/16-assistentes-ia', number: '16', title: 'ASS-304: Assistentes IA', pages: [{ header: 'Agentes', text: 'ReAct Tool Use memoria Guardrails.' }] },
  { dir: 'modulo-3/17-llms-ia', number: '17', title: 'LLM-305: LLMs e IA Generativa', pages: [{ header: 'LLMs', text: 'Transformer Q K V Prompt RAG Gemini.' }] },
  { dir: 'modulo-3/18-visao-computacional', number: '18', title: 'VIS-306: Visao Computacional', pages: [{ header: 'Visao', text: 'OpenCV YOLO U-Net Data Augmentation.' }] },
  { dir: 'modulo-3/19-gestao-projetos-ia', number: '19', title: 'GP-307: Gestao de Projetos IA', pages: [{ header: 'Gestao', text: 'Agile CRISP-DM KPIs OKRs riscos.' }] },
  { dir: 'modulo-3/20-pratica-supervisionada-2', number: '20', title: 'PPS-308: Pratica Supervisionada II', pages: [{ header: 'TCC', text: 'Full Stack IA Deploy Documentacao Banca nota 7.' }] },
];

export function seedAllCourseMaterials() {
  console.log('Gerando materiais didáticos compatíveis com o frontend...');
  if (!fs.existsSync(rootCoursesDir)) {
    fs.mkdirSync(rootCoursesDir, { recursive: true });
  }

  for (const item of ALL_DISCIPLINES_MATERIALS) {
    const dirPath = path.join(rootCoursesDir, item.dir);
    fs.mkdirSync(dirPath, { recursive: true });
    const num = item.number;

    // ===== PDFs (já existiam) =====
    const apostilaPdf = generateValidPDF(item.title, 'Curso Técnico IA', item.pages);
    fs.writeFileSync(path.join(dirPath, `apostila-aula-${num}.pdf`), apostilaPdf);

    const complementarPdf = generateValidPDF(
      `${item.title} - Material Complementar`,
      'Curso Técnico IA',
      item.pages.slice(0, 1)
    );
    fs.writeFileSync(path.join(dirPath, `material-complementar-${num}.pdf`), complementarPdf);

    const refsPdf = generateValidPDF(
      `${item.title} - Referências e Exercícios`,
      'Curso Técnico IA',
      [{ header: 'Referências', text: 'Referências oficiais e exercícios de fixação.' }]
    );
    fs.writeFileSync(path.join(dirPath, `referencias-exercicios-${num}.pdf`), refsPdf);

    const slidesPdf = generateValidPDF(`${item.title} - Slides`, 'Curso Técnico IA', item.pages);
    fs.writeFileSync(path.join(dirPath, `slides-aula-${num}.pdf`), slidesPdf);

    // ===== NOVOS ARQUIVOS DE TEXTO =====

    // 1. Apostila em texto (.txt)
    const apostilaTxt = generateTextContent(item.title, item.pages);
    fs.writeFileSync(path.join(dirPath, `apostila-aula-${num}.txt`), apostilaTxt, 'utf8');

    // 2. Material de Estudo Experimental
    //    Mantém a mesma regra do frontend:
    //    - pasta 01 → material-estudo-experimental.txt
    //    - demais   → material-estudo-experimentalXX.txt
    const experimentalFileName =
      num === '01'
        ? 'material-estudo-experimental.txt'
        : `material-estudo-experimental${num}.txt`;

    const experimentalContent = [
      `Material de Estudo Experimental - ${item.title}`,
      '='.repeat(50),
      '',
      'Roteiro prático e exercícios hands-on da aula.',
      '',
      item.pages.map(p => `${p.header}\n${p.text}`).join('\n\n'),
      '',
      'Instruções:',
      '- Execute os exemplos no ambiente indicado.',
      '- Anote resultados e dúvidas para o tutor.',
    ].join('\n');

    fs.writeFileSync(path.join(dirPath, experimentalFileName), experimentalContent, 'utf8');

    // 3. README.md
    const readmeContent = [
      `# ${item.title}`,
      '',
      `Pasta: \`${item.dir}\``,
      '',
      '## Arquivos desta aula',
      '',
      `- \`video-aula-${num}.mp4\` — Vídeo-aula expositiva`,
      `- \`slides-aula-${num}.pdf\` — Lâminas de apresentação`,
      `- \`apostila-aula-${num}.pdf\` — Apostila técnica completa`,
      `- \`apostila-aula-${num}.txt\` — Versão texto da apostila`,
      `- \`material-complementar-${num}.pdf\` — Exemplos práticos`,
      `- \`referencias-exercicios-${num}.pdf\` — Referências e exercícios`,
      `- \`${experimentalFileName}\` — Roteiro experimental`,
      '',
      '## Pré-requisitos',
      '',
      '- Concluir a aula anterior (quando houver).',
      '- Ambiente de desenvolvimento configurado conforme a disciplina.',
      '',
      '## Observações',
      '',
      'Material gerado automaticamente pelo seed do projeto.',
    ].join('\n');

    fs.writeFileSync(path.join(dirPath, 'README.md'), readmeContent, 'utf8');

    console.log(`✓ ${item.dir} → PDFs + TXTs + README gerados (aula-${num})`);
  }

  console.log('\nSeed concluído com sucesso.');
  console.log('Arquivos gerados em:', rootCoursesDir);
}

// FORÇA EXECUÇÃO
seedAllCourseMaterials();