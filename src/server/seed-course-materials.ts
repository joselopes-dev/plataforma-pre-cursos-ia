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
  objects.push(`2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>\nendobj`);
  pages.forEach((page, i) => {
    const pageObjNum = 3 + i * 3;
    const contentObjNum = 4 + i * 3;
    const fontObjNum = 5 + i * 3;
    objects.push(`${pageObjNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentObjNum} 0 R /Resources << /Font << /F1 ${fontObjNum} 0 R >> >> >>\nendobj`);
    const disclaimerL1 = 'AVISO: MATERIAL DIDATICO EXPERIMENTAL DE DESENVOLVIMENTO';
    const disclaimerL2 = 'AGUARDANDO HOMOLOGACAO INSTITUCIONAL';
    const disclaimerL3 = 'Este conteudo destina-se a validacao tecnica da plataforma.';
    const fullText = `[${title.toUpperCase()} - PAGINA ${i + 1}]\n${disclaimerL1}\n${disclaimerL2}\n${disclaimerL3}\n\n${page.header}\n\n${page.text}`;
    const lines = fullText.split('\n').filter(l => l.trim().length > 0);
    let streamText = 'BT\n/F1 11 Tf\n45 740 Td\n15 TL\n';
    lines.forEach((line) => {
      const words = line.split(' ');
      let currentLine = '';
      words.forEach((w) => {
        if (!currentLine) currentLine = w;
        else if ((currentLine + ' ' + w).length <= 75) currentLine += ' ' + w;
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

export const ALL_DISCIPLINES_MATERIALS = [
  { dir: 'modulo-1/01-fundamentos', pdfName: 'apostila-fundamentos-sistemas-linux.pdf', title: 'INF-101: Fundamentos de Informatica e Linux CLI', pages: [{ header: 'Secao 1: Arquitetura de Hardware e Aceleracao para IA', text: 'Redes neurais modernas demandam operacoes massivas de algebra linear GEMM. GPUs e TPUs sao microarquitetadas para paralelismo massivo. Tensor Cores operam com precisao mista FP16 BF16 INT8.' }, { header: 'Secao 2: Linux CLI em Ciencia de Dados', text: 'Terminal Linux e interface padrao para orquestracao. Comandos essenciais ls cd mkdir ps top nvidia-smi grep awk sed para processamento de logs.' }, { header: 'Secao 3: Git e Ambientes Virtuais', text: 'Reprodutibilidade exige commits atomicos e .gitignore para datasets. Ambiente virtual python -m venv .venv para isolamento.' }] },
  { dir: 'modulo-1/02-logica', pdfName: 'apostila-logica-algoritmos.pdf', title: 'LOG-102: Logica de Programacao e Algoritmos', pages: [{ header: 'Secao 1: Big-O e Complexidade', text: 'Acesso O1 busca binaria OlogN MergeSort NlogN BubbleSort N2 proibitivo para grandes massas de dados.' }, { header: 'Secao 2: Estruturas de Dados', text: 'Vetores contiguos matrizes bidimensionais tensores ordem dois funcoes puras para pipelines analiticos.' }] },
  { dir: 'modulo-1/03-python', pdfName: 'apostila-python-aplicado-ia.pdf', title: 'PYTHON-103: Programacao em Python Aplicada a IA', pages: [{ header: 'Secao 1: Ecossistema Python', text: 'Listas tuplas sets dicts list comprehensions generators baixo footprint de memoria.' }, { header: 'Secao 2: NumPy e Pandas', text: 'NumPy ndarray vetorizado em C broadcasting Pandas DataFrames dropna fillna groupby merge join.' }, { header: 'Secao 3: OOP e Excecoes', text: 'Classes com fit predict transform try except finally excecoes customizadas para pipelines longos.' }] },
  { dir: 'modulo-1/04-banco-dados', pdfName: 'apostila-bancos-dados-ia.pdf', title: 'BD-104: Bancos de Dados Relacionais e Vetoriais', pages: [{ header: 'Secao 1: PostgreSQL ACID', text: 'ACID Atomicidade Consistencia Isolamento Durabilidade PK FK Indices BTree BEGIN COMMIT.' }, { header: 'Secao 2: NoSQL e Vetorial RAG', text: 'MongoDB Redis pgvector embeddings HNSW IVFFlat cosseno para busca semantica em LLMs.' }] },
  { dir: 'modulo-1/05-matematica-estatistica', pdfName: 'apostila-matematica-estatistica-ia.pdf', title: 'MAT-105: Matematica e Estatistica para IA', pages: [{ header: 'Secao 1: Algebra Linear', text: 'Tensores produto escalar atencao Transformer Autovalores SVD PCA reducao dimensionalidade.' }, { header: 'Secao 2: Bayes', text: 'Media mediana moda variancia Teorema de Bayes classificadores probabilisticos Bayesianos.' }] },
  { dir: 'modulo-1/06-fundamentos-ia', pdfName: 'apostila-fundamentos-ia.pdf', title: 'IA-106: Fundamentos da IA', pages: [{ header: 'Secao 1: Historia IA', text: 'Turing 1950 Dartmouth 1956 simbolico vs conexionista Big Data GPU venceu.' }, { header: 'Secao 2: Taxonomia ML', text: 'Supervisionado Nao Supervisionado Reforco agente maximizando recompensa cumulativa.' }] },
  { dir: 'modulo-2/07-python-ciencia-dados', pdfName: 'apostila-python-ciencia-dados.pdf', title: 'CD-201: Python para Ciencia de Dados', pages: [{ header: 'Secao 1: Pandas', text: 'DataFrames indexacao booleana imputacao OneHot sem leakage.' }, { header: 'Secao 2: Visualizacao', text: 'Matplotlib Seaborn scatter boxplot 1.5 IQR KDE Pearson Spearman multicolinearidade.' }, { header: 'Secao 3: Pipeline', text: 'Pipeline ColumnTransformer StandardScaler sem reajuste no teste.' }, { header: 'Secao 4: Pratica', text: 'Carregar tabular imputar visualizar McKinney VanderPlas.' }] },
  { dir: 'modulo-2/08-ml-aplicado', pdfName: 'apostila-ml-aplicado.pdf', title: 'MLA-202: Machine Learning Aplicado', pages: [{ header: 'Secao 1: Supervisionado', text: 'Regressao linear logistica L1 Lasso L2 Ridge arvores Entropia Gini Random Forest XGBoost LightGBM.' }, { header: 'Secao 2: SVM e Clustering', text: 'SVM margem maxima kernel RBF KMeans Elbow silhueta PCA variancia.' }, { header: 'Secao 3: Validacao', text: 'K-Fold estratificado Matriz Confusao Precisao Recall F1 ROC AUC.' }, { header: 'Secao 4: Exemplo', text: 'RandomForest GridSearchCV max_depth acuracia balanceada Hastie Geron.' }] },
  { dir: 'modulo-2/09-deep-learning', pdfName: 'apostila-deep-learning.pdf', title: 'DL-203: Redes Neurais e Deep Learning', pages: [{ header: 'Secao 1: MLP Backprop', text: 'ReLU GeLU Softmax Teorema Aproximacao Universal regra da cadeia.' }, { header: 'Secao 2: Otimizadores', text: 'SGD momento Adam AdamW weight decay Dropout BatchNorm overfitting.' }, { header: 'Secao 3: CNN RNN LSTM', text: 'Convolucao pooling invariancia LSTM GRU forget gate gradiente explode.' }, { header: 'Secao 4: Transfer Learning PyTorch', text: 'ResNet EfficientNet ImageNet congelar base nn.Module forward Goodfellow.' }] },
  { dir: 'modulo-2/10-pln-chatbots', pdfName: 'apostila-pln-chatbots.pdf', title: 'PLN-204: PLN e Chatbots', pages: [{ header: 'Secao 1: Pre-processamento TFIDF', text: 'Unicode tokenizacao lematizacao TFIDF raridade informacional.' }, { header: 'Secao 2: Embeddings', text: 'Word2Vec GloVe FastText Rei Homem Mulher Rainha cosseno produto escalar.' }, { header: 'Secao 3: NLU', text: 'Intencao consultar_nota NER disciplina slot filling acao deterministica.' }, { header: 'Secao 4: Avaliacao', text: 'BLEU ROUGE perplexidade Jurafsky.' }] },
  { dir: 'modulo-2/11-metodologia', pdfName: 'apostila-metodologia-tecnica.pdf', title: 'MET-205: Metodologia Tecnica', pages: [{ header: 'Secao 1: ABNT', text: 'NBR 10719 6023 Contextualizacao Objetivos Metodologia Resultados Conclusao.' }, { header: 'Secao 2: Reprodutibilidade', text: 'Random seed requirements Model Cards casos uso limitacoes risco etico.' }, { header: 'Secao 3: Comunicacao', text: 'Traduzir Loss F1 em custo triagem precisao diagnostico graficos claros.' }, { header: 'Secao 4: Pratica', text: 'Model Card completo Gil Mitchell FAT.' }] },
  { dir: 'modulo-2/12-pratica-supervisionada-1', pdfName: 'apostila-pratica-supervisionada-1.pdf', title: 'PPS-206: Pratica Supervisionada I', pages: [{ header: 'Secao 1: CRISP-DM', text: 'Negocio Dados Preparacao Modelagem Avaliacao Implantacao.' }, { header: 'Secao 2: Validacao Dados', text: 'Auditoria duplicados completude outliers representatividade.' }, { header: 'Secao 3: Benchmark', text: 'Baseline linear arvore ensemble F1 tempo inferencia memoria.' }, { header: 'Secao 4: Entregaveis', text: 'Repo README pipeline relatorio ABNT rigor clareza viabilidade.' }] },
  { dir: 'modulo-3/13-seguranca-lgpd', pdfName: 'apostila-seguranca-lgpd-dados.pdf', title: 'SEG-301: Seguranca e LGPD', pages: [{ header: 'Secao 1: LGPD 13.709', text: 'Finalidade Adequacao Necessidade Livre Acesso Seguranca Nao Discriminacao consentimento legitimo interesse explicabilidade.' }, { header: 'Secao 2: Anonimizacao', text: 'k-Anonimato Privacidade Diferencial Laplace Gaussiana membership inference.' }, { header: 'Secao 3: Vies e Seguranca', text: 'Paridade Demografica Igualdade Oportunidades data poisoning adversarial model inversion.' }, { header: 'Secao 4: RIPD', text: 'RIPD credito ANPD Barocas.' }] },
  { dir: 'modulo-3/14-engenharia-software-ia', pdfName: 'apostila-engenharia-software-ia.pdf', title: 'ES-302: Engenharia de Software para IA', pages: [{ header: 'Secao 1: SOLID Clean Code', text: 'Separacao regras negocio pipeline features motor inferencia SOLID Strategy.' }, { header: 'Secao 2: TDD Dados Modelos', text: 'Unitario schema Pydantic Zod invariancia sensibilidade regressao desempenho.' }, { header: 'Secao 3: REST Docker', text: 'Express FastAPI JSON Docker multi-stage CUDA imutavel.' }, { header: 'Secao 4: Patterns', text: 'Strategy Decorator telemetria latencia pytest Martin Fowler.' }] },
  { dir: 'modulo-3/15-mlops-deploy', pdfName: 'apostila-mlops-deploy.pdf', title: 'MLO-303: MLOps e Deploy', pages: [{ header: 'Secao 1: Maturidade', text: 'Nivel 0 scripts Nivel 1 pipeline automatizado Nivel 2 CICD modelos.' }, { header: 'Secao 2: MLflow', text: 'Git dataset hiperparametros perda artefatos Registry Staging Production.' }, { header: 'Secao 3: Deploy', text: 'Canary 5-100 Blue Green auto-scaling health check Render.' }, { header: 'Secao 4: Monitoramento Drift', text: 'Data Drift Concept Drift KS Kullback-Leibler retreinamento Treveil.' }] },
  { dir: 'modulo-3/16-assistentes-ia', pdfName: 'apostila-assistentes-ia.pdf', title: 'ASS-304: Assistentes IA', pages: [{ header: 'Secao 1: ReAct', text: 'Thought Action Observation decompor problemas verificaveis.' }, { header: 'Secao 2: Tool Use Function Calling', text: 'JSON OpenAPI modelo formula chamada validada servidor executa.' }, { header: 'Secao 3: Memoria Guardrails', text: 'Sliding window summarization jailbreak prompt injection confiabilidade.' }, { header: 'Secao 4: Design', text: 'System Prompt tom colaborativo sem resposta pronta Function Calling Yao ReAct.' }] },
  { dir: 'modulo-3/17-llms-ia', pdfName: 'apostila-llms-inteligencia-artificial.pdf', title: 'LLM-305: LLMs e IA Generativa', pages: [{ header: 'Secao 1: Transformer Atencao', text: 'Q K V Attention QK sqrt dk softmax Vaswani 2017 simultaneo superou RNN.' }, { header: 'Secao 2: Prompt Avancado', text: 'Few Shot Chain of Thought JSON Mode Structured Outputs.' }, { header: 'Secao 3: RAG', text: 'Chunking overlap embeddings cosseno Reranking citacao.' }, { header: 'Secao 4: Gemini', text: 'SDK google genai Gemini 3.8 Flash streaming 429 backoff TFIDF fallback.' }] },
  { dir: 'modulo-3/18-visao-computacional', pdfName: 'apostila-visao-computacional.pdf', title: 'VIS-306: Visao Computacional', pages: [{ header: 'Secao 1: Imagem OpenCV', text: 'Tensor HWC RGB BGR Gaussiana Sobel Laplaciano Otsu dilatacao erosao.' }, { header: 'Secao 2: YOLO', text: 'Bounding boxes passagem unica FPS alta.' }, { header: 'Secao 3: Segmentacao', text: 'U-Net Mask R-CNN pixel Data Augmentation rotacao fotometrica robustez.' }, { header: 'Secao 4: Aplicacoes', text: 'Inspecao qualidade biometria Szeliski Bradski.' }] },
  { dir: 'modulo-3/19-gestao-projetos-ia', pdfName: 'apostila-gestao-projetos-ia.pdf', title: 'GP-307: Gestao Projetos IA', pages: [{ header: 'Secao 1: Agile CRISP-DM', text: 'Scrum CRISP-DM Timeboxing prototipacao.' }, { header: 'Secao 2: Viabilidade MVP', text: 'Dados qualidade representatividade modelo pre-treinado baseline MVP menor custo.' }, { header: 'Secao 3: KPIs OKRs', text: 'F1 Recall impacto negocio retrabalho receita OKR.' }, { header: 'Secao 4: Riscos', text: 'Dados rotulados drift custo nuvem LGPD Charter PMBOK Scrum Guide.' }] },
  { dir: 'modulo-3/20-pratica-supervisionada-2', pdfName: 'apostila-pratica-supervisionada-2.pdf', title: 'PPS-308: Pratica II TCC', pages: [{ header: 'Secao 1: Regulamento TCC 60h', text: 'Desenvolvimento implantacao defesa publica banca problema real.' }, { header: 'Secao 2: Full Stack IA', text: 'Frontend Backend autenticacao Modelo RAG dados reais Deploy nuvem monitoramento.' }, { header: 'Secao 3: Documentacao', text: 'ABNT arquitetura resultados manual Docker venv LGPD.' }, { header: 'Secao 4: Banca', text: 'Dominio implementacao demo ao vivo defesa oral nota minima 7 aprovacao diploma.' }] }
];

export function seedAllCourseMaterials() {
  console.log('🌱 Gerando materiais oficiais no padrão do Classroom.tsx...');
  if (!fs.existsSync(rootCoursesDir)) fs.mkdirSync(rootCoursesDir, { recursive: true });
  let total = 0;
  for (const mat of ALL_DISCIPLINES_MATERIALS) {
    const fullDir = path.join(rootCoursesDir, mat.dir);
    fs.mkdirSync(fullDir, { recursive: true });
    const folderName = path.basename(mat.dir);
    const numMatch = folderName.match(/^(\d+)/);
    const padded = numMatch ? numMatch[1].padStart(2, '0') : '01';

    const apostila = generateValidPDF(mat.title, 'Curso Tecnico IA', mat.pages);
    fs.writeFileSync(path.join(fullDir, `apostila-aula-${padded}.pdf`), apostila);
    fs.writeFileSync(path.join(fullDir, mat.pdfName), apostila);

    const slidesPages = mat.pages.map(p => ({ header: p.header, text: p.text.substring(0, 500) }));
    const slides = generateValidPDF(`${mat.title} - SLIDES`, 'Curso Tecnico IA', slidesPages);
    fs.writeFileSync(path.join(fullDir, `slides-aula-${padded}.pdf`), slides);

    const comp = generateValidPDF(`${mat.title} - COMPLEMENTAR`, 'Curso Tecnico IA', [
      { header: 'Exemplos Praticos', text: `Codigos comentados e casos de uso reais de ${mat.title}.` },
      { header: 'Atividades', text: 'Exercicios praticos de fixacao.' }
    ]);
    fs.writeFileSync(path.join(fullDir, `material-complementar-${padded}.pdf`), comp);

    const ref = generateValidPDF(`${mat.title} - REFERENCIAS`, 'Curso Tecnico IA', [
      { header: 'Referencias', text: 'Bibliografia oficial e artigos recomendados.' },
      { header: 'Exercicios', text: 'Lista extra para avaliacao final.' }
    ]);
    fs.writeFileSync(path.join(fullDir, `referencias-exercicios-${padded}.pdf`), ref);

    total += 5;
    console.log(`✅ ${mat.dir} -> aula ${padded} (5 PDFs)`);
  }
  console.log(`\n🎉 Total ${total} PDFs em ${rootCoursesDir}`);
}

if (process.argv[1] && process.argv[1].includes('seed-course-materials')) {
  seedAllCourseMaterials();
}