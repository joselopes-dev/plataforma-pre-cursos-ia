import { DISCIPLINES, MODULES, calculateTotalHours, getDisciplineLessons } from '../src/db/seed-data.ts';
import { db, assertDatabaseAvailable } from '../src/server/db.ts';

async function runAutomatedAuditTests() {
  console.log('🧪 ==============================================================');
  console.log('🧪 INICIANDO AUDITORIA TÉCNICA CORRETIVA AUTOMATIZADA (ETAPA 1.1)');
  console.log('🧪 ==============================================================');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string) {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS ${totalTests}] ${testName}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL ${totalTests}] ${testName}`);
      throw new Error(`Falha no teste: ${testName}`);
    }
  }

  // =========================================================================
  // SEÇÃO 1: AUDITORIA DA MATRIZ CURRICULAR E SOMA DE CARGAS HORÁRIAS
  // =========================================================================
  assert(DISCIPLINES.length === 20, 'A matriz curricular possui exatamente 20 componentes.');

  const mod1 = DISCIPLINES.filter((d) => d.moduleId === 1);
  const mod1Hours = mod1.reduce((acc, d) => acc + d.hours, 0);
  assert(mod1.length === 6, 'Módulo I possui 6 componentes curriculares.');
  assert(mod1Hours === 360, `Módulo I soma 360h item a item (Divergência auditada em relação ao cabeçalho de 340h).`);

  const mod2 = DISCIPLINES.filter((d) => d.moduleId === 2);
  const mod2Hours = mod2.reduce((acc, d) => acc + d.hours, 0);
  assert(mod2.length === 6, 'Módulo II possui 6 componentes curriculares.');
  assert(mod2Hours === 320, `Módulo II totaliza exatamente 320h (atual: ${mod2Hours}h).`);

  const mod3 = DISCIPLINES.filter((d) => d.moduleId === 3);
  const mod3Hours = mod3.reduce((acc, d) => acc + d.hours, 0);
  assert(mod3.length === 8, 'Módulo III possui 8 componentes curriculares.');
  assert(mod3Hours === 340, `Módulo III totaliza exatamente 340h (atual: ${mod3Hours}h).`);

  const totalHours = calculateTotalHours();
  assert(totalHours === 1020, `Carga horária total somada item a item totaliza 1.020h (Divergência auditada entre 1.020h e 1.000h).`);

  const ordersMatch = DISCIPLINES.every((d, i) => d.order === i + 1);
  assert(ordersMatch, 'A ordenação das 20 disciplinas é rigorosamente sequencial de 1 a 20.');

  // =========================================================================
  // SEÇÃO 2: AUDITORIA DO DESBLOQUEIO SEQUENCIAL NO BACKEND
  // =========================================================================
  const studentUserA = await db.upsertGoogleUser({
    googleSub: 'google-sub-audit-a-' + Date.now(),
    email: 'estudante.a.audit@if.edu.br',
    name: 'Estudante Audit A',
  });
  const testStudentA = studentUserA.id;

  const studentUserB = await db.upsertGoogleUser({
    googleSub: 'google-sub-audit-b-' + Date.now(),
    email: 'estudante.b.audit@if.edu.br',
    name: 'Estudante Audit B',
  });
  const testStudentB = studentUserB.id;

  // Teste: Passo 2 sem Passo 1 concluído deve ser rejeitado pelo backend
  const invalidStep2 = await db.completeStep(testStudentA, 'disc-01', 'disc-01-aula-1', 2);
  assert(invalidStep2.success === false, 'Backend bloqueia avanço para o Passo 2 sem conclusão prévia do Passo 1.');

  // Conclusão válida do Passo 1 (Vídeo)
  const step1 = await db.completeStep(testStudentA, 'disc-01', 'disc-01-aula-1', 1);
  assert(step1.success === true, 'Backend valida conclusão do Passo 1.');

  // Agora Passo 2 (Slides) é liberado
  const step2 = await db.completeStep(testStudentA, 'disc-01', 'disc-01-aula-1', 2);
  assert(step2.success === true, 'Backend valida conclusão do Passo 2 após Passo 1.');

  // Passo 3 (PDF) é concluído
  const step3 = await db.completeStep(testStudentA, 'disc-01', 'disc-01-aula-1', 3);
  assert(step3.success === true, 'Backend valida conclusão do Passo 3.');

  // =========================================================================
  // SEÇÃO 3: TESTES DE FIXAÇÃO POR AULA (CORREÇÃO NO SERVIDOR)
  // =========================================================================
  const failedFixation = await db.gradeQuiz(testStudentA, 'disc-01', 'disc-01-aula-1', [0, 0, 1]);
  assert(failedFixation.passed === false, 'Teste de fixação com nota < 7.0 não aprova o aluno.');

  const passedFixation = await db.gradeQuiz(testStudentA, 'disc-01', 'disc-01-aula-1', [1, 2, 0]);
  assert(passedFixation.passed === true && passedFixation.score >= 7.0, 'Teste de fixação com respostas corretas aprova com nota >= 7.0.');

  // Passo 5 (Liberação) após aprovação no teste de fixação
  const step5 = await db.completeStep(testStudentA, 'disc-01', 'disc-01-aula-1', 5);
  assert(step5.success === true, 'Passo 5 conclui a aula e libera a próxima.');

  // =========================================================================
  // SEÇÃO 4: AVALIAÇÃO FINAL DO COMPONENTE (10 QUESTÕES) VS TESTE DE AULA
  // =========================================================================
  const finalQuestions = await db.getDisciplineFinalExamQuestions('disc-01');
  assert(finalQuestions.length === 10, 'A Avaliação Final do componente curricular possui exatamente 10 questões.');

  // Tentativa de fazer Avaliação Final sem concluir todas as aulas da disciplina deve ser bloqueada
  let blockedExamTriggered = false;
  try {
    // Aluno A concluiu apenas a aula 1, mas disc-01 tem 4 aulas
    await db.gradeFinalExam(testStudentA, 'disc-01', [1, 2, 0, 1, 0, 0, 0, 0, 1, 0]);
  } catch (err: any) {
    blockedExamTriggered = err.status === 403;
  }
  assert(blockedExamTriggered, 'Backend bloqueia Avaliação Final quando nem todas as aulas da disciplina foram concluídas.');

  // Concluir as aulas restantes para permitir a Avaliação Final
  const disc1Lessons = getDisciplineLessons('disc-01');
  for (const lesson of disc1Lessons) {
    for (let s = 1; s <= 5; s++) {
      await db.completeStep(testStudentA, 'disc-01', lesson.id, s, s === 4 ? 10.0 : undefined);
    }
  }

  // Agora aluno A faz a Avaliação Final com nota reprobatória (< 7.0)
  const failedFinalAttempt = await db.gradeFinalExam(testStudentA, 'disc-01', [0, 0, 1, 2, 3, 0, 1, 2, 3, 0]);
  assert(failedFinalAttempt.passed === false, 'Avaliação Final com aproveitamento insuficiente (< 7.0) reprova na tentativa.');

  // Aluno A realiza nova tentativa com nota aprovatória (>= 7.0)
  const passedFinalAttempt = await db.gradeFinalExam(testStudentA, 'disc-01', [1, 2, 0, 1, 0, 0, 0, 0, 1, 0]);
  assert(passedFinalAttempt.passed === true && passedFinalAttempt.score >= 7.0, 'Avaliação Final com nota >= 7.0 concede aprovação no componente curricular.');

  const disc1Approval = await db.getDisciplineApproval(testStudentA, 'disc-01');
  assert(disc1Approval !== null && disc1Approval.approved === true, 'Aprovação formal registrada no banco de dados para a disciplina.');

  // =========================================================================
  // SEÇÃO 5: ISOLAMENTO DO HISTÓRICO DO TUTOR IA ENTRE ALUNOS
  // =========================================================================
  await db.addChatMessage({
    userId: testStudentA,
    role: 'user',
    content: 'Pergunta estritamente confidencial do Aluno A sobre gradiente descendente.',
    disciplineId: 'disc-01',
  });

  const studentBHistory = await db.getChatHistory(testStudentB, 'disc-01');
  const studentAHistory = await db.getChatHistory(testStudentA, 'disc-01');

  assert(studentBHistory.length === 0, 'Histórico de chat do Aluno B não contém mensagens do Aluno A (Isolamento confirmado).');
  assert(studentAHistory.length === 1, 'Histórico de chat do Aluno A contém sua respectiva mensagem.');

  // =========================================================================
  // SEÇÃO 6: AUDITORIA DE AUTENTICAÇÃO E PREVENÇÃO DE ELEVAÇÃO DE PRIVILÉGIOS
  // =========================================================================
  const publicUser = await db.upsertGoogleUser({
    googleSub: 'google-sub-public-student-99',
    email: 'estudante.comum@gmail.com',
    name: 'Estudante Comum',
  });
  assert(publicUser.role === 'aluno', 'Cadastro público Google recebe perfil estrito de "aluno" (Sem elevação a administrador).');

  const adminEmail = process.env.ADMIN_EMAIL || 'josel6449@gmail.com';
  const adminUser = await db.upsertGoogleUser({
    googleSub: 'google-sub-admin-official-01',
    email: adminEmail,
    name: 'Administrador Oficial',
  });
  assert(adminUser.role === 'administrador', `Apenas o e-mail pré-designado (${adminEmail}) recebe privilégio de "administrador".`);

  // =========================================================================
  // SEÇÃO 7: AUDITORIA DE REGRAS DE CERTIFICAÇÃO
  // =========================================================================
  const certAuditIncomplete = await db.issueCertificateIfEligible(testStudentA);
  assert(
    Boolean(certAuditIncomplete.eligible === false && certAuditIncomplete.reason?.includes('incompletos')),
    'Backend impede emissão de certificado quando menos de 20 componentes foram aprovados.'
  );

  // Simular aprovação dos 20 componentes para testar regra institucional
  for (const d of DISCIPLINES) {
    const lessons = getDisciplineLessons(d.id);
    for (const l of lessons) {
      for (let s = 1; s <= 5; s++) {
        await db.completeStep(testStudentA, d.id, l.id, s, s === 4 ? 10.0 : undefined);
      }
    }
    await db.gradeFinalExam(testStudentA, d.id, [1, 2, 0, 1, 0, 0, 0, 0, 1, 0]);
  }

  const certAuditComplete = await db.issueCertificateIfEligible(testStudentA);
  assert(
    Boolean(certAuditComplete.eligible === false && certAuditComplete.reason?.includes('Etapa 1.1 em vigor')),
    'Em conformidade com a Etapa 1.1, diplomas oficiais não são emitidos antes da homologação institucional formal.'
  );

  // =========================================================================
  // SEÇÃO 8: AUDITORIA DE PROTEÇÃO OPERACIONAL EM PRODUÇÃO
  // =========================================================================
  const health = await db.getHealthStatus();
  assert(health.engine !== undefined, 'Diagnóstico operacional de saúde do banco de dados ativo e respondendo.');

  console.log('🧪 ==============================================================');
  console.log(`🎉 TODOS OS ${passedTests}/${totalTests} TESTES DA AUDITORIA CORRETIVA FORAM APROVADOS!`);
  console.log('🧪 ==============================================================');
}

runAutomatedAuditTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
