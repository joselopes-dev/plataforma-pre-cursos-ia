# Guia de Implantação no Render.com (Etapa 3)

Este documento orienta a implantação completa e segura da **Plataforma Educacional do Curso Técnico de Nível Médio em Inteligência Artificial** no Render.com.

A aplicação utiliza uma arquitetura unificada full-stack: o backend Express (`server.ts`) atende os endpoints da API (`/api/v1/*`), o endpoint de integridade (`/api/health`), serve os materiais didáticos (`/cursos/*`) e entrega a Single Page Application (SPA) React compilada em `/dist`.

---

## 1. Arquitetura e Componentes no Render

| Componente | Tipo no Render | Configuração / Execução |
| :--- | :--- | :--- |
| **Web Service Full-Stack** | Web Service (Node.js) | Executa `server.ts` via `tsx`, servindo a API Express e a SPA compilada na mesma porta. |
| **Banco de Dados Relacional** | PostgreSQL Gerenciado | PostgreSQL 14+ com SSL obrigatório (`sslmode=require`) e schema relacional íntegro. |
| **Migrações e Seeds** | Pre-deploy / CLI | Script não-destrutivo `src/db/migrate.ts` (`npm run migrate`) com transações seguras. |
| **Tutor IA & Motor RAG** | Módulo Servidor | SDK `@google/genai` (`gemini-3.8-flash` e `gemini-embedding-2-preview`) com fallback transparente para vetorização léxica TF-IDF. |
| **Autenticação** | Google Identity Services | Validação criptográfica do token ID no backend via `google-auth-library` e sessões HttpOnly. |

---

## 2. Comandos Oficiais de Build, Migração e Execução

- **Comando de Build:**
  ```bash
  npm install && npm run build
  ```
  *Instala as dependências e executa o build de produção do frontend Vite para a pasta `dist/`.*

- **Comando de Migração (Pre-deploy ou Shell):**
  ```bash
  npm run migrate
  ```
  *Aplica o esquema inicial `001_initial_schema.sql` (se não aplicado) e realiza o seed idempotente (`ON CONFLICT`) dos 20 componentes curriculares e aulas. Não remove dados existentes.*

- **Comando de Inicialização (Start):**
  ```bash
  npm run start
  ```
  *(Equivalente a `tsx server.ts`). Inicia o servidor HTTP Express escutando em `0.0.0.0:${PORT}`.*

- **Caminho de Verificação de Saúde (Health Check Path):**
  ```
  /api/health
  ```

---

## 3. Matriz de Variáveis de Ambiente no Render

Cadastre as variáveis abaixo na seção **Environment** do seu Web Service no painel do Render:

| Variável | Obrigatória | Valor / Instrução | Finalidade / Segurança |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | **Sim** | `production` | Ativa o modo estrito de produção, compressão estática e bloqueio de persistência em memória. |
| `PORT` | **Sim** | `10000` (padrão Render) | Porta de rede em que o Express escutará (`process.env.PORT`). |
| `DATABASE_URL` | **Sim** | `postgres://user:pass@host:5432/dbname?sslmode=require` | String de conexão com o PostgreSQL do Render (**Internal Database URL** recomendada). |
| `ADMIN_EMAIL` | **Sim** | `josel6449@gmail.com` | E-mail do administrador/coordenador homologado para concessão exclusiva de perfil administrativo. |
| `SESSION_SECRET` | **Sim** | String aleatória (mínimo 32 caracteres) | Chave secreta criptográfica para assinatura e integridade de cookies de sessão. |
| `APP_URL` | **Sim** | `https://lms-curso-tecnico-ia.onrender.com` | URL pública oficial da aplicação no Render (utilizada para validar origens de requisições). |
| `GOOGLE_CLIENT_ID` | **Recomendada** | `xxxxxxxxxx.apps.googleusercontent.com` | Client ID Web criado no Google Cloud Console para login dos alunos e professores via Google. |
| `GEMINI_API_KEY` | **Recomendada** | Chave de API do Google AI Studio | Habilita o Tutor IA com Gemini 3.8 Flash e embeddings densos. *(Caso ausente, o sistema ativa automaticamente o fallback léxico TF-IDF).* |

> ⚠️ **Aviso de Segurança:** Nunca faça commit de valores reais de senhas, chaves de API ou segredos no repositório Git. Utilize exclusivamente o painel de variáveis do Render.

---

## 4. Política de Fail-Safe de Produção (PostgreSQL)

