import React, { useState } from 'react';
//import { User } from '../types/index.ts';
import { User, UserRole } from '../types/index.ts';
import { 
  GraduationCap, 
  Bot, 
  Server, 
  Award, 
  LogOut, 
  User as UserIcon, 
  ShieldCheck, 
  BookOpen, 
  Activity, 
  ChevronDown
} from 'lucide-react';

interface HeaderProps {
  user: User | null;
  activeTab: 'dashboard' | 'catalogo' | 'sala' | 'certificados' | 'gestao';
  setActiveTab: (tab: 'dashboard' | 'catalogo' | 'sala' | 'certificados' | 'gestao') => void;
  openTutor: () => void;
  openAuditModal: () => void;
  openAuthModal: () => void;
  onLogout: () => void;
    onSwitchUserRole: (role: UserRole) => void;
  isPostgresConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  activeTab,
  setActiveTab,
  openTutor,
  openAuditModal,
  openAuthModal,
  onSwitchUserRole,
  onLogout,
  isPostgresConnected,
}) => {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-emerald-900/10 shadow-xs">
      {/* Barra Institucional Superior */}
      <div className="bg-[#004d25] text-white px-4 py-1 text-xs flex justify-between items-center tracking-wide">
        <div className="flex items-center space-x-2">
          <span className="font-black text-emerald-200 tracking-wider font-mono">CAMPOS IA</span>
          <span className="text-emerald-400/60">•</span>
          <span className="text-emerald-100/90 font-medium">CURSO TÉCNICO DE NÍVEL MÉDIO EM INTELIGÊNCIA ARTIFICIAL (1.000h)</span>
        </div>
        <div className="flex items-center space-x-4">
          <button 
            onClick={openAuditModal}
            className="flex items-center space-x-1 hover:text-emerald-200 transition-colors cursor-pointer"
            title="Verificar status do servidor e deploy no Render"
          >
            <span className={`inline-block w-2 h-2 rounded-full ${isPostgresConnected ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
            <span className="hidden sm:inline">
              {isPostgresConnected ? 'PostgreSQL Render: Conectado' : 'Modo Resiliente Ativo'}
            </span>
          </button>
        </div>
      </div>

      {/* Barra de Navegação Principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo e Identidade Visual CAMPOS IA */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#006633] to-[#004d25] text-white flex items-center justify-center shadow-md border border-emerald-500/30">
              <GraduationCap className="w-6 h-6 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <span className="font-black text-gray-950 tracking-tight text-xl font-mono sm:text-2xl">
                  CAMPOS IA
                </span>
                <span className="bg-[#006633] text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider shadow-xs">
                  CURSO TÉCNICO
                </span>
              </div>
              <p className="text-[11px] text-gray-500 font-medium">Plataforma Educacional em Inteligência Artificial</p>
            </div>
          </div>

          {/* Menus de Navegação */}
          <nav className="hidden md:flex space-x-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'dashboard'
                  ? 'bg-emerald-50 text-[#006633] font-semibold'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Painel</span>
            </button>

            <button
              onClick={() => setActiveTab('catalogo')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'catalogo'
                  ? 'bg-emerald-50 text-[#006633] font-semibold'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Matriz Curricular</span>
              <span className="text-xs bg-emerald-100 text-[#006633] px-1.5 py-0.2 rounded-full font-bold">20</span>
            </button>

            <button
              onClick={() => setActiveTab('certificados')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'certificados'
                  ? 'bg-emerald-50 text-[#006633] font-semibold'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>Certificação</span>
            </button>

            {(user?.role === 'professor' || user?.role === 'administrador') && (
              <button
                onClick={() => setActiveTab('gestao')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer flex items-center space-x-1.5 ${
                  activeTab === 'gestao'
                    ? 'bg-emerald-50 text-[#006633] font-semibold'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Gestão Acadêmica</span>
              </button>
            )}
          </nav>

          {/* Ações Direitas: Tutor IA e Perfil */}
          <div className="flex items-center space-x-3">
            {/* Botão Tutor IA */}
            <button
              onClick={openTutor}
              className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white px-3.5 py-2 rounded-lg text-sm font-medium shadow-sm transition-all cursor-pointer"
              title="Abrir o assistente pedagógico de IA"
            >
              <Bot className="w-4 h-4 animate-pulse" />
              <span className="hidden sm:inline font-semibold">Tutor IA</span>
            </button>

            {/* Perfil do Usuário Autenticado */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center space-x-2.5 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer text-left"
                >
                  <img
                    src={user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                    alt={user.name}
                    className="w-8 h-8 rounded-full border border-emerald-200 object-cover"
                  />
                  <div className="hidden lg:block">
                    <p className="text-xs font-semibold text-gray-900 leading-tight truncate max-w-[130px]">{user.name}</p>
                    <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">
                      {user.role}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </button>

                {/* Dropdown de Perfil */}
                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-bold text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-gray-400">
                        <span>Matrícula: {user.registration_number || 'IF-2026-01'}</span>
                        <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded font-bold capitalize">
                          {user.role}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-gray-100 mt-1 pt-1 px-2">
                      <button
                        onClick={openAuditModal}
                        className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 rounded-md flex items-center space-x-2"
                      >
                        <Server className="w-3.5 h-3.5 text-gray-500" />
                        <span>Diagnóstico do Sistema & Render</span>
                      </button>
                      <button
                        onClick={() => {
                          onLogout();
                          setProfileDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-md flex items-center space-x-2"
                      >
                        <LogOut className="w-3.5 h-3.5 text-red-500" />
                        <span>Encerrar Sessão</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={openAuthModal}
                className="flex items-center space-x-1.5 bg-[#006633] hover:bg-[#004d25] text-white px-3.5 py-2 rounded-lg text-sm font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <UserIcon className="w-4 h-4" />
                <span>Entrar</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
