import { NavLink, Outlet } from 'react-router-dom';
import { Sun, Moon, LogOut, User } from 'lucide-react';
import { useAuth } from '../data/AuthProvider';
import { useTheme } from '../data/ThemeProvider';

const NAV_LINKS = [
  { to: '/',              label: 'Escalas',       end: true },
  { to: '/colaboradores', label: 'Colaboradores',  end: false },
  { to: '/ferias',        label: 'Férias',         end: false },
  { to: '/dobras',        label: 'Dobras',         end: false },
  { to: '/treinamentos',  label: 'Treinamentos',   end: false },
  { to: '/relatorios',    label: 'Relatórios',     end: false },
  { to: '/configuracoes', label: 'Turmas',         end: false },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { isLight, toggleTheme } = useTheme();

  return (
    <div className="flex h-full flex-col" style={{ background: 'var(--app-bg)' }}>
      {/* Header */}
      <header
        className="flex shrink-0 items-center gap-4 px-4 h-12"
        style={{ background: 'var(--app-header)', color: 'var(--app-header-text)' }}
      >
        {/* Brand */}
        <span className="font-display text-sm font-semibold tracking-tight whitespace-nowrap">
          Escala Offshore
        </span>

        {/* Nav — horizontal scroll on mobile */}
        <nav className="flex-1 overflow-x-auto scrollbar-none">
          <ul className="flex items-center gap-0.5 min-w-max">
            {NAV_LINKS.map(({ to, label, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `px-3 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                      isActive
                        ? 'text-white'
                        : 'opacity-70 hover:opacity-100 hover:text-white'
                    }`
                  }
                  style={({ isActive }) =>
                    isActive ? { background: 'var(--app-nav-active)' } : {}
                  }
                >
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Right side */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded opacity-70 hover:opacity-100 transition-opacity"
            title={isLight ? 'Modo escuro' : 'Modo claro'}
          >
            {isLight ? <Moon size={15} /> : <Sun size={15} />}
          </button>

          {user?.avatar ? (
            <img src={user.avatar} alt={user.name} className="h-6 w-6 rounded-full" />
          ) : (
            <User size={15} className="opacity-70" />
          )}

          <span className="text-xs opacity-80 hidden sm:inline max-w-[120px] truncate">{user?.name}</span>

          <button
            onClick={logout}
            className="p-1.5 rounded opacity-70 hover:opacity-100 transition-opacity"
            title="Sair"
          >
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
