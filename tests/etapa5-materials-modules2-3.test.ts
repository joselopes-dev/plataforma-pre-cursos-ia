import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DISCIPLINES } from '../src/db/seed-data.ts';
import { ragService } from '../src/server/rag.ts';
import { seedAllCourseMaterials, ALL_DISCIPLINES_MATERIALS } from '../src/server/seed-course-materials.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootCoursesDir = path.resolve(__dirname, '../public/cursos');

async function runEtapa5ValidationTests() {
  console.log('📚 ==============================================================');
  console.log('📚 INICIANDO VALIDAÇÃO DO ACERVO DIDÁTICO DOS MÓDULOS II E III (ETAPA 5)');
  console.log('📚 ==============================================================');

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS ${totalTests}] ${testName}${detail ? ` -> ${detail}` : ''}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL ${totalTests}] ${testName}${detail ? ` -> ${detail}` : ''}`);
      throw new Error(`Falha no teste: ${testName}`);
    }
  }

  // 1. Garante que os materiais estão gerados
  seedAllCourseMaterials();

  // =========================================================================
  // SEÇÃO 1: AUDITORIA DE MATRIZ CURRICULAR E AS 14 DISCIPLINAS DOS MÓDULOS II E III
  // =========================================================================
  console.log('\n--- 1. AUDITORIA DA MATRIZ DOS MÓDULOS II E III ---');

  const mod2Disciplines = DISCIPLINES.filter((d) => d.moduleId === 2);
  const mod3Disciplines = DISCIPLINES.filter((d) => d.moduleId === 3);

  assert(mod2Disciplines.length === 6, 'Módulo II possui exatamente 6 componentes curriculares (disc-07 a disc-12).');
  assert(mod3Disciplines.length === 8, 'Módulo III possui exatamente 8 componentes curriculares (disc-13 a disc-20).');
  assert(mod2Disciplines.length + mod3Disciplines.length === 14, 'Total de 14 componentes contemplados nos Módulos II e III.');

  // =========================================================================
  // SEÇÃO 2: VERIFICAÇÃO FÍSICA DOS ARQUIVOS GERADOS PARA CADA UMA DAS 14 DISCIPLINAS
  // =========================================================================
  console.log('\n--- 2. VERIFICAÇÃO FÍSICA DOS ARQUIVOS (PDF, TXT, README) ---');

  const experimentalDisclaimerSubstring = 'MATERIAL DIDÁTICO EXPERIMENTAL DE DESENVOLVIMENTO — AGUARDANDO HOMOLOGAÇÃO INSTITUCIONAL';

  const mod2And3List = [...mod2Disciplines, ...mod3Disciplines];

  for (const disc of mod2And3List) {
    const discDir = ragService.getDisciplineDirectory(disc.id);
    assert(fs.existsSync(discDir), `Diretório físico existe para ${disc.code}: ${discDir}`);

    const files = fs.readdirSync(discDir);
    assert(files.length >= 4, `Diretório ${disc.code} contém ao menos 4 arquivos didáticos essenciais (encontrados: ${files.length}).`);

    // 1. Arquivo PDF específico e apostila-aula-01.pdf
    const pdfFiles = files.filter((f) => f.endsWith('.pdf'));
    assert(pdfFiles.length >= 2, `Componente ${disc.code} possui arquivos PDF gerados (${pdfFiles.join(', ')}).`);

    const aula01PdfPath = path.join(discDir, 'apostila-aula-01.pdf');
    assert(fs.existsSync(aula01PdfPath), `Arquivo apostila-aula-01.pdf existe fisicamente em ${disc.code}.`);
    const aula01PdfBuf = fs.readFileSync(aula01PdfPath);
    assert(aula01PdfBuf.slice(0, 5).toString('ascii') === '%PDF-', `apostila-aula-01.pdf em ${disc.code} é um PDF binário válido.`);

    // 2. Arquivo de texto estruturado com aviso de material experimental
    const txtPath = path.join(discDir, 'material-estudo-experimental.txt');
    assert(fs.existsSync(txtPath), `material-estudo-experimental.txt existe fisicamente em ${disc.code}.`);
    const txtContent = fs.readFileSync(txtPath, 'utf8');
    assert(
      txtContent.includes(experimentalDisclaimerSubstring),
      `material-estudo-experimental.txt em ${disc.code} contém o aviso de material experimental não homologado.`
    );
    assert(
      !txtContent.includes('MATERIAL DIDÁTICO OFICIAL'),
      `material-estudo-experimental.txt em ${disc.code} não declara falsamente homologação institucional oficial.`
    );

    // 3. README da disciplina
    const readmePath = path.join(discDir, 'README.md');
    assert(fs.existsSync(readmePath), `README.md existe em ${disc.code}.`);
  }

  // =========================================================================
  // SEÇÃO 3: INDEXAÇÃO E RECUPERAÇÃO RAG PARA DISCIPLINAS DOS MÓDULOS II E III
  // =========================================================================
  console.log('\n--- 3. INDEXAÇÃO E RECUPERAÇÃO RAG NOS MÓDULOS II E III ---');

  // Teste 3.1: Indexação de disc-07 (CD-201: Python para Ciência de Dados)
  const chunksDisc07 = await ragService.indexDisciplineMaterials('disc-07');
  assert(chunksDisc07.length > 0, `Indexação de CD-201 gerou ${chunksDisc07.length} trechos didáticos.`);

  // Teste 3.2: Busca contextual em disc-07 sobre DataFrames e Pandas
  const ragRes07 = await ragService.retrieveContext('disc-07', 'Como funciona a manipulação de DataFrames e tratamento de valores nulos no Pandas?');
  assert(ragRes07.hasRelevantContent === true, 'RAG recuperou conteúdo relevante para Pandas em CD-201.');
  assert(
    ragRes07.retrievedChunks.some((c) => c.content.toLowerCase().includes('pandas') || c.content.toLowerCase().includes('dataframe')),
    'Trecho recuperado em CD-201 aborda DataFrames e Pandas.'
  );

  // Teste 3.3: Indexação e busca em disc-08 (MLA-202: Machine Learning Aplicado)
  const chunksDisc08 = await ragService.indexDisciplineMaterials('disc-08');
  assert(chunksDisc08.length > 0, `Indexação de MLA-202 gerou ${chunksDisc08.length} trechos.`);
  const ragRes08 = await ragService.retrieveContext('disc-08', 'Quais as diferenças entre regularização Lasso L1 e Ridge L2 em regressão logística?');
  assert(ragRes08.hasRelevantContent === true, 'RAG recuperou conteúdo de regularização em MLA-202.');

  // Teste 3.4: Indexação e busca em disc-09 (DL-203: Deep Learning)
  const chunksDisc09 = await ragService.indexDisciplineMaterials('disc-09');
  assert(chunksDisc09.length > 0, `Indexação de DL-203 gerou ${chunksDisc09.length} trechos.`);
  const ragRes09 = await ragService.retrieveContext('disc-09', 'Como o algoritmo de Backpropagation utiliza a regra da cadeia para atualizar pesos em redes neurais?');
  assert(ragRes09.hasRelevantContent === true, 'RAG recuperou conteúdo de Backpropagation em DL-203.');

  // Teste 3.5: Indexação e busca em disc-13 (SEG-301: LGPD e Segurança)
  const chunksDisc13 = await ragService.indexDisciplineMaterials('disc-13');
  assert(chunksDisc13.length > 0, `Indexação de SEG-301 gerou ${chunksDisc13.length} trechos.`);
  const ragRes13 = await ragService.retrieveContext('disc-13', 'Quais são as técnicas de k-anonimato e privacidade diferencial aplicadas à LGPD?');
  assert(ragRes13.hasRelevantContent === true, 'RAG recuperou conteúdo de LGPD e k-anonimato em SEG-301.');

  // Teste 3.6: Indexação e busca em disc-15 (MLO-303: MLOps)
  const chunksDisc15 = await ragService.indexDisciplineMaterials('disc-15');
  assert(chunksDisc15.length > 0, `Indexação de MLO-303 gerou ${chunksDisc15.length} trechos.`);
  const ragRes15 = await ragService.retrieveContext('disc-15', 'Como o MLflow realiza o rastreamento de experimentos e detecção de data drift em produção?');
  assert(ragRes15.hasRelevantContent === true, 'RAG recuperou conteúdo de MLflow e data drift em MLO-303.');

  // Teste 3.7: Indexação e busca em disc-17 (LLM-305: LLMs)
  const chunksDisc17 = await ragService.indexDisciplineMaterials('disc-17');
  assert(chunksDisc17.length > 0, `Indexação de LLM-305 gerou ${chunksDisc17.length} trechos.`);
  const ragRes17 = await ragService.retrieveContext('disc-17', 'Como funciona o mecanismo de auto-atenção nos Transformers e arquiteturas RAG com Gemini?');
  assert(ragRes17.hasRelevantContent === true, 'RAG recuperou conteúdo de Transformers e RAG em LLM-305.');

  // Teste 3.8: Indexação e busca em disc-18 (VIS-306: Visão Computacional)
  const chunksDisc18 = await ragService.indexDisciplineMaterials('disc-18');
  assert(chunksDisc18.length > 0, `Indexação de VIS-306 gerou ${chunksDisc18.length} trechos.`);
  const ragRes18 = await ragService.retrieveContext('disc-18', 'Como a arquitetura YOLO realiza a detecção de objetos em tempo real com OpenCV?');
  assert(ragRes18.hasRelevantContent === true, 'RAG recuperou conteúdo de detecção de objetos YOLO em VIS-306.');

  // =========================================================================
  // SEÇÃO 4: ISOLAMENTO CURRICULAR RIGOROSO ENTRE MÓDULO II E MÓDULO III
  // =========================================================================
  console.log('\n--- 4. TESTE DE ISOLAMENTO CURRICULAR ENTRE DISCIPLINAS ---');

  // Pergunta sobre YOLO (específica de VIS-306 / disc-18) consultada em CD-201 (disc-07)
  const queryYoloInPandas = await ragService.retrieveContext('disc-07', 'Como funciona a arquitetura YOLO para detecção de objetos em tempo real com OpenCV?');
  assert(
    queryYoloInPandas.hasRelevantContent === false || queryYoloInPandas.retrievedChunks.every((c) => c.documentPath.includes('07-python-ciencia-dados')),
    'Isolamento Curricular: Conteúdo de Visão Computacional não vaza para a disciplina de Ciência de Dados com Pandas.'
  );

  // Pergunta sobre LGPD e k-anonimato (SEG-301 / disc-13) consultada em Deep Learning (disc-09)
  const queryLgpdInDl = await ragService.retrieveContext('disc-09', 'Quais são as exigências legais da LGPD para k-anonimato e privacidade diferencial?');
  assert(
    queryLgpdInDl.hasRelevantContent === false || queryLgpdInDl.retrievedChunks.every((c) => c.documentPath.includes('09-deep-learning')),
    'Isolamento Curricular: Conteúdo de Governança e LGPD não vaza para a disciplina de Deep Learning.'
  );

  // =========================================================================
  // SEÇÃO 5: INVALIDAÇÃO DE CACHE POR MANIFESTO SHA-256
  // =========================================================================
  console.log('\n--- 5. INVALIDAÇÃO DE CACHE POR MANIFESTO SHA-256 ---');

  const manifestBefore = ragService.computeDisciplineManifest('disc-17');
  assert(Boolean(manifestBefore?.manifestHash), 'Manifesto SHA-256 computado com sucesso para LLM-305.');
  assert(Boolean(manifestBefore && manifestBefore.filePaths.length >= 3), `Manifesto de LLM-305 contabiliza arquivos relevantes (${manifestBefore?.filePaths.length} arquivos).`);

  // =========================================================================
  // SEÇÃO 6: DIAGNÓSTICO GERAL DO RAG (TODAS AS 20 DISCIPLINAS ATIVAS)
  // =========================================================================
  console.log('\n--- 6. DIAGNÓSTICO DO RAG PARA AS 20 DISCIPLINAS ---');

  const ragDiag = await ragService.getRagDiagnostics();
  assert(
    ragDiag.totalDisciplinesWithMaterials === 20,
    `Diagnóstico RAG reporta todas as 20 disciplinas oficiais com acervo físico ativo (atual: ${ragDiag.totalDisciplinesWithMaterials}/20).`
  );

  assert(
    ragDiag.disciplines.every((d) => d.exists && d.files.length > 0),
    'Todos os 20 diretórios físicos de disciplinas existem e contêm materiais indexáveis.'
  );

  console.log('\n==============================================================');
  console.log(`🎉 ETAPA 5 CONCLUÍDA COM SUCESSO! ${passedTests}/${totalTests} TESTES APROVADOS.`);
  console.log('==============================================================');
}

runEtapa5ValidationTests().catch((err) => {
  console.error('❌ Falha na bateria de testes da Etapa 5:', err);
  process.exit(1);
});
