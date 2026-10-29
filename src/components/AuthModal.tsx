import React, { useEffect, useState } from 'react';
import { X, ShieldCheck, AlertCircle, Lock, Info, ExternalLink } from 'lucide-react';
import { UserRole } from '../types/index.ts';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: any) => void;
  onDevLogin: (role: UserRole) => void;
}


export const AuthModal = ({ isOpen, onClose, onLoginSuccess, onDevLogin }: AuthModalProps) => {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [googleClientId, setGoogleClientId] = useState<string>('');
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [configChecked, setConfigChecked] = useState<boolean>(false);

  // 1. Busca a configuração de OAuth do servidor (Google Client ID público)
  useEffect(() => {
    if (!isOpen) return;

    fetch('/api/v1/auth/config')
      .then((res) => res.json())
      .then((data) => {
        setGoogleClientId(data.googleClientId || '');
        setIsConfigured(Boolean(data.isConfigured));
        setConfigChecked(true);
      })
      .catch((err) => {
        console.warn('⚠️ Erro ao obter configuração de autenticação:', err);
        setConfigChecked(true);
      });
  }, [isOpen]);

  // 2. Inicializa Google Identity Services quando a configuração estiver pronta
  useEffect(() => {
    if (!isOpen || !googleClientId) return;

    const google = (window as any).google;
    if (google && google.accounts && google.accounts.id) {
      try {
        google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response: any) => {
            if (response.credential) {
              setLoading(true);
              setErrorMessage(null);
              try {
                const res = await fetch('/api/v1/auth/google', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ credential: response.credential }),
                });

                const data = await res.json();
                if (!res.ok) {
                  setErrorMessage(data.error || 'Falha na validação com o Google.');
                } else {
                  onLoginSuccess(data.user);
                  onClose();
                }
              } catch (err: any) {
                setErrorMessage('Erro ao conectar ao servidor: ' + err.message);
              } finally {
                setLoading(false);
              }
            }
          },
        });

        const targetDiv = document.getElementById('google-btn-container');
        if (targetDiv) {
          google.accounts.id.renderButton(targetDiv, {
            theme: 'outline',
            size: 'large',
            width: 320,
            text: 'continue_with',
            shape: 'rectangular',
          });
        }
      } catch (err) {
        console.warn('Erro ao inicializar Google Identity Services:', err);
      }
    }
  }, [isOpen, googleClientId]);

  // Manipulador do clique no botão oficial "Continuar com Google"
  const handleGoogleSignInClick = () => {
    setErrorMessage(null);

    if (!googleClientId) {
      setErrorMessage(
        'Configuração Google OAuth pendente no servidor: A variável GOOGLE_CLIENT_ID não está configurada no ambiente. Adicione-a no painel do Render com o OAuth Client ID gerado no Google Cloud Console.'
      );
      return;
    }

    const google = (window as any).google;
    if (google && google.accounts && google.accounts.id) {
      try {
        google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            console.log('Google One Tap não exibido automaticamente; utilize o seletor da conta.');
          }
        });
      } catch (err: any) {
        setErrorMessage('Não foi possível inicializar a janela do Google: ' + err.message);
      }
    } else {
      setErrorMessage('A biblioteca Google Identity Services ainda está sendo carregada. Tente novamente em instantes.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-200 flex flex-col">
        {/* Cabeçalho */}
        <div className="bg-[#004d25] text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-white">
              <Lock className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-black tracking-tight text-white font-mono">CAMPOS IA</h2>
                <span className="text-[10px] bg-emerald-700/80 text-emerald-200 px-1.5 py-0.5 rounded font-bold uppercase">
                  Acesso Oficial
                </span>
              </div>
              <p className="text-[11px] text-emerald-200/80">
                Curso Técnico de Nível Médio em Inteligência Artificial (1.000h)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-6 space-y-5 text-xs text-gray-700">
          <div className="text-center space-y-1">
            <h3 className="text-base font-bold text-gray-900">Entrar na plataforma CAMPOS IA</h3>
            <p className="text-gray-500 text-xs leading-relaxed">
              Utilize sua conta Google. Novos cadastros são registrados automaticamente como <strong>aluno</strong>, com acesso integral à matriz curricular, aulas interativas, tutor IA e salvamento do progresso.
            </p>
          </div>

          {errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-red-700 flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
              <div className="space-y-1 text-xs leading-relaxed">
                <p className="font-semibold text-red-900">Atenção</p>
                <p>{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Botão Oficial Google Identity Services */}
          <div className="flex flex-col items-center justify-center py-2 space-y-3">
            {/* Contêiner GIS Oficial (Renderizado pelo Google quando configurado) */}
            <div id="google-btn-container" className="min-h-[44px]"></div>

            {/* Botão Oficial Padronizado "Continuar com Google" */}
            <button
              onClick={handleGoogleSignInClick}
              disabled={loading}
              className="w-full max-w-[320px] bg-white hover:bg-gray-50 text-gray-700 font-semibold py-2.5 px-4 border border-gray-300 rounded-lg shadow-xs flex items-center justify-center space-x-3 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span className="text-sm font-medium">Continuar com Google</span>
            </button>
          </div>

          {/* Informação sobre dependência GOOGLE_CLIENT_ID caso não configurada */}
          {configChecked && !isConfigured && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-800 text-[11px] space-y-1.5 leading-relaxed">
              <div className="flex items-center space-x-1.5 font-bold text-amber-900">
                <Info className="w-3.5 h-3.5 text-amber-600" />
                <span>Configuração de Produção Pendente</span>
              </div>
              <p>
                O login real com Google exige a variável <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-semibold">GOOGLE_CLIENT_ID</code>. Configure-a no painel do Render com as credenciais do seu projeto no Google Cloud Console.
              </p>
            </div>
          )}

          {/* Garantias de Segurança */}
          <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 flex items-start space-x-2.5 leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-950">Segurança e Privacidade</p>
              <p className="mt-0.5 text-emerald-800/90">
                A validação criptográfica do ID Token é executada exclusivamente pelo backend. A sessão é protegida por cookie <code className="bg-emerald-100/70 px-1 py-0.2 rounded font-mono">HttpOnly</code> com política de isolamento rigorosa, sem armazenamento de tokens sensíveis no navegador.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
