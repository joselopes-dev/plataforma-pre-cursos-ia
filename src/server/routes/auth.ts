import { Router, Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { db } from '../db.ts';

export const authRouter = Router();

const googleClientId = process.env.GOOGLE_CLIENT_ID || '';
const oauth2Client = googleClientId ? new OAuth2Client(googleClientId) : null;
const isProduction = process.env.NODE_ENV === 'production';

// Cookie de Sessão HttpOnly Seguro
export const SESSION_COOKIE_NAME = 'lms_session';
export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax' as const,
  maxAge: 1000 * 60 * 60 * 24 * 7, // 7 dias
  path: '/',
};

// ==============================================================
// 1. CONFIGURAÇÃO PÚBLICA DE AUTENTICAÇÃO (GOOGLE CLIENT ID)
// ==============================================================
authRouter.get('/config', (_req: Request, res: Response) => {
  return res.json({
    googleClientId,
    isConfigured: Boolean(googleClientId),
    environment: isProduction ? 'production' : 'development',
  });
});

// ==============================================================
// 2. LOGIN / CADASTRO REAL COM GOOGLE IDENTITY SERVICES / OIDC
// ==============================================================
authRouter.post('/google', async (req: Request, res: Response) => {
  try {
    const { credential } = req.body;

    if (!credential || typeof credential !== 'string') {
      return res.status(400).json({
        error: 'Credencial Google (ID Token) não fornecida ou em formato inválido.',
      });
    }

    // Se GOOGLE_CLIENT_ID não estiver configurado no servidor, informa a dependência sem simulação
    if (!googleClientId || !oauth2Client) {
      return res.status(503).json({
        error: 'Integração Google OAuth pendente: GOOGLE_CLIENT_ID não configurado no servidor.',
        details: 'Adicione a variável de ambiente GOOGLE_CLIENT_ID no painel do Render com o OAuth 2.0 Client ID gerado no Google Cloud Console.',
      });
    }

    // Validação criptográfica rigorosa do ID Token no backend
    let payload;
    try {
      const ticket = await oauth2Client.verifyIdToken({
        idToken: credential,
        audience: googleClientId,
      });
      payload = ticket.getPayload();
    } catch (verifyErr: any) {
      console.warn('⚠️ Falha na verificação criptográfica do token Google:', verifyErr.message);
      return res.status(401).json({
        error: 'Autenticação Google rejeitada: assinatura, audiência ou validade do ID Token inválidas.',
        details: verifyErr.message,
      });
    }

    if (!payload || !payload.sub || !payload.email) {
      return res.status(401).json({
        error: 'Token Google rejeitado: campos identificador estável (sub) e e-mail são obrigatórios.',
      });
    }

    // Requisito obrigatório: O e-mail precisa ter sido verificado pelo Google
    if (payload.email_verified === false) {
      return res.status(401).json({
        error: 'Token Google rejeitado: o endereço de e-mail informado não foi verificado pelo Google.',
      });
    }

    // Persiste ou recupera o usuário associado ao Google sub estável
    // Novos usuários recebem a função padrão 'aluno'
    const user = await db.upsertGoogleUser({
      googleSub: payload.sub,
      email: payload.email,
      name: payload.name || payload.email.split('@')[0],
      picture: payload.picture,
    });

    // Cria a sessão com identificador criptográfico no banco de dados
    const sessionToken = await db.createSession(
      user.id,
      req.ip || req.socket.remoteAddress,
      req.headers['user-agent']
    );

    // Registro de auditoria institucional
    await db.logAudit(user.id, 'LOGIN_GOOGLE', 'auth', req.ip, {
      email: user.email,
      role: user.role,
      googleSub: payload.sub,
    });

    // Emite o cookie seguro de sessão
    res.cookie(SESSION_COOKIE_NAME, sessionToken, COOKIE_OPTIONS);

    return res.json({
      success: true,
      user,
      message: 'Autenticação Google realizada com sucesso.',
    });
  } catch (error: any) {
    console.error('❌ Erro no processamento de login Google:', error);
    return res.status(error.status || 500).json({
      error: 'Falha interna ao processar autenticação com o Google.',
      details: error.message,
    });
  }
});

// ==============================================================
// 3. RECUPERAR USUÁRIO ATUAL (SESSÃO ATIVA)
// ==============================================================
authRouter.get('/me', async (req: Request, res: Response) => {
  try {
    const token = req.cookies[SESSION_COOKIE_NAME];
    if (!token) {
      return res.status(401).json({ authenticated: false, user: null });
    }

    const user = await db.getSession(token);
    if (!user) {
      res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
      return res.status(401).json({ authenticated: false, user: null });
    }

    return res.json({
      authenticated: true,
      user,
    });
  } catch (error: any) {
    return res.status(error.status || 500).json({ error: error.message });
  }
});

// ==============================================================
// 4. LOGOUT SEGURO
// ==============================================================
authRouter.post('/logout', async (req: Request, res: Response) => {
  try {
    const token = req.cookies[SESSION_COOKIE_NAME];
    if (token) {
      await db.deleteSession(token);
    }
    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    return res.json({ success: true, message: 'Sessão encerrada com sucesso.' });
  } catch (error: any) {
    return res.status(error.status || 500).json({ error: error.message });
  }
});
