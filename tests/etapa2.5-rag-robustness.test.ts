import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ragService, RAG_EMBEDDING_MODEL } from '../src/server/rag.ts';
import { seedAllCourseMaterials } from '../src/server/seed-course-materials.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const coursesRootDir = path.resolve(__dirname, '../public/cursos');

async function runEtapa25RegressionTests() {
  console.log('🔬 ==============================================================');
  console.log('🔬 INICIANDO TESTES DE REGRESSÃO E ROBUSTEZ DO RAG (ETAPA 2.5)');
  console.log('🔬 ==============================================================');

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS 2.5.${totalTests}] ${testName}${detail ? ` -> ${detail}` : ''}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL 2.5.${totalTests}] ${testName}${detail ? ` -> ${detail}` : ''}`);
      throw new Error(`Falha no teste: ${testName}`);
    }
  }

  // Garante estado inicial consistente dos materiais
  seedAllCourseMaterials();

  // =========================================================================
  // CENÁRIO 1: MODELO CONFIGURADO NO DIAGNÓSTICO
  // =========================================================================
  console.log('\n--- 1. DIAGNÓSTICO DO MODELO DE EMBEDDING ---');
  const ragDiag = await ragService.getRagDiagnostics();

  assert(
    ragDiag.embeddingModel === 'gemini-embedding-2-preview' &&
    ragDiag.configuredEmbeddingModel === 'gemini-embedding-2-preview' &&
    ragDiag.embeddingModel === RAG_EMBEDDING_MODEL,
    'O diagnóstico informa corretamente o modelo de embedding configurado e utilizado (gemini-embedding-2-preview).',
    `Modelo reportado: ${ragDiag.embeddingModel}`
  );

  assert(
    ragDiag.embeddingModel !== 'text-embedding-004',
    'O identificador defasado text-embedding-004 foi completamente eliminado do diagnóstico.',
    'Identificador unificado via constante RAG_EMBEDDING_MODEL.'
  );

  // =========================================================================
  // CENÁRIO 2: DISTINÇÃO ENTRE MODELO E MECANISMO DE BUSCA ATIVO (TF-IDF / EMBEDDING)
  // =========================================================================
  console.log('\n--- 2. DISTINÇÃO ENTRE MODELO CONFIGURADO E BUSCA ATIVA ---');
  assert(
    typeof ragDiag.configuredEmbeddingModel === 'string' &&
    typeof ragDiag.activeSearchMethod === 'string',
    'Diagnóstico distingue claramente o modelo configurado do mecanismo de busca ativo no servidor.',
    `Configurado: ${ragDiag.configuredEmbeddingModel} | Busca Ativa: ${ragDiag.activeSearchMethod}`
  );

  assert(
    ragDiag.activeSearchMethod === 'gemini_embedding_vector' ||
    ragDiag.activeSearchMethod === 'tfidf_lexical_vector',
    'O mecanismo de busca ativo é categorizado estritamente entre gemini_embedding_vector e tfidf_lexical_vector.'
  );

  assert(
    ragDiag.isGeminiEmbeddingAvailable === (ragDiag.activeSearchMethod === 'gemini_embedding_vector'),
    'O embedding denso somente é reportado como ativo quando as credenciais e chamadas estão operacionais.'
  );

  // =========================================================================
  // CENÁRIO 3: EXCLUSÃO DE ARQUIVO INVALIDA O CACHE E REMOVE TRECHOS
  // =========================================================================
  console.log('\n--- 3. DETECÇÃO DE EXCLUSÃO E INVALIDAÇÃO DE CACHE ---');
  const testDir = path.join(coursesRootDir, 'modulo-1/01-fundamentos');
  const tempDeletionFile = path.join(testDir, 'temp-teste-exclusao-cache.txt');
  const uniqueDeletionToken = `TOKEN_EXCLUSAO_UNICO_${Date.now()}`;

  const tempDeletionContent = `# TESTE INF-101
