import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Anchor, Moon, Sun } from 'lucide-react';
import { useAuth } from '../data/AuthProvider';
import { useTheme } from '../data/ThemeProvider';

export default function LoginPage() {
  const { user, isLoading, loginWithGoogle } = useAuth();
  const { isLight, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && user) navigate('/', { replace: true });
  }, [user, isLoading, navigate]);

  const handleLogin = async () => {
    setError('');
    setBusy(true);
    try {
      await loginWithGoogle();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar. Tente novamente.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      {/* Atmosphere plane */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: isLight
            ? `
              radial-gradient(ellipse 80% 60% at 20% 10%, rgba(42,138,130,0.28), transparent 55%),
              radial-gradient(ellipse 70% 50% at 90% 80%, rgba(12,31,42,0.12), transparent 50%),
              linear-gradient(160deg, #0c1f2a 0%, #1a3d42 42%, #d5e2e8 42.1%, #e4ecef 100%)
            `
            : `
              radial-gradient(ellipse 80% 60% at 15% 0%, rgba(42,138,130,0.22), transparent 55%),
              linear-gradient(165deg, #060e15 0%, #0c1f2a 48%, #0a131c 48.1%, #12202e 100%)
            `,
        }}
      />

      <button
        type="button"
        onClick={toggleTheme}
        className="absolute top-4 right-4 z-10 flex cursor-pointer items-center gap-2 rounded-lg border border-white/20 bg-black/20 px-3 py-2 text-[12px] font-semibold text-white/90 backdrop-blur-sm transition hover:bg-black/30"
      >
        {isLight ? <Moon className="size-4" /> : <Sun className="size-4 text-amber-300" />}
        <span>{isLight ? 'Tema escuro' : 'Tema claro'}</span>
      </button>

      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16 sm:px-8">
        <div className="animate-rise">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-xl bg-[var(--app-nav-active)] text-white shadow-lg shadow-teal-900/20">
              <Anchor className="size-6" />
            </div>
            <div>
              <p className="text-[12px] font-semibold tracking-[0.14em] text-white/70 uppercase">
                Mecânica Offshore
              </p>
              <h1 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Escala Offshore
              </h1>
            </div>
          </div>

          <p className="mb-10 max-w-md text-[15px] leading-relaxed text-white/75">
            Gestão do ciclo 14×14 — embarques, dobras, férias e treinamentos da equipe.
          </p>

          <div className="animate-rise space-y-4" style={{ animationDelay: '80ms' }}>
            <button
              type="button"
              onClick={handleLogin}
              disabled={busy || isLoading}
              className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl bg-white px-5 py-3.5 text-[14px] font-semibold text-[var(--app-text)] transition hover:bg-white/95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
              </svg>
              {busy ? 'Entrando…' : 'Entrar com Google'}
            </button>

            {error && (
              <p className="rounded-lg bg-rose-500/15 px-3 py-2 text-[13px] text-rose-100">{error}</p>
            )}

            <p className="text-[12px] text-white/50">Acesso restrito a e-mails autorizados.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
