import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';
import { Anchor, Sun, Moon, AlertCircle, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const { loginWithGoogle, user, isLoading } = useAuth();
  const { toggleTheme, isLight } = useTheme();
  const navigate = useNavigate();

  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && !isLoading) {
      navigate('/', { replace: true });
    }
  }, [user, isLoading, navigate]);

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch {
      setLoading(false);
      setErrorMsg('Erro ao conectar com o Google. Verifique suas credenciais e tente novamente.');
    }
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden px-4 py-10 font-sans">
      {/* Full-bleed maritime atmosphere */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: isLight
            ? 'linear-gradient(165deg, #0f2430 0%, #1a3d45 42%, #247470 78%, #48ada4 100%)'
            : 'linear-gradient(165deg, #071018 0%, #0b1520 45%, #132333 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.12), transparent 35%), radial-gradient(circle at 80% 0%, rgba(72,173,164,0.25), transparent 40%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 opacity-30"
        style={{
          backgroundImage:
            'repeating-linear-gradient(-12deg, transparent, transparent 18px, rgba(255,255,255,0.04) 18px, rgba(255,255,255,0.04) 19px)',
        }}
      />

      <button
        type="button"
        onClick={toggleTheme}
        className="absolute top-5 right-5 z-20 flex cursor-pointer items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-[12px] font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/15"
      >
        {isLight ? <Moon className="size-4" /> : <Sun className="size-4 text-amber-300" />}
        <span>{isLight ? 'Tema escuro' : 'Tema claro'}</span>
      </button>

      <div className="relative z-10 w-full max-w-md text-center text-white">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm">
          <Anchor className="size-8" />
        </div>

        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Escala Offshore
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-white/75">
          Gestão de embarques 14×14 da equipe de mecânica.
        </p>

        {errorMsg ? (
          <div className="mt-6 flex items-center gap-2 rounded-xl border border-rose-300/40 bg-rose-500/20 px-4 py-3 text-left text-[13px] font-medium text-rose-50">
            <AlertCircle className="size-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className={cn(
            'mt-8 flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl px-5 py-3.5 text-[15px] font-semibold transition-all',
            'bg-white text-[#15202b] shadow-lg shadow-black/20 hover:bg-white/95 active:scale-[0.99]',
            'disabled:cursor-wait disabled:opacity-70',
          )}
        >
          <svg className="size-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          <span>{loading ? 'Redirecionando…' : 'Entrar com Google'}</span>
        </button>

        <div className="mt-8 flex items-center justify-center gap-1.5 text-[12px] text-white/60">
          <ShieldCheck className="size-3.5" />
          <span>Acesso exclusivo via conta autorizada</span>
        </div>
      </div>
    </div>
  );
}
