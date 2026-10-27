console.log('INICIO DO SEED');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../public/cursos');
console.log('Gerando materiais em:', root);

if (!fs.existsSync(root)) fs.mkdirSync(root, {recursive:true});

const mods = [
"modulo-1/01-fundamentos",
"modulo-1/02-logica",
"modulo-1/03-python",
"modulo-1/04-banco-dados",
"modulo-1/05-matematica-estatistica",
"modulo-1/06-fundamentos-ia",
"modulo-2/07-python-ciencia-dados",
"modulo-2/08-ml-aplicado",
"modulo-2/09-deep-learning",
"modulo-2/10-pln-chatbots",
"modulo-2/11-metodologia",
"modulo-2/12-pratica-supervisionada-1",
"modulo-3/13-seguranca-lgpd",
"modulo-3/14-engenharia-software-ia",
"modulo-3/15-mlops-deploy",
"modulo-3/16-assistentes-ia",
"modulo-3/17-llms-ia",
"modulo-3/18-visao-computacional",
"modulo-3/19-gestao-projetos-ia",
"modulo-3/20-pratica-supervisionada-2"
];

for (const m of mods) {
  const dirPath = path.join(root, m);
  fs.mkdirSync(dirPath, {recursive:true});
  const num = m.split('/')[1].split('-')[0];
  const videoPath = path.join(dirPath, `video-aula-${num}.mp4`);
  if (fs.existsSync(videoPath)) {
    const sz = fs.statSync(videoPath).size;
    if (sz > 100*1024) console.log(`PRESERVANDO VIDEO REAL ${m} ${(sz/1024/1024).toFixed(1)}MB`);
  }
  fs.writeFileSync(path.join(dirPath, `README.md`), `# ${m}`, 'utf8');
  fs.writeFileSync(path.join(dirPath, `apostila-aula-${num}.pdf`), `%PDF-1.4 teste ${m}`);
  console.log(`✓ ${m}`);
}
console.log('Seed concluido!');