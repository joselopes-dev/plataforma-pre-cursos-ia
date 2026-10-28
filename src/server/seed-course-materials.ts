import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function makePdf(titulo: string, tipo: string) {
  const text = `${tipo} - ${titulo}`;
  const stream = `%PDF-1.4
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
  return stream;
}

const ALL = Array.from({length:20}, (_,i)=>({n:String(i+1).padStart(2,'0'), t:`Aula ${String(i+1).padStart(2,'0')}`, dir:`modulo-${Math.ceil((i+1)/5)}/${String(i+1).padStart(2,'0')}-aula`}));

export function seedAllCourseMaterials() {
  console.log('INICIO DO SEED - GERANDO PDF E VIDEO');
  const roots = [
    path.resolve(__dirname, '../public/cursos'),
    path.resolve(__dirname, '../../public/cursos'),
    path.resolve(__dirname, '../dist/public/cursos'),
    path.resolve(__dirname, '../../dist/public/cursos'),
    path.resolve(__dirname, 'public/cursos'),
  ];
  console.log('Roots:', roots);
  for (const root of [...new Set(roots)]) {
    if (!fs.existsSync(root)) fs.mkdirSync(root, {recursive:true});
    for (const item of ALL) {
      const dp = path.join(root, item.dir);
      fs.mkdirSync(dp, {recursive:true});
      fs.writeFileSync(path.join(dp, `apostila-aula-${item.n}.pdf`), makePdf(item.t, 'Apostila'));
      fs.writeFileSync(path.join(dp, `slides-aula-${item.n}.pdf`), makePdf(item.t, 'Slides'));
      fs.writeFileSync(path.join(dp, `material-complementar-${item.n}.pdf`), makePdf(item.t, 'Complementar'));
      fs.writeFileSync(path.join(dp, `referencias-exercicios-${item.n}.pdf`), makePdf(item.t, 'Refs'));
      const vp = path.join(dp, `video-aula-${item.n}.mp4`);
      if (!fs.existsSync(vp)) fs.writeFileSync(vp, 'FAKE VIDEO PLACEHOLDER - TROCAR POR VIDEO REAL');
    }
  }
  console.log('SEED CONCLUIDO COM PDFs E VIDEOS!');
}