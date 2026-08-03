import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  Users,
  Palmtree,
  Sun,
  Moon,
  Sparkles,
  GraduationCap,
  BarChart3,
  LogOut,
  Anchor,
  Settings2,
  UserCog,
  Eye,
  Pencil,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { toggleTheme, isLight } = useTheme();
  const { user, logout, isEditor } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Escalas', path: '/', icon: CalendarDays },
    { name: 'Colaboradores', path: '/colaboradores', icon: Users },
    { name: 'Férias', path: '/ferias', icon: Palmtree },
    { name: 'Dobras', path: '/dobras', icon: Sparkles },
    { name: 'Treinamentos', path: '/treinamentos', icon: GraduationCap },
    { name: 'Relatórios', path: '/relatorios', icon: BarChart3 },
    { name: 'Turmas', path: '/configuracoes', icon: Settings2 },
    ...(isEditor ? [{ name: 'Usuários', path: '/usuarios', icon: UserCog }] : []),
  ];

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden font-sans text-[var(--app-text)] transition-colors duration-200">
      <header
        className="z-20 flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-4 sm:px-5"
        style={{ background: 'var(--app-header)', color: 'var(--app-header-text)' }}
      >
        <div className="flex min-w-0 items-center gap-5">
          <div className="flex shrink-0 items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-[var(--app-nav-active)] text-white">
              <Anchor className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="font-display text-[15px] font-semibold tracking-tight text-white">
                Escala Offshore
              </p>
              <p className="hidden text-[11px] text-white/55 sm:block">Embarques 14×14</p>
            </div>
          </div>

          <nav className="hidden items-center gap-1 overflow-x-auto py-1 md:flex" aria-label="Menu principal">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] font-semibold whitespace-nowrap transition-colors',
                      isActive
                        ? 'bg-[var(--app-nav-active)] text-white'
                        : 'text-white/70 hover:bg-white/8 hover:text-white',
                    )
                  }
                >
                  <Icon className="size-4 shrink-0 opacity-90" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-[12px] font-semibold text-white/80 transition-colors hover:bg-white/10"
            title={isLight ? 'Tema escuro' : 'Tema claro'}
          >
            {isLight ? <Moon className="size-3.5" /> : <Sun className="size-3.5 text-amber-300" />}
            <span className="hidden sm:inline">{isLight ? 'Escuro' : 'Claro'}</span>
          </button>

          <span
            className={cn(
              'hidden items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold sm:inline-flex',
              isEditor
                ? 'bg-emerald-500/20 text-emerald-200'
                : 'bg-amber-500/20 text-amber-200',
            )}
            title={isEditor ? 'Você pode editar' : 'Você está no modo somente leitura'}
          >
            {isEditor ? <Pencil className="size-3" /> : <Eye className="size-3" />}
            {isEditor ? 'Editor' : 'Visualização'}
          </span>

          <div className="hidden items-center gap-2 border-l border-white/15 pl-3 sm:flex">
            <div className="text-right">
              <p className="text-[12px] font-semibold text-white">{user?.name || 'Usuário'}</p>
              <p className="text-[11px] text-white/50">{user?.username || 'Conectado'}</p>
            </div>
            <div className="flex size-8 items-center justify-center rounded-full bg-[var(--app-nav-active)] text-[12px] font-bold text-white">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex cursor-pointer items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-[12px] font-semibold text-white/80 transition-colors hover:border-rose-400/40 hover:bg-rose-500/15 hover:text-rose-200"
            title="Sair"
          >
            <LogOut className="size-3.5" />
            <span className="hidden xl:inline">Sair</span>
          </button>
        </div>
      </header>

      <div
        className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-[var(--app-border)] px-3 py-2 md:hidden"
        style={{ background: 'var(--app-surface)' }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                cn(
                  'flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold whitespace-nowrap transition-colors',
                  isActive
                    ? 'bg-[var(--app-accent)] text-white'
                    : 'text-[var(--app-text-muted)] hover:bg-[var(--app-accent-soft)] hover:text-[var(--app-text)]',
                )
              }
            >
              <Icon className="size-3.5 shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </div>

      {!isEditor ? (
        <div className="flex shrink-0 items-center justify-center gap-2 bg-amber-500/15 px-4 py-1.5 text-[12px] font-semibold text-amber-700 dark:text-amber-300">
          <Eye className="size-3.5" />
          Modo somente leitura — você pode consultar, mas não editar. Peça a um editor para alterar seu acesso.
        </div>
      ) : null}

      <main className="relative w-full flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
