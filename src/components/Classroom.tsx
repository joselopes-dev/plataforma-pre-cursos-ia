import React, { useState, useEffect } from 'react';
import { Discipline, Lesson, User, FinalExamQuestion } from '../types/index.ts';
import { 
  ArrowLeft, Video, SlidersHorizontal, FileText, CheckSquare, Unlock, Lock, CheckCircle2, AlertCircle, Bot, Download, Award, FileCheck
} from 'lucide-react';

interface ClassroomProps {
  disciplineId: string;
  user: User;
  onBack: () => void;
  openTutorWithContext: (disciplineId: string, lessonId: string) => void;
  onProgressUpdated: () => void;
}

export const Classroom: React.FC<ClassroomProps> = ({
  disciplineId, user, onBack, openTutorWithContext, onProgressUpdated,
}) => {
  const [disciplineData, setDisciplineData] = useState<{ discipline: Discipline; lessons: Lesson[] } | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string>('');
  const [activeStepNumber, setActiveStepNumber] = useState<number>(1);
  const [progressMap, setProgressMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({ 0: -1, 1: -1, 2: -1 });
  const [quizResult, setQuizResult] = useState<{ score: number; passed: boolean; feedback: string; explanation: string } | null>(null);
  const [isFinalExamActive, setIsFinalExamActive] = useState<boolean>(false);
  const [finalExamQuestions, setFinalExamQuestions] = useState<FinalExamQuestion[]>([]);
  const [finalExamAnswers, setFinalExamAnswers] = useState<Record<number, number>>({});
  const [finalExamResult, setFinalExamResult] = useState<{ score: number; passed: boolean; feedback: string } | null>(null);
  const [isDisciplineApproved, setIsDisciplineApproved] = useState<boolean>(false);
  const [finalGrade, setFinalGrade] = useState<number | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await fetch(`/api/v1/curriculum/disciplines/${disciplineId}`);
        const data = await res.json();
        setDisciplineData(data);
        if (data.lessons && data.lessons.length > 0) setActiveLessonId(data.lessons[0].id);
        const progRes = await fetch('/api/v1/progress');
        const progData = await progRes.json();
        const map: Record<string, boolean> = {};
        if (progData.rawProgress) {
          progData.rawProgress.forEach((p: any) => {
            if (p.disciplineId === disciplineId && p.completed) map[`${p.lessonId}:${p.stepNumber}`] = true;
          });
        }
        setProgressMap(map);
        const approval = progData.approvals?.find((a: any) => a.disciplineId === disciplineId && a.approved);
        if (approval) { setIsDisciplineApproved(true); setFinalGrade(approval.finalGrade); }
      } catch (err) { console.error('Erro ao carregar dados da disciplina:', err); } finally { setLoading(false); }
    }
    loadData();
  }, [disciplineId]);

  if (loading || !disciplineData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-[#006633] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold text-gray-600">Carregando ambiente da sala de aula...</p>
        </div>
      </div>
    );
  }

  const { discipline, lessons } = disciplineData;
  const currentLesson = lessons.find((l) => l.id === activeLessonId) || lessons[0];

  // ================== FIX DEFINITIVO - 3 APOSTILAS + SEM REPLICAÇÃO ==================
  const lessonIndex = (lessons.findIndex((l) => l.id === currentLesson.id) + 1) || 1;
  const moduleNum = Number(discipline.moduleId) || 1;
  
  // Offset para manter numeração global: modulo-1 = 01-06, modulo-2 = 07-12, modulo-3 = 13-20
  const moduleOffsets: Record<number, number> = { 1: 0, 2: 6, 3: 12 };
  const offset = moduleOffsets[moduleNum] || 0;
  const globalNum = offset + lessonIndex;
  const padded = String(globalNum).padStart(2, '0');

  const realFolderMap: Record<number, Record<string, string>> = {
    1: { '01': '01-fundamentos', '02': '02-logica', '03': '03-python', '04': '04-banco-dados', '05': '05-matematica-estatistica', '06': '06-fundamentos-ia' },
    2: { '07': '07-python-ciencia-dados', '08': '08-ml-aplicado', '09': '09-deep-learning', '10': '10-pln-chatbots', '11': '11-metodologia', '12': '12-pratica-supervisionada-1' },
    3: { '13': '13-seguranca-lgpd', '14': '14-engenharia-software-ia', '15': '15-mlops-deploy', '16': '16-assistentes-ia', '17': '17-llms-ia', '18': '18-visao-computacional', '19': '19-gestao-projetos-ia', '20': '20-pratica-supervisionada-2' },
  };

  const lessonFolder = realFolderMap[moduleNum]?.[padded] || `${padded}-aula`;
  const basePath = `/cursos/modulo-${moduleNum}/${lessonFolder}`;
  // ===================================================================================

  const areAllLessonsCompleted = lessons.every((l) => Boolean(progressMap[`${l.id}:5`]));
  const isStepUnlocked = (stepNum: number) => stepNum === 1 || Boolean(progressMap[`${currentLesson.id}:${stepNum - 1}`]);
  const isStepCompleted = (stepNum: number) => Boolean(progressMap[`${currentLesson.id}:${stepNum}`]);

  const handleCompleteStep = async (stepNum: number) => {
    try {
      setActionLoading(true); setFeedbackMessage(null);
      const res = await fetch('/api/v1/progress/step', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ disciplineId: discipline.id, lessonId: currentLesson.id, stepNumber: stepNum }) });
      const result = await res.json();
      if (!res.ok) { setFeedbackMessage({ type: 'error', text: result.message || result.error }); return; }
      setProgressMap((prev) => ({ ...prev, [`${currentLesson.id}:${stepNum}`]: true }));
      setFeedbackMessage({ type: 'success', text: result.message }); onProgressUpdated();
      if (stepNum < 5) setActiveStepNumber(stepNum + 1);
    } catch (err: any) { setFeedbackMessage({ type: 'error', text: 'Falha: ' + err.message }); } finally { setActionLoading(false); }
  };

  const handleSubmitQuiz = async () => {
    try {
      setActionLoading(true);
      const answersArray = [quizAnswers[0], quizAnswers[1], quizAnswers[2]];
      if (answersArray.some((a) => a === -1)) { setFeedbackMessage({ type: 'error', text: 'Responda as 3 questões.' }); setActionLoading(false); return; }
      const res = await fetch('/api/v1/progress/quiz', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ disciplineId: discipline.id, lessonId: currentLesson.id, answers: answersArray }) });
      const result = await res.json(); setQuizResult(result);
      if (result.passed) { setProgressMap((prev) => ({ ...prev, [`${currentLesson.id}:4`]: true })); setFeedbackMessage({ type: 'success', text: result.feedback }); onProgressUpdated(); setActiveStepNumber(5); }
      else setFeedbackMessage({ type: 'error', text: result.feedback });
    } catch (err: any) { setFeedbackMessage({ type: 'error', text: 'Erro: ' + err.message }); } finally { setActionLoading(false); }
  };

  const handleOpenFinalExam = async () => {
    try {
      setActionLoading(true); setIsFinalExamActive(true);
      const res = await fetch(`/api/v1/progress/final-exam/${discipline.id}`); const data = await res.json();
      if (!res.ok) { setFeedbackMessage({ type: 'error', text: data.error }); setIsFinalExamActive(false); return; }
      setFinalExamQuestions(data.questions || []);
      const initialAnswers: Record<number, number> = {}; for (let i = 0; i < 10; i++) initialAnswers[i] = -1; setFinalExamAnswers(initialAnswers);
    } catch (err: any) { setFeedbackMessage({ type: 'error', text: 'Falha: ' + err.message }); setIsFinalExamActive(false); } finally { setActionLoading(false); }
  };

  const handleSubmitFinalExam = async () => {
    try {
      setActionLoading(true); const answersArray: number[] = []; for (let i = 0; i < 10; i++) answersArray.push(finalExamAnswers[i] ?? -1);
      if (answersArray.some((a) => a === -1)) { setFeedbackMessage({ type: 'error', text: 'Responda as 10 questões.' }); setActionLoading(false); return; }
      const res = await fetch(`/api/v1/progress/final-exam/${discipline.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers: answersArray }) });
      const result = await res.json(); setFinalExamResult(result);
      if (result.passed) { setIsDisciplineApproved(true); setFinalGrade(result.score); setFeedbackMessage({ type: 'success', text: result.feedback }); onProgressUpdated(); }
      else setFeedbackMessage({ type: 'error', text: result.feedback });
    } catch (err: any) { setFeedbackMessage({ type: 'error', text: 'Erro: ' + err.message }); } finally { setActionLoading(false); }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-white p-5 rounded-2xl border border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button onClick={onBack} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 cursor-pointer"><ArrowLeft className="w-4 h-4" /></button>
          <div>
            <div className="flex items-center space-x-2">
              <span className="bg-emerald-100 text-[#006633] text-xs font-black px-2 py-0.5 rounded uppercase">{discipline.code}</span>
              <span className="text-xs font-semibold text-gray-500">Módulo {discipline.moduleId} • {discipline.hours}h</span>
              {isDisciplineApproved && <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded flex items-center space-x-1"><CheckCircle2 className="w-3 h-3" /><span>Aprovado ({finalGrade?.toFixed(1)})</span></span>}
            </div>
            <h1 className="text-xl font-bold text-gray-900 mt-0.5">{discipline.title}</h1>
          </div>
        </div>
        <button onClick={() => openTutorWithContext(discipline.id, currentLesson.id)} className="bg-emerald-50 hover:bg-emerald-100 text-[#006633] border border-emerald-300 font-bold px-3.5 py-2 rounded-lg text-xs flex items-center space-x-2 cursor-pointer"><Bot className="w-4 h-4" /><span>Tirar Dúvida</span></button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-xs font-extrabold text-gray-400 uppercase px-1">Aulas ({lessons.length})</h2>
          <div className="space-y-2">
            {lessons.map((lesson, idx) => {
              const isSelected = !isFinalExamActive && lesson.id === currentLesson.id;
              const isPrevDone = idx === 0 || Boolean(progressMap[`${lessons[idx - 1].id}:5`]);
              const isDone = Boolean(progressMap[`${lesson.id}:5`]);
              return (
                <button key={lesson.id} disabled={!isPrevDone} onClick={() => { setIsFinalExamActive(false); setActiveLessonId(lesson.id); setActiveStepNumber(1); setFeedbackMessage(null); }} className={`w-full text-left p-3.5 rounded-xl border text-xs flex justify-between gap-2 cursor-pointer ${isSelected ? 'border-[#006633] bg-emerald-50 ring-1 ring-[#006633]' : isPrevDone ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
                  <div><span className="font-bold">{lesson.title}</span><p className="text-[11px] text-gray-500">{lesson.summary}</p></div>
                  {isDone ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>}
                </button>
              );
            })}
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-[11px]">
            <span className="font-bold">Caminho real:</span>
            <p className="font-mono text-[10px] text-emerald-800 break-all">{basePath}/video-aula-{padded}.mp4</p>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-5">
          {feedbackMessage && <div className={`p-4 rounded-xl border text-xs flex items-center space-x-2 ${feedbackMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>{feedbackMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}<span>{feedbackMessage.text}</span></div>}

          {isFinalExamActive ? (
            <div className="bg-white p-6 rounded-2xl border space-y-6">
              <h3 className="text-xl font-black">Avaliação Final — {discipline.code}</h3>
              <div className="space-y-4">{finalExamQuestions.map((q, qi) => (<div key={q.id} className="border rounded-xl p-4 bg-gray-50/40"><p className="text-xs font-bold">{q.question}</p><div className="space-y-2 mt-2">{q.options.map((opt, oi) => (<label key={oi} className={`flex space-x-2 p-2.5 rounded-lg border text-xs cursor-pointer ${finalExamAnswers[qi] === oi ? 'border-[#006633] bg-emerald-50 font-semibold' : 'border-gray-200 bg-white'}`}><input type="radio" checked={finalExamAnswers[qi] === oi} onChange={() => setFinalExamAnswers({ ...finalExamAnswers, [qi]: oi })} /><span>{opt}</span></label>))}</div></div>))}</div>
              <button disabled={actionLoading} onClick={handleSubmitFinalExam} className="w-full bg-[#006633] text-white font-bold py-3.5 rounded-xl text-xs flex items-center justify-center space-x-2 cursor-pointer"><FileCheck className="w-4 h-4" /><span>Submeter Avaliação</span></button>
            </div>
          ) : (
            <>
              <div className="bg-white p-4 rounded-xl border">
                <div className="grid grid-cols-5 gap-2 text-center text-xs">
                  {[{ num: 1, label: '1. Vídeo', icon: Video }, { num: 2, label: '2. Slides', icon: SlidersHorizontal }, { num: 3, label: '3. PDF', icon: FileText }, { num: 4, label: '4. Teste', icon: CheckSquare }, { num: 5, label: '5. Liberação', icon: Unlock }].map(({ num, label, icon: Icon }) => {
                    const done = isStepCompleted(num); const unlocked = isStepUnlocked(num); const cur = activeStepNumber === num;
                    return <button key={num} disabled={!unlocked} onClick={() => setActiveStepNumber(num)} className={`p-2.5 rounded-lg border font-semibold flex flex-col items-center space-y-1 cursor-pointer ${done ? 'border-emerald-300 bg-emerald-50' : cur ? 'border-[#006633] bg-[#006633] text-white' : unlocked ? 'border-gray-200 bg-white' : 'bg-gray-50 text-gray-400'}`}><Icon className="w-4 h-4" /><span className="text-[11px]">{label}</span></button>;
                  })}
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border min-h-[420px] flex flex-col justify-between">
                {activeStepNumber === 1 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold">Vídeo-Aula {padded}</h3>
                    <div className="aspect-video bg-gray-900 rounded-xl overflow-hidden"><video controls className="w-full h-full object-contain" src={`${basePath}/video-aula-${padded}.mp4`} /></div>
                    <button disabled={actionLoading} onClick={() => handleCompleteStep(1)} className="w-full bg-[#006633] text-white font-bold py-3 rounded-xl text-xs cursor-pointer">Concluir Vídeo</button>
                  </div>
                )}
                {activeStepNumber === 2 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold">Slides {padded}</h3>
                    <div className="border-2 border-dashed rounded-xl p-8 text-center bg-gray-50/50"><SlidersHorizontal className="w-12 h-12 text-emerald-700 mx-auto" /><p className="text-[11px] font-mono text-emerald-800 mt-2">{basePath}/slides-aula-{padded}.pdf</p><a href={`${basePath}/slides-aula-${padded}.pdf`} target="_blank" rel="noreferrer" className="inline-flex mt-3 items-center space-x-2 bg-white border border-emerald-300 px-3.5 py-2 rounded-lg text-xs font-bold cursor-pointer"><Download className="w-3.5 h-3.5" /><span>Baixar Slides</span></a></div>
                    <button disabled={actionLoading} onClick={() => handleCompleteStep(2)} className="w-full bg-[#006633] text-white font-bold py-3 rounded-xl text-xs cursor-pointer">Concluir Slides</button>
                  </div>
                )}
                {activeStepNumber === 3 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold">Material Didático - 3 Apostilas</h3>
                    <div className="bg-gray-50 border rounded-xl p-6 space-y-2"><p className="text-xs font-bold">Apostila Principal {padded}</p><p className="text-[11px] font-mono">{basePath}/apostila-aula-{padded}.pdf</p><a href={`${basePath}/apostila-aula-${padded}.pdf`} target="_blank" rel="noreferrer" className="inline-flex bg-[#006633] text-white px-3.5 py-2 rounded-lg text-xs font-bold cursor-pointer"><Download className="w-3.5 h-3.5 mr-2" />Baixar Apostila 1</a></div>
                    <div className="bg-gray-50 border rounded-xl p-6 space-y-2"><p className="text-xs font-bold">Apostila 2 - Complementar</p><p className="text-[11px] font-mono">{basePath}/material-complementar-${padded}.pdf</p><a href={`${basePath}/material-complementar-${padded}.pdf`} target="_blank" rel="noreferrer" className="inline-flex bg-[#006633] text-white px-3.5 py-2 rounded-lg text-xs font-bold cursor-pointer"><Download className="w-3.5 h-3.5 mr-2" />Baixar Apostila 2</a></div>
                    <div className="bg-gray-50 border rounded-xl p-6 space-y-2"><p className="text-xs font-bold">Apostila 3 - Referências</p><p className="text-[11px] font-mono">{basePath}/referencias-exercicios-${padded}.pdf</p><a href={`${basePath}/referencias-exercicios-${padded}.pdf`} target="_blank" rel="noreferrer" className="inline-flex bg-[#006633] text-white px-3.5 py-2 rounded-lg text-xs font-bold cursor-pointer"><Download className="w-3.5 h-3.5 mr-2" />Baixar Apostila 3</a></div>
                    <button disabled={actionLoading} onClick={() => handleCompleteStep(3)} className="w-full bg-[#006633] text-white font-bold py-3 rounded-xl text-xs cursor-pointer">Confirmar Leitura das 3 Apostilas</button>
                  </div>
                )}
                {activeStepNumber === 4 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold">Teste de Fixação</h3>
                    <button disabled={actionLoading} onClick={handleSubmitQuiz} className="w-full bg-[#006633] text-white font-bold py-3 rounded-xl text-xs cursor-pointer">Submeter Respostas</button>
                  </div>
                )}
                {activeStepNumber === 5 && (
                  <div className="space-y-4">
                    <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-8 text-center"><Award className="w-8 h-8 text-[#006633] mx-auto" /><h4 className="font-extrabold mt-2">Aula {padded} Concluída!</h4></div>
                    <button disabled={actionLoading} onClick={() => handleCompleteStep(5)} className="w-full bg-[#006633] text-white font-bold py-3 rounded-xl text-xs cursor-pointer">Confirmar e Prosseguir</button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};