# MATERIAL DIDÁTICO EXPERIMENTAL DE DESENVOLVIMENTO — AGUARDANDO HOMOLOGAÇÃO INSTITUCIONAL.
--- Página 1: Secao Exclusao
${uniqueDeletionToken} Este paragrafo deve ser indexado e subsequentemente removido no teste.
`;

  try {
    fs.writeFileSync(tempDeletionFile, tempDeletionContent, 'utf8');

    // 1. Indexa com arquivo presente
    const chunksWithTemp = await ragService.indexDisciplineMaterials('disc-01');
    const hasTempChunk = chunksWithTemp.some((c) => c.content.includes(uniqueDeletionToken));
    assert(hasTempChunk, 'Arquivo temporário criado foi indexado com sucesso no acervo da disciplina.');

    // 2. Remove o arquivo
    fs.unlinkSync(tempDeletionFile);

    // 3. Indexa novamente sem reiniciar o processo
    const chunksAfterDeletion = await ragService.indexDisciplineMaterials('disc-01');
    const hasDeletedChunk = chunksAfterDeletion.some((c) => c.content.includes(uniqueDeletionToken));
    assert(
      !hasDeletedChunk,
      'A exclusão do arquivo invalidou o cache e removeu seus trechos do índice ativo sem reiniciar o servidor.'
    );

    // 4. Executa recuperação e confirma ausência
    const retrievalAfterDeletion = await ragService.retrieveContext('disc-01', uniqueDeletionToken);
    const chunkFoundInRetrieval = retrievalAfterDeletion.retrievedChunks.some((c) =>
      c.content.includes(uniqueDeletionToken)
    );
    assert(
      !chunkFoundInRetrieval,
      'Busca RAG após exclusão não recupera conteúdo do arquivo removido.'
    );
  } finally {
    if (fs.existsSync(tempDeletionFile)) {
      fs.unlinkSync(tempDeletionFile);
    }
  }

  // =========================================================================
  // CENÁRIO 4: ALTERAÇÃO DE ARQUIVO PROVOCA REINDEXAÇÃO IMEDIATA
  // =========================================================================
  console.log('\n--- 4. DETECÇÃO DE ALTERAÇÃO DE ARQUIVO ---');
  const tempModFile = path.join(testDir, 'temp-teste-alteracao-cache.txt');
  const tokenV1 = `TOKEN_VERSAO_1_${Date.now()}`;
  const tokenV2 = `TOKEN_VERSAO_2_${Date.now()}`;

  try {
    // Cria versão 1
    fs.writeFileSync(
      tempModFile,
      `# INF-101\n# MATERIAL DIDÁTICO EXPERIMENTAL DE DESENVOLVIMENTO — AGUARDANDO HOMOLOGAÇÃO INSTITUCIONAL.\n--- Página 1: V1\n${tokenV1} Primeira versao do conteudo.`,
      'utf8'
    );
    const chunksV1 = await ragService.indexDisciplineMaterials('disc-01');
    assert(
      chunksV1.some((c) => c.content.includes(tokenV1)),
      'Versão 1 do arquivo foi indexada pelo cache.'
    );

    // Modifica para versão 2
    fs.writeFileSync(
      tempModFile,
      `# INF-101\n# MATERIAL DIDÁTICO EXPERIMENTAL DE DESENVOLVIMENTO — AGUARDANDO HOMOLOGAÇÃO INSTITUCIONAL.\n--- Página 1: V2\n${tokenV2} Segunda versao modificada do conteudo.`,
      'utf8'
    );

    // Força pequeno offset no timestamp para sistemas de arquivos com resolução de 1s
    const futureTime = (Date.now() + 2000) / 1000;
    fs.utimesSync(tempModFile, futureTime, futureTime);

    const chunksV2 = await ragService.indexDisciplineMaterials('disc-01');
    const hasV1InV2 = chunksV2.some((c) => c.content.includes(tokenV1));
    const hasV2InV2 = chunksV2.some((c) => c.content.includes(tokenV2));

    assert(
      !hasV1InV2 && hasV2InV2,
      'A modificação de arquivo provocou reindexação e atualização transparente dos trechos ativos.'
    );
  } finally {
    if (fs.existsSync(tempModFile)) {
      fs.unlinkSync(tempModFile);
    }
    // Reindexa disc-01 para retornar ao estado limpo
    await ragService.indexDisciplineMaterials('disc-01');
  }

  // =========================================================================
  // CENÁRIO 5: ISOLAMENTO CURRICULAR RIGOROSO ENTRE DISCIPLINAS
  // =========================================================================
  console.log('\n--- 5. PRESERVAÇÃO DO ISOLAMENTO CURRICULAR ---');
  // Consulta de Teorema de Bayes e Autovalores em INF-101 (não deve retornar de MAT-105)
  const mathQueryInInf = 'Como calcular a probabilidade a posteriori pelo Teorema de Bayes e decomposição SVD?';
  const retrievalMathInInf = await ragService.retrieveContext('disc-01', mathQueryInInf);

  assert(
    retrievalMathInInf.hasRelevantContent === false ||
    (retrievalMathInInf.disciplineId === 'disc-01' &&
     retrievalMathInInf.retrievedChunks.every((c) => c.documentPath.includes('01-fundamentos'))),
    'Isolamento Curricular: Materiais da disciplina de Matemática (disc-05) não vazam para consultas em Fundamentos (disc-01).'
  );

  // Consulta de Redes Neurais e Turing em LOG-102 (não deve retornar de IA-106)
  const aiQueryInLog = 'Qual o impacto do teste de Turing e do conexionismo na historia da Inteligencia Artificial?';
  const retrievalAiInLog = await ragService.retrieveContext('disc-02', aiQueryInLog);

  assert(
    retrievalAiInLog.hasRelevantContent === false ||
    (retrievalAiInLog.disciplineId === 'disc-02' &&
     retrievalAiInLog.retrievedChunks.every((c) => c.documentPath.includes('02-logica'))),
    'Isolamento Curricular: Materiais da disciplina de IA (disc-06) não vazam para consultas em Lógica (disc-02).'
  );

  // =========================================================================
  // CENÁRIO 6: AVISO VISÍVEL E INEQUÍVOCO DE NÃO HOMOLOGAÇÃO NOS MATERIAIS
  // =========================================================================
  console.log('\n--- 6. VERIFICAÇÃO DO AVISO DE NÃO HOMOLOGAÇÃO NOS MATERIAIS ---');
  const requiredNoticeText = 'MATERIAL DIDÁTICO EXPERIMENTAL DE DESENVOLVIMENTO — AGUARDANDO HOMOLOGAÇÃO INSTITUCIONAL. Este conteúdo destina-se à validação técnica da plataforma e não substitui apostilas oficialmente aprovadas pela instituição.';

  const module1Dirs = [
    'modulo-1/01-fundamentos',
    'modulo-1/02-logica',
    'modulo-1/03-python',
    'modulo-1/04-banco-dados',
    'modulo-1/05-matematica-estatistica',
    'modulo-1/06-fundamentos-ia',
  ];

  let allTxtFilesHaveNotice = true;
  let allPdfFilesHaveNotice = true;
  let noFileClaimsOfficial = true;

  for (const relDir of module1Dirs) {
    const fullDir = path.join(coursesRootDir, relDir);
    const files = fs.readdirSync(fullDir);

    for (const file of files) {
      if (file.toLowerCase().startsWith('readme')) continue;

      const filePath = path.join(fullDir, file);

      if (file.endsWith('.txt')) {
        const textContent = fs.readFileSync(filePath, 'utf8');
        if (!textContent.includes(requiredNoticeText)) {
          allTxtFilesHaveNotice = false;
          console.error(`❌ Aviso ausente no arquivo texto: ${filePath}`);
        }
        if (textContent.includes('MATERIAL DIDATICO OFICIAL') || textContent.includes('MATERIAL DIDÁTICO OFICIAL')) {
          noFileClaimsOfficial = false;
          console.error(`❌ Arquivo alega ser oficial: ${filePath}`);
        }
      } else if (file.endsWith('.pdf')) {
        const pdfContent = fs.readFileSync(filePath, 'latin1');
        const hasPdfNotice =
          pdfContent.includes('MATERIAL DIDATICO EXPERIMENTAL DE DESENVOLVIMENTO') &&
          pdfContent.includes('AGUARDANDO HOMOLOGACAO INSTITUCIONAL');
        if (!hasPdfNotice) {
          allPdfFilesHaveNotice = false;
          console.error(`❌ Aviso ausente no PDF: ${filePath}`);
        }
      }
    }
  }

  assert(
    allTxtFilesHaveNotice,
    'Todos os arquivos de texto contêm na íntegra o aviso de material experimental não homologado.'
  );

  assert(
    allPdfFilesHaveNotice,
    'Todas as apostilas PDF contêm tarja e aviso visível de material experimental aguardando homologação.'
  );

  assert(
    noFileClaimsOfficial,
    'Nenhum material didático gerado declara ser apostila oficial homologada pela instituição.'
  );

  console.log('\n==============================================================');
  console.log(`🎉 ETAPA 2.5 CONCLUÍDA COM SUCESSO! ${passedTests}/${totalTests} TESTES APROVADOS.`);
  console.log('==============================================================');
}

runEtapa25RegressionTests().catch((err) => {
  console.error('❌ Falha na execução da suíte de testes da Etapa 2.5:', err);
  process.exit(1);
});