O sistema conta com um mecanismo estrito de proteção contra perda de dados (`assertDatabaseAvailable`):
1. **Em modo de desenvolvimento (`NODE_ENV=development`):** Caso o PostgreSQL não esteja conectado, o sistema utiliza o armazenamento em memória controlado para testes locais e emite avisos no terminal.
2. **Em modo de produção (`NODE_ENV=production`):** O sistema **rejeita silenciosamente qualquer tentativa de fallback em memória**. Se o PostgreSQL estiver desconectado ou com credenciais inválidas:
   - Todas as operações de persistência (login, progresso, quizzes, avaliações, chat) retornam imediatamente erro **HTTP 503 (DATABASE_UNAVAILABLE)**.
   - O endpoint `/api/health` responde com **HTTP 503**, informando `status: "degraded"` e `renderDeploymentReady: false`.
   - Nenhuma informação de credencial ou string de conexão interna é vazada nas respostas de erro.

---

## 5. Passo a Passo para Implantação Manual no Render

### Passo 5.1 — Criar o Banco PostgreSQL no Render
1. Acesse o painel [Render Dashboard](https://dashboard.render.com).
2. Clique no botão **New +** e selecione **PostgreSQL**.
3. Defina as configurações:
   - **Name:** `lms-ia-postgres`
   - **Database:** `lms_ia_db`
   - **User:** `lms_admin`
   - **Region:** Selecione a mesma região onde será criado o Web Service (ex: *Oregon (US West)* ou *Frankfurt (EU Central)*).
   - **Plan:** *Free* (ou *Starter* para produção contínua sem scale-to-zero).
4. Clique em **Create Database**.
5. Na página do banco criado, aguarde o status **Available** e copie o valor de **Internal Database URL** (ou **External Database URL** caso faça acesso fora do Render).

---

### Passo 5.2 — Criar o Web Service no Render
1. No [Render Dashboard](https://dashboard.render.com), clique em **New +** e selecione **Web Service**.
2. Conecte o repositório Git do projeto.
3. Preencha as configurações fundamentais:
   - **Name:** `lms-curso-tecnico-ia`
   - **Language / Runtime:** `Node`
   - **Branch:** `main` (ou a branch principal utilizada)
   - **Region:** A mesma do banco PostgreSQL criado no Passo 5.1.
   - **Build Command:** `npm install && npm run build`
   - **Pre-deploy Command:** `npm run migrate`
   - **Start Command:** `npm run start`
   - **Plan:** *Free* ou *Starter*
4. Abra as opções avançadas (**Advanced**) e configure:
   - **Health Check Path:** `/api/health`
5. Na seção **Environment Variables**, cadastre as variáveis listadas na **Seção 3** deste guia.
6. Clique em **Deploy Web Service** (ou **Create Web Service**).

---

### Passo 5.3 — Configuração de Domínio Autorizado no Google Cloud Console
Para habilitar o login Google na aplicação implantada:
1. Acesse o [Google Cloud Console](https://console.cloud.google.com).
2. Navegue até **APIs e Serviços** > **Credenciais**.
3. Abra as configurações do seu **ID do cliente OAuth 2.0 (Aplicativo Web)**.
4. Na seção **Origens JavaScript autorizadas**, adicione a URL gerada pelo Render para o seu serviço:
   - `https://lms-curso-tecnico-ia.onrender.com`
   - `http://localhost:3000` (para permitir testes locais)
5. Na seção **URIs de redirecionamento autorizados**, adicione os mesmos endereços.
6. Clique em **Salvar**.

---

### Passo 5.4 — Validação da Saúde Pós-Deploy

Após o término da implantação, acesse no navegador:
```
https://seu-servico.onrender.com/api/health
```

A resposta JSON esperada deve conter:
```json
{
  "status": "ok",
  "service": "Plataforma Educacional Curso Técnico de IA - Backend LMS",
  "environment": "production",
  "renderDeploymentReady": true,
  "database": {
    "status": "ok",
    "engine": "PostgreSQL (Render)",
    "productionSafe": true,
    "postgres": {
      "configured": true,
      "connected": true,
      "sslEnabled": true
    }
  },
  "curriculum": {
    "totalHours": 1000,
    "hoursIntegrityValid": true,
    "modulesCount": 3,
    "disciplinesCount": 18
  },
  "rag": {
    "configuredEmbeddingModel": "gemini-embedding-2-preview",
    "totalDisciplinesWithMaterials": 6
  }
}
```

Caso o banco ainda não tenha sido conectado, o endpoint retornará HTTP 503 com status `"degraded"`, bloqueando acessos indevidos até que a variável `DATABASE_URL` esteja associada e as migrações concluídas.
