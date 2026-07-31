import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../data/AuthProvider';

export default function LoginPage() {
  const { user, isLoading, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && user) navigate('/', { replace: true });
  }, [user, isLoading, navigate]);

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao entrar. Tente novamente.';
      alert(msg);
    }
  };

  return (
    <div
      className="flex h-screen flex-col items-center justify-center gap-8"
      style={{ background: 'var(--app-bg)' }}
    >
      <div className="text-center">
        <h1
          className="font-display text-3xl font-bold tracking-tight"
          style={{ color: 'var(--app-text)' }}
        >
          Escala Offshore
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--app-text-muted)' }}>
          Gestão de escalas da equipe
        </p>
      </div>

      <div
        className="rounded-xl border px-8 py-10 shadow-lg flex flex-col items-center gap-6 w-80"
        style={{ background: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
      >
        <span className="text-sm font-medium" style={{ color: 'var(--app-text-muted)' }}>
          Entrar com conta autorizada
        </span>

        <button
          onClick={handleLogin}
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-3 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors hover:opacity-80 disabled:opacity-50"
          style={{
            background: 'var(--app-surface)',
            borderColor: 'var(--app-border)',
            color: 'var(--app-text)',
          }}
        >
          {/* Google icon */}
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
          </svg>
          Entrar com Google
        </button>

        <p className="text-center text-xs" style={{ color: 'var(--app-text-faint)' }}>
          Acesso restrito a usuários autorizados
        </p>
      </div>
    </div>
  );
}
