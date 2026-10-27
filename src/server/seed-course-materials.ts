import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function makePdf(title: string, body: string) {
  const objs: string[] = [];
  objs.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj');
  objs.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj');
  const t = title.replace(/[()\\]/g,'');
  const b = body.slice(0,180).replace(/[()\\]/g,'');
  const stream = `BT /F1 12 Tf 40 720 Td (${t}) Tj 0 -20 Td (${b}) Tj ET`;
  objs.push(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj`);
  objs.push(`4 0 obj\n<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream\nendobj`);
  objs.push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj');
  let out = '%PDF-1.4\n'; const offs = [0];
  objs.forEach(o => { offs.push(Buffer.byteLength(out)); out += o + '\n'; });
  const xoff = Buffer.byteLength(out);
  let xref = `xref\n0 ${objs.length+1}\n0000000000 65535 f \n`;
  for(let i=1;i<=objs.length;i++) xref += `${String(offs[i]).padStart(10,'0')} 00000 n \n`;
  out += xref + `trailer\n<< /Size ${objs.length+1} /Root 1 0 R >>\nstartxref\n${xoff}\n%%EOF\n`;
  return Buffer.from(out);
}

const ALL = [
  {dir:'modulo-1/01-fundamentos',n:'01',t:'INF-101 Fundamentos'},
  {dir:'modulo-1/02-logica',n:'02',t:'LOG-102 Logica'},
  {dir:'modulo-1/03-python',n:'03',t:'PYTHON-103 Python'},
  {dir:'modulo-1/04-banco-dados',n:'04',t:'BD-104 Banco Dados'},
  {dir:'modulo-1/05-matematica-estatistica',n:'05',t:'MAT-105 Matematica'},
  {dir:'modulo-1/06-fundamentos-ia',n:'06',t:'IA-106 Fundamentos IA'},
  {dir:'modulo-2/07-python-ciencia-dados',n:'07',t:'CD-201 Python Dados'},
  {dir:'modulo-2/08-ml-aplicado',n:'08',t:'MLA-202 ML Aplicado'},
  {dir:'modulo-2/09-deep-learning',n:'09',t:'DL-203 Deep Learning'},
  {dir:'modulo-2/10-pln-chatbots',n:'10',t:'PLN-204 PLN Chatbots'},
  {dir:'modulo-2/11-metodologia',n:'11',t:'MET-205 Metodologia'},
  {dir:'modulo-2/12-pratica-supervisionada-1',n:'12',t:'PPS-206 Pratica I'},
  {dir:'modulo-3/13-seguranca-lgpd',n:'13',t:'SEG-301 Seguranca LGPD'},
  {dir:'modulo-3/14-engenharia-software-ia',n:'14',t:'ES-302 Eng Software IA'},
  {dir:'modulo-3/15-mlops-deploy',n:'15',t:'MLO-303 MLOps Deploy'},
  {dir:'modulo-3/16-assistentes-ia',n:'16',t:'ASS-304 Assistentes IA'},
  {dir:'modulo-3/17-llms-ia',n:'17',t:'LLM-305 LLMs'},
  {dir:'modulo-3/18-visao-computacional',n:'18',t:'VIS-306 Visao'},
  {dir:'modulo-3/19-gestao-projetos-ia',n:'19',t:'GP-307 Gestao Projetos'},
  {dir:'modulo-3/20-pratica-supervisionada-2',n:'20',t:'PPS-308 Pratica II'},
];

export function seedAllCourseMaterials() {
  console.log('INICIO DO SEED');
  const root = path.resolve(__dirname, '../../public/cursos');
  console.log('Gerando em:', root);
  if (!fs.existsSync(root)) fs.mkdirSync(root, {recursive:true});
  for (const item of ALL) {
    const dp = path.join(root, item.dir);
    fs.mkdirSync(dp, {recursive:true});
    const vp = path.join(dp, `video-aula-${item.n}.mp4`);
    if (fs.existsSync(vp) && fs.statSync(vp).size > 100*1024) continue;
    fs.writeFileSync(path.join(dp, `apostila-aula-${item.n}.pdf`), makePdf(item.t, 'Apostila'));
    fs.writeFileSync(path.join(dp, `slides-aula-${item.n}.pdf`), makePdf(item.t+' Slides', 'Slides'));
    fs.writeFileSync(path.join(dp, `material-complementar-${item.n}.pdf`), makePdf(item.t+' Complementar', 'Complementar'));
    fs.writeFileSync(path.join(dp, `referencias-exercicios-${item.n}.pdf`), makePdf(item.t+' Refs', 'Referencias'));
    fs.writeFileSync(path.join(dp, 'README.md'), `# ${item.t}`);
  }
  console.log('SEED CONCLUIDO COM PDFs VALIDOS!');
}