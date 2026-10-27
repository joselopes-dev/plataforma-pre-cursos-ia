import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootCoursesDir = path.resolve(__dirname, '../../public/cursos');

/**
 * Gera um PDF 1.4 válido sem dependências externas
 */
function generateValidPDF(title: string, author: string, pages: Array<{ header: string; text: string }>): Buffer {
  const objects: string[] = [];

  // 1. Catalog
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj');

  // 2. Pages
  const kids = pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ');
  objects.push(`2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>\nendobj`);

  pages.forEach((page, i) => {
    const pageObjNum = 3 + i * 3;
    const contentObjNum = 4 + i * 3;
    const fontObjNum = 5 + i * 3;

    objects.push(
      `${pageObjNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentObjNum} 0 R /Resources << /Font << /F1 ${fontObjNum} 0 R >> >> >>\nendobj`
    );

    const disclaimerL1 = 'AVISO: MATERIAL DIDATICO EXPERIMENTAL DE DESENVOLVIMENTO';
    const disclaimerL2 = 'AGUARDANDO HOMOLOGACAO INSTITUCIONAL';
    const disclaimerL3 =
      'Este conteudo destina-se a validacao tecnica da plataforma e nao substitui apostilas oficialmente aprovadas pela instituicao.';
    const fullText = `[${title.toUpperCase()} - PAGINA ${i + 1}]\n${disclaimerL1}\n${disclaimerL2}\n${disclaimerL3}\n\n${page.header}\n\n${page.text}`;
    const lines = fullText.split('\n').filter((l) => l.trim().length > 0);

    let streamText = 'BT\n/F1 11 Tf\n45 740 Td\n15 TL\n';
    lines.forEach((line) => {
      const words = line.split(' ');
      let currentLine = '';
      words.forEach((w) => {
        if (!currentLine) {
          currentLine = w;
        } else if ((currentLine + ' ' + w).length <= 75) {
          currentLine += ' ' + w;
        } else {
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
    objects.push(
      `${fontObjNum} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj`
    );
  });

  let body = '%PDF-1.4\n';
  const offsets: number[] = [0];

  objects.forEach((obj) => {
    offsets.push(Buffer.byteLength(body, 'utf8'));
    body += obj + '\n';
  });

  const xrefOffset = Buffer.byteLength(body, 'utf8');
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    const offsetStr = String(offsets[i]).padStart(10, '0');
    xref += `${offsetStr} 00000 n \n`;
  }

  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(body + xref + trailer, 'utf8');
}

/**
 * Materiais didáticos – agora com a nomenclatura que o frontend espera
 * (apostila-aula-XX.pdf, material-complementar-XX.pdf, etc.)
 */
export const ALL_DISCIPLINES_MATERIALS = [
  // =========================================================================
  // MÓDULO I
  // =========================================================================
  {
    dir: 'modulo-1/01-fundamentos',
    number: '01',
    title: 'INF-101: Fundamentos de Informatica e Linux CLI',
    pages: [
      {
        header: 'Secao 1: Arquitetura de Hardware e Aceleracao para Inteligencia Artificial',
        text: 'Redes neurais modernas demandam operacoes massivas de algebra linear...'
      },
      {
        header: 'Secao 2: Sistemas Operacionais Linux e Terminal CLI em Ciencia de Dados',
        text: 'O terminal Linux e a interface padrao para orquestracao de experimentos...'
      },
      {
        header: 'Secao 3: Controle de Versao com Git e Ambientes Virtuais em Python',
        text: 'A reprodutibilidade cientifica em IA exige rastreamento rigoroso do codigo-fonte...'
      }
    ]
  },
  {
    dir: 'modulo-1/02-logica',
    number: '02',
    title: 'LOG-102: Logica de Programacao e Algoritmos',
    pages: [
      {
        header: 'Secao 1: Notacao Big-O e Complexidade Assintotica de Algoritmos',
        text: 'A analise assintotica mensura o crescimento do consumo de tempo e espaco...'
      },
      {
        header: 'Secao 2: Estruturas de Dados Fundamentais e Modularizacao',
        text: 'Vetores sao blocos contiguos de memoria de tamanho estatico ou dinamico...'
      }
    ]
  },
  {
    dir: 'modulo-1/03-python',
    number: '03',
    title: 'PYTHON-103: Programacao em Python Aplicada a IA',
    pages: [
      {
        header: 'Secao 1: Ecossistema Cientifico de Python e Estruturas Nativas',
        text: 'Python e a linguagem dominante no desenvolvimento de Inteligencia Artificial...'
      },
      {
        header: 'Secao 2: Computacao Vetorial com NumPy e Manipulacao com Pandas',
        text: 'A biblioteca NumPy fornece o objeto ndarray...'
      },
      {
        header: 'Secao 3: Programacao Orientada a Objetos e Tratamento Robusto de Excecoes',
        text: 'O encapsulamento em classes modela componentes de aprendizado de maquina...'
      }
    ]
  },
  {
    dir: 'modulo-1/04-banco-dados',
    number: '04',
    title: 'BD-104: Bancos de Dados Relacionais e Vetoriais',
    pages: [
      {
        header: 'Secao 1: Modelagem Relacional, Normalizacao e PostgreSQL',
        text: 'Bancos de dados relacionais como o PostgreSQL asseguram a integridade transacional...'
      },
      {
        header: 'Secao 2: Bancos NoSQL e Bancos de Dados Vetoriais para RAG e IA',
        text: 'Bancos NoSQL baseados em documentos JSON...'
      }
    ]
  },
  {
    dir: 'modulo-1/05-matematica-estatistica',
    number: '05',
    title: 'MAT-105: Matematica Computacional e Estatistica para IA',
    pages: [
      {
        header: 'Secao 1: Algebra Linear Aplicada e Multiplicacao de Matrizes',
        text: 'Tensores multidimensionais sao a base matematica de todas as representacoes neurais...'
      },
      {
        header: 'Secao 2: Estatistica Descritiva, Probabilidade e Teorema de Bayes',
        text: 'Medidas de tendencia central combinadas com medidas de dispersao...'
      }
    ]
  },
  {
    dir: 'modulo-1/06-fundamentos-ia',
    number: '06',
    title: 'IA-106: Introducao e Fundamentos da Inteligencia Artificial',
    pages: [
      {
        header: 'Secao 1: Evolucao Historica dos Paradigmas de Inteligencia Artificial',
        text: 'A Inteligencia Artificial evoluiu a partir do teste de Turing...'
      },
      {
        header: 'Secao 2: Taxonomia do Aprendizado de Maquina e Agentes Inteligentes',
        text: 'O Aprendizado de Maquina se subdivide em tres categorias centrais...'
      }
    ]
  },

  // =========================================================================
  // MÓDULO II
  // =========================================================================
  {
    dir: 'modulo-2/07-python-ciencia-dados',
    number: '07',
    title: 'CD-201: Python para Ciencia de Dados',
    pages: [ /* ... mantenha o conteúdo original ... */ ]
  },
  {
    dir: 'modulo-2/08-ml-aplicado',
    number: '08',
    title: 'MLA-202: Machine Learning Aplicado',
    pages: [ /* ... */ ]
  },
  {
    dir: 'modulo-2/09-deep-learning',
    number: '09',
    title: 'DL-203: Redes Neurais Artificiais e Deep Learning',
    pages: [ /* ... */ ]
  },
  {
    dir: 'modulo-2/10-pln-chatbots',
    number: '10',
    title: 'PLN-204: Processamento de Linguagem Natural e Chatbots',
    pages: [ /* ... */ ]
  },
  {
    dir: 'modulo-2/11-metodologia',
    number: '11',
    title: 'MET-205: Metodologia para Elaboracao de Producoes Tecnicas',
    pages: [ /* ... */ ]
  },
  {
    dir: 'modulo-2/12-pratica-supervisionada-1',
    number: '12',
    title: 'PPS-206: Pratica Profissional Supervisionada I',
    pages: [ /* ... */ ]
  },

  // =========================================================================
  // MÓDULO III
  // =========================================================================
  {
    dir: 'modulo-3/13-seguranca-lgpd',
    number: '13',
    title: 'SEG-301: Seguranca, Governanca de Dados e LGPD Aplicada',
    pages: [ /* ... */ ]
  },
  {
    dir: 'modulo-3/14-engenharia-software-ia',
    number: '14',
    title: 'ES-302: Engenharia de Software para Sistemas de IA',
    pages: [ /* ... */ ]
  },
  {
    dir: 'modulo-3/15-mlops-deploy',
    number: '15',
    title: 'MLO-303: MLOps e Praticas de Deploy Continuo',
    pages: [ /* ... */ ]
  },
  {
    dir: 'modulo-3/16-assistentes-ia',
    number: '16',
    title: 'ASS-304: Planejamento de Assistentes em Inteligencia Artificial',
    pages: [ /* ... */ ]
  },
  {
    dir: 'modulo-3/17-llms-ia',
    number: '17',
    title: 'LLM-305: LLMs e Inteligencia Artificial Generativa',
    pages: [ /* ... */ ]
  },
  {
    dir: 'modulo-3/18-visao-computacional',
    number: '18',
    title: 'VIS-306: Visao Computacional Aplicada',
    pages: [ /* ... */ ]
  },
  {
    dir: 'modulo-3/19-gestao-projetos-ia',
    number: '19',
    title: 'GP-307: Gestao de Projetos em Inteligencia Artificial',
    pages: [ /* ... */ ]
  },
  {
    dir: 'modulo-3/20-pratica-supervisionada-2',
    number: '20',
    title: 'PPS-308: Pratica Profissional Supervisionada II (TCC Aplicado)',
    pages: [ /* ... */ ]
  }
];

/**
 * Gera os PDFs com os nomes que o frontend realmente usa
 */
export function seedAllCourseMaterials() {
  console.log('Gerando materiais didáticos com nomenclatura compatível com o frontend...');

  for (const item of ALL_DISCIPLINES_MATERIALS) {
    const dirPath = path.join(rootCoursesDir, item.dir);
    fs.mkdirSync(dirPath, { recursive: true });

    const num = item.number; // "01", "02", ...

    // 1. Apostila principal
    const apostilaPdf = generateValidPDF(item.title, 'Curso Técnico em IA', item.pages);
    fs.writeFileSync(path.join(dirPath, `apostila-aula-${num}.pdf`), apostilaPdf);

    // 2. Material complementar (versão reduzida)
    const complementarPdf = generateValidPDF(
      `${item.title} - Material Complementar`,
      'Curso Técnico em IA',
      item.pages.slice(0, 1)
    );
    fs.writeFileSync(path.join(dirPath, `material-complementar-${num}.pdf`), complementarPdf);

    // 3. Referências e exercícios
    const refsPdf = generateValidPDF(
      `${item.title} - Referências e Exercícios`,
      'Curso Técnico em IA',
      [
        {
          header: 'Referências Bibliográficas',
          text: 'Lista de referências oficiais e exercícios de fixação da disciplina.'
        }
      ]
    );
    fs.writeFileSync(path.join(dirPath, `referencias-exercicios-${num}.pdf`), refsPdf);

    // 4. Slides (mesmo conteúdo resumido)
    const slidesPdf = generateValidPDF(
      `${item.title} - Slides`,
      'Curso Técnico em IA',
      item.pages
    );
    fs.writeFileSync(path.join(dirPath, `slides-aula-${num}.pdf`), slidesPdf);

    console.log(`✓ ${item.dir} → arquivos *-aula-${num}.* gerados`);
  }

  console.log('Seed concluído com sucesso.');
}

// Se executado diretamente
if (process.argv[1] && process.argv[1].includes('seed-course-materials')) {
  seedAllCourseMaterials();
}
