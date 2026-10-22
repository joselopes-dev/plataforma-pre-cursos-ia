# Estrutura de Armazenamento de Materiais Didáticos Locais

Este diretório organiza os recursos pedagógicos oficiais para os 20 componentes curriculares do Curso Técnico de Nível Médio em Inteligência Artificial (1.000 horas).

## Organização por Módulos e Componentes

- `modulo-1/` (340h)
  - `01-fundamentos/`: Fundamentos de Informática, SO e Ferramentas (60h)
  - `02-logica/`: Lógica de Programação e Algoritmos (60h)
  - `03-python/`: Programação em Python (80h)
  - `04-banco-dados/`: Banco de Dados e Big Data (40h)
  - `05-matematica-estatistica/`: Matemática e Estatística Aplicada à IA (60h)
  - `06-fundamentos-ia/`: Fundamentos de IA e Aprendizado de Máquina (60h)

- `modulo-2/` (320h)
  - `07-python-ciencia-dados/`: Python para Ciência de Dados (60h)
  - `08-ml-aplicado/`: Machine Learning Aplicado (60h)
  - `09-deep-learning/`: Redes Neurais Artificiais e Deep Learning (80h)
  - `10-pln-chatbots/`: PLN e Chatbots (40h)
  - `11-metodologia/`: Metodologia para Elaboração de Produções Técnicas (40h)
  - `12-pratica-supervisionada-1/`: Prática Profissional Supervisionada I (40h)

- `modulo-3/` (340h)
  - `13-seguranca-lgpd/`: Segurança, Governança e LGPD (40h)
  - `14-engenharia-software-ia/`: Engenharia de Software para IA (40h)
  - `15-mlops-deploy/`: MLOPS e Deploy (40h)
  - `16-assistentes-ia/`: Planejamento de Assistentes em IA (40h)
  - `17-llms-ia/`: LLMs e Inteligência Artificial (40h)
  - `18-visao-computacional/`: Visão Computacional Aplicada (40h)
  - `19-gestao-projetos-ia/`: Gestão de Projetos em IA (40h)
  - `20-pratica-supervisionada-2/`: Prática Profissional Supervisionada II (60h)

## Padrão de Nomenclatura dos Recursos por Aula
Cada pasta de disciplina comporta os arquivos das suas aulas sequenciais:
1. `video-aula-0X.mp4`: Vídeo da aula expositiva com legenda/transcrição
2. `slides-aula-0X.pdf`: Apresentação visual da aula
3. `apostila-aula-0X.pdf`: Material didático em PDF com exercícios e aprofundamento

## Estratégia de Persistência no Render.com
Em instâncias web no Render (Cloud Run ou Render Web Service), o sistema de arquivos local é efêmero por padrão (reinicializações descartam arquivos gerados dinamicamente).
- **Desenvolvimento**: Arquivos servidos diretamente de `public/cursos/`.
- **Produção no Render**:
  - Opção A (Recomendada para PDFs e vídeos leves): **Render Persistent Disk** montado em `/var/data/cursos` com link simbólico.
  - Opção B (Recomendada para vídeos em alta resolução): **Object Storage compatível com S3 / Google Cloud Storage / Cloudflare R2** com URLs assinadas ou CDN reversa.
