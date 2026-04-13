import { Outlet, Link, useLocation } from 'react-router-dom';
import { Package, BarChart3, DollarSign, Search } from 'lucide-react';

export default function Layout() {
  const location = useLocation();

  const navItems = [
    { path: '/uttag', icon: Package, label: 'Uttag', title: '📦' },
    { path: '/lager', icon: BarChart3, label: 'Lager', title: '📦' },
    { path: '/kostnad', icon: DollarSign, label: 'Kostnad', title: '💰' },
    { path: '/inventering', icon: Search, label: 'Inventering', title: '🔍' }
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">LagerAppen</h1>
          <p className="text-sm text-slate-600">Lagerhantering med streckkodsskanning</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 flex justify-around">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1 px-4 py-3 border-t-2 transition-colors ${
                  active
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Padding for bottom nav */}
      <div className="h-20" />
    </div>
  );
}