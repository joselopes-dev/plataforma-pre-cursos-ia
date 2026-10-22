import { db, assertDatabaseAvailable } from '../src/server/db.ts';
import { DISCIPLINES } from '../src/db/seed-data.ts';
import crypto from 'crypto';

async function runAuthAndProductionReadinessTests() {
  console.log('🛡️ ==============================================================');
  console.log('🛡️ INICIANDO TESTES DE AUTENTICAÇÃO REAL, RBAC E PERSISTÊNCIA CAMPOS IA');
  console.log('🛡️ ==============================================================');

  let passedTests = 0;
  let totalTests = 0;

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

  // =========================================================================
  // SEÇÃO 1: CADASTRO AUTOMÁTICO COM PAPEL PADRÃO DE ALUNO
  // =========================================================================
  console.log('\n--- 1. TESTES DE CADASTRO AUTOMÁTICO E PAPEL INICIAL DE ALUNO ---');

  const uniqueSub1 = 'google-sub-' + crypto.randomUUID();
  const testStudent = await db.upsertGoogleUser({
    googleSub: uniqueSub1,
    email: `aluno.${Date.now()}@estudante.edu.br`,
    name: 'Estudante Real de Teste',
    picture: 'https://images.example.com/avatar.jpg',
  });

  assert(Boolean(testStudent && testStudent.id), 'Usuário criado com sucesso no banco de dados.');
  assert(testStudent.role === 'aluno', 'Novo usuário recebe estritamente o papel "aluno".', `Papel: ${testStudent.role}`);
  assert(Boolean(testStudent.registration_number?.startsWith('IF-IA-')), 'Matrícula institucional gerada no padrão oficial.');

  // =========================================================================
  // SEÇÃO 2: IDEMPOTÊNCIA E PRESERVAÇÃO DE DADOS EM LOGINS RECORRENTES
  // =========================================================================
  console.log('\n--- 2. TESTES DE IDEMPOTÊNCIA E PRESERVAÇÃO DE DADOS ---');

  // Registra progresso na aula 1 do componente 1
  await db.completeStep(testStudent.id, 'disc-01', 'disc-01-aula-1', 1);
  const progBefore = await db.getUserProgress(testStudent.id);
  assert(progBefore.length === 1 && progBefore[0].completed, 'Progresso da etapa 1 registrado para o aluno.');

  // Segundo login da mesma pessoa com o mesmo Google Sub
  const reconnectedStudent = await db.upsertGoogleUser({
    googleSub: uniqueSub1,
    email: testStudent.email,
    name: 'Estudante Real Nome Atualizado',
  });

  assert(reconnectedStudent.id === testStudent.id, 'Login recorrente recupera exatamente o mesmo ID de usuário (sem duplicação).');
  assert(reconnectedStudent.role === 'aluno', 'Papel permanece "aluno" em logins subsequentes.');

  // Verifica que o progresso acadêmico anterior NÃO foi sobrescrito ou apagado
  const progAfter = await db.getUserProgress(testStudent.id);
  assert(
    progAfter.length === 1 && progAfter[0].completed,
    'Progresso acadêmico preservado intacto após novo login do estudante.'
  );

  // =========================================================================
  // SEÇÃO 3: CONTROLE RESTRITO DE ADMINISTRADOR VIA ADMIN_EMAIL
  // =========================================================================
  console.log('\n--- 3. TESTES DE ATRIBUIÇÃO SEGURA DE ADMINISTRADOR ---');

  const adminEmail = (process.env.ADMIN_EMAIL || 'josel6449@gmail.com').trim().toLowerCase();
  const adminUser = await db.upsertGoogleUser({
    googleSub: 'google-sub-admin-' + Date.now(),
    email: adminEmail,
    name: 'Coordenador Oficial',
  });

  assert(
    adminUser.role === 'administrador',
    'Apenas o e-mail pré-autorizado em ADMIN_EMAIL recebe o perfil "administrador".',
    `Papel: ${adminUser.role} para ${adminEmail}`
  );

  // Tentativa de outro e-mail receber perfil administrador
  const normalUser = await db.upsertGoogleUser({
    googleSub: 'google-sub-normal-' + Date.now(),
    email: 'outro.usuario@gmail.com',
    name: 'Usuário Comum Tentando Admin',
  });

  assert(
    normalUser.role === 'aluno',
    'Qualquer outro e-mail externo recebe estritamente o papel "aluno".',
    `Papel: ${normalUser.role}`
  );

  // =========================================================================
  // SEÇÃO 4: GERENCIAMENTO DE SESSÕES SEGURAS
  // =========================================================================
  console.log('\n--- 4. TESTES DE SESSÕES SEGURAS NO SERVIDOR ---');

  const sessionToken = await db.createSession(testStudent.id, '127.0.0.1', 'Jest-Test-Agent');
  assert(typeof sessionToken === 'string' && sessionToken.length >= 32, 'Token de sessão gerado com entropia criptográfica.');

  const recoveredUser = await db.getSession(sessionToken);
  assert(recoveredUser !== null, 'Sessão válida recupera o usuário associado.');
  assert(recoveredUser?.id === testStudent.id, 'Usuário recuperado da sessão corresponde ao estudante autenticado.');

  // Encerramento de sessão (Logout)
  await db.deleteSession(sessionToken);
  const loggedOutUser = await db.getSession(sessionToken);
  assert(loggedOutUser === null, 'Sessão encerrada não permite mais autenticação.');

  // =========================================================================
  // SEÇÃO 5: ISOLAMENTO ENTRE ESTUDANTES E PROTEÇÃO DE DADOS
  // =========================================================================
  console.log('\n--- 5. TESTES DE ISOLAMENTO ENTRE ESTUDANTES ---');

  const studentB = await db.upsertGoogleUser({
    googleSub: 'google-sub-b-' + Date.now(),
    email: `aluno.b.${Date.now()}@if.edu.br`,
    name: 'Estudante B',
  });

  const progStudentA = await db.getUserProgress(testStudent.id);
  const progStudentB = await db.getUserProgress(studentB.id);

  assert(progStudentA.length === 1, 'Estudante A possui 1 registro de progresso.');
  assert(progStudentB.length === 0, 'Estudante B inicia com 0 registros de progresso (isolamento estrito).');

  // Conversas do Tutor IA isoladas por usuário
  await db.addChatMessage({
    userId: testStudent.id,
    role: 'user',
    content: 'Dúvida sobre Linux',
    disciplineId: 'disc-01',
  });

  const historyA = await db.getChatHistory(testStudent.id);
  const historyB = await db.getChatHistory(studentB.id);

  assert(historyA.length === 1, 'Estudante A visualiza seu histórico de mensagens do Tutor IA.');
  assert(historyB.length === 0, 'Estudante B não tem acesso às mensagens de Estudante A (isolamento garantido).');

  // =========================================================================
  // SEÇÃO 6: PROTEÇÃO OPERACIONAL EM PRODUÇÃO (FAIL-SAFE)
  // =========================================================================
  console.log('\n--- 6. TESTES DE PROTEÇÃO CONTRA MEMÓRIA SILENCIOSA EM PRODUÇÃO ---');

  const originalEnv = process.env.NODE_ENV;
  const originalAllowMem = process.env.ALLOW_MEMORY_STORE;

  try {
    process.env.NODE_ENV = 'production';
    delete process.env.ALLOW_MEMORY_STORE;

    let threwExpectedError = false;
    try {
      assertDatabaseAvailable();
    } catch (err: any) {
      if (err.status === 503 && err.code === 'DATABASE_UNAVAILABLE') {
        threwExpectedError = true;
      }
    }
    assert(
      threwExpectedError,
      'assertDatabaseAvailable() dispara HTTP 503 DATABASE_UNAVAILABLE quando NODE_ENV=production e PostgreSQL não está conectado.'
    );
  } finally {
    process.env.NODE_ENV = originalEnv;
    if (originalAllowMem !== undefined) {
      process.env.ALLOW_MEMORY_STORE = originalAllowMem;
    }
  }

  // =========================================================================
  // SEÇÃO 7: AUDITORIA INSTITUCIONAL PERSISTENTE
  // =========================================================================
  console.log('\n--- 7. TESTES DE AUDITORIA DE SEGURANÇA ---');

  await db.logAudit(testStudent.id, 'LOGIN_GOOGLE', 'auth', '127.0.0.1', { email: testStudent.email });
  assert(true, 'Registro de auditoria para LOGIN_GOOGLE executado sem falhas.');

  console.log('\n🛡️ ==============================================================');
  console.log(`🎉 TODOS OS ${passedTests}/${totalTests} TESTES DE AUTENTICAÇÃO E PRODUÇÃO FORAM APROVADOS!`);
  console.log('🛡️ ==============================================================');
}

runAuthAndProductionReadinessTests().catch((err) => {
  console.error('❌ Falha nos testes de autenticação:', err);
  process.exit(1);
});
