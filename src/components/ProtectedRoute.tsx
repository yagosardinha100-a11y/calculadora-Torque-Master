import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CalendarDays, ShieldAlert, LogOut, Lock } from 'lucide-react';

interface ProtectedRouteProps {
  /** When true, the route additionally requires the `editor` role. */
  requireEditor?: boolean;
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  requireEditor = false,
  children,
}) => {
  const { user, isLoading, accessDenied, isEditor, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-900 text-white p-4 font-sans">
        <div className="p-3 bg-blue-600 rounded-2xl shadow-lg animate-bounce mb-3">
          <CalendarDays className="w-8 h-8 text-white" />
        </div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Restaurando sessão...
        </p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Signed in but no access role granted.
  if (accessDenied) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-900 text-white p-6 text-center font-sans">
        <div className="p-4 bg-amber-500/15 text-amber-300 rounded-2xl mb-4">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <h1 className="text-lg font-bold">Acesso não autorizado</h1>
        <p className="mt-2 max-w-md text-sm text-slate-300">
          Sua conta <strong>{user.email}</strong> ainda não tem permissão neste
          sistema. Peça a um <strong>editor</strong> para liberar seu acesso
          (como <em>editor</em> ou <em>visualizador</em>) na tela de Usuários.
        </p>
        <button
          type="button"
          onClick={logout}
          className="mt-6 inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    );
  }

  // Editor-only route accessed by a viewer.
  if (requireEditor && !isEditor) {
    return (
      <div className="flex min-h-[60vh] w-full flex-col items-center justify-center p-6 text-center">
        <div className="mb-4 rounded-2xl bg-[var(--app-accent-soft)] p-4 text-[var(--app-accent)]">
          <Lock className="h-9 w-9" />
        </div>
        <h1 className="text-lg font-bold text-[var(--app-text)]">
          Acesso restrito a editores
        </h1>
        <p className="mt-2 max-w-md text-sm text-[var(--app-text-muted)]">
          Você está no modo <strong>visualização</strong> e não pode gerenciar
          usuários. Fale com um editor caso precise dessa permissão.
        </p>
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
};
