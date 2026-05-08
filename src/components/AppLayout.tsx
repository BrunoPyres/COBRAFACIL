import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  Wallet,
  Users,
  Receipt,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  HandCoins,
  Calculator,
  BarChart3,
  Search,
  Bell
} from 'lucide-react';
import { getSession, clearSession, getUsers } from '@/lib/storage';

const sidebarItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/calendario', label: 'Calendário', icon: CalendarDays },
  { path: '/emprestimos', label: 'Empréstimos', icon: Wallet },
  { path: '/clientes', label: 'Clientes', icon: Users },
  { path: '/pagamentos', label: 'Pagamentos', icon: Receipt },
  { path: '/simulador', label: 'Simulador', icon: Calculator },
  { path: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  { path: '/configuracoes', label: 'Configurações', icon: Settings },
];

const bottomNavItems = [
  { path: '/', label: 'Início', icon: LayoutDashboard },
  { path: '/calendario', label: 'Calendário', icon: CalendarDays },
  { path: '/emprestimos', label: 'Empréstimos', icon: Wallet },
  { path: '/clientes', label: 'Clientes', icon: Users },
  { path: '/mais', label: 'Mais', icon: Menu },
];

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [userName, setUserName] = useState('Usuário');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const session = getSession();
    if (session) {
      const users = getUsers();
      const user = users.find(u => u.id === session.userId);
      if (user) setUserName(user.name);
    }
  }, []);

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  const currentLabel = sidebarItems.find(i => i.path === location.pathname)?.label || 'Dashboard';

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-[260px] min-h-screen fixed left-0 top-0 z-40 border-r" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-3 px-5 h-14 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-primary)' }}>
            <HandCoins className="w-5 h-5 text-black" />
          </div>
          <span className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>CobraFácil</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {sidebarItems.map(item => {
            const active = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <button key={item.path} onClick={() => navigate(item.path)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
                style={{ background: active ? 'rgba(0,200,83,0.1)' : 'transparent', color: active ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
                <Icon className="w-5 h-5" />
                {item.label}
                {active && <ChevronRight className="w-4 h-4 ml-auto" />}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--bg-tertiary)', color: 'var(--accent-primary)' }}>
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{userName}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-red-500/10" style={{ color: 'var(--text-tertiary)' }}>
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 lg:ml-[260px]">
        {/* Top bar */}
        <header className="flex items-center justify-between px-4 lg:px-6 h-14 border-b sticky top-0 z-30 shrink-0" style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg" style={{ color: 'var(--text-secondary)' }}>
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{currentLabel}</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs" style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>
              <Search className="w-3.5 h-3.5" />
              <span>Buscar...</span>
            </div>
            <button className="relative p-2 rounded-lg" style={{ color: 'var(--text-secondary)' }}>
              <Bell className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t flex items-center justify-around h-16 pb-safe" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
        {bottomNavItems.map(item => {
          const Icon = item.icon;
          if (item.path === '/mais') {
            return (
              <button key={item.path} onClick={() => setMoreOpen(true)} className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full"
                style={{ color: 'var(--text-tertiary)' }}>
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          }
          const active = location.pathname === item.path;
          return (
            <button key={item.path} onClick={() => navigate(item.path)}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full"
              style={{ color: active ? 'var(--accent-primary)' : 'var(--text-tertiary)' }}>
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Mobile "More" bottom sheet */}
      {moreOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setMoreOpen(false)} />
          <div className="fixed bottom-16 left-0 right-0 z-50 rounded-t-2xl p-4 animate-slide-up" style={{ background: 'var(--bg-secondary)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Mais opções</h3>
              <button onClick={() => setMoreOpen(false)} className="p-1 rounded-lg" style={{ color: 'var(--text-tertiary)' }}><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {sidebarItems.filter(i => !bottomNavItems.find(b => b.path === i.path)).map(item => {
                const Icon = item.icon;
                return (
                  <button key={item.path} onClick={() => { navigate(item.path); setMoreOpen(false); }}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl" style={{ color: 'var(--text-secondary)' }}>
                    <Icon className="w-6 h-6" />
                    <span className="text-[10px] text-center leading-tight">{item.label}</span>
                  </button>
                );
              })}
              <button onClick={() => { handleLogout(); setMoreOpen(false); }}
                className="flex flex-col items-center gap-2 p-3 rounded-xl" style={{ color: 'var(--accent-danger)' }}>
                <LogOut className="w-6 h-6" />
                <span className="text-[10px] text-center leading-tight">Sair</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
