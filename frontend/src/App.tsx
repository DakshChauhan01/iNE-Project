import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import SearchPage from './pages/SearchPage';
import Dashboard from './pages/Dashboard';
import ProductDetail from './pages/ProductDetail';
import { Activity, Search, LayoutDashboard, Sun, Moon } from 'lucide-react';
import { useTheme } from './hooks/useTheme';

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const location = useLocation();
  const active = location.pathname === to;
  return (
    <Link
      to={to}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
        active
          ? 'bg-blue-600/20 text-blue-400'
          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5'
      }`}
    >
      {children}
    </Link>
  );
}

function Header() {
  const { theme, toggle } = useTheme();
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    } else {
      navigate('/search');
    }
  };

  return (
    <nav className="nav-bar sticky top-0 z-50 p-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2.5 text-lg font-bold text-blue-500 font-display shrink-0">
          <Activity className="w-5 h-5 animate-pulse" />
          PriceTracker
        </Link>
        
        <form onSubmit={handleSearch} className="flex-1 max-w-md relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input 
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search store..." 
            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg py-1.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-[var(--text-primary)] placeholder-[var(--text-muted)]"
          />
        </form>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <NavLink to="/"><LayoutDashboard className="w-4 h-4" /> <span className="hidden sm:inline">Dashboard</span></NavLink>

          <button
            onClick={toggle}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="ml-1 sm:ml-3 p-2 rounded-xl border transition-all duration-200 hover:scale-110"
            style={{
              borderColor: 'var(--panel-border)',
              background: 'var(--panel-bg)',
              color: 'var(--text-secondary)',
            }}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen font-sans" style={{ color: 'var(--text-primary)' }}>
        <Header />

        <main className="max-w-6xl mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/product/:id" element={<ProductDetail />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
