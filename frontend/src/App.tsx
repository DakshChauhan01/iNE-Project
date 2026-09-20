import { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { data: autocompleteResults, isLoading } = useQuery({
    queryKey: ['autocomplete', debouncedQuery],
    queryFn: async () => {
      if (debouncedQuery.length < 2) return { items: [] };
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://ine-project-yc8q.onrender.com'}/api/search?q=${encodeURIComponent(debouncedQuery)}`);
      if (!res.ok) throw new Error('Search failed');
      return res.json();
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 60000,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setShowDropdown(false);
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
        
        <form onSubmit={handleSearch} className="flex-1 max-w-md relative hidden sm:block" ref={dropdownRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input 
            type="text" 
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Search store..." 
            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg py-1.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-[var(--text-primary)] placeholder-[var(--text-muted)]"
          />
          
          {/* Autocomplete Dropdown */}
          {showDropdown && debouncedQuery.length >= 2 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl shadow-xl shadow-black/20 overflow-hidden z-50 animate-fade-in backdrop-blur-md">
              {isLoading ? (
                <div className="p-4 text-center text-sm text-[var(--text-muted)]">Searching...</div>
              ) : autocompleteResults?.items && autocompleteResults.items.length > 0 ? (
                <ul className="max-h-80 overflow-y-auto">
                  {autocompleteResults.items.slice(0, 5).map((item: any) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setQuery(item.name);
                          setShowDropdown(false);
                          navigate(`/search?q=${encodeURIComponent(item.name)}`);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-blue-500/10 transition-colors flex items-center gap-3 border-b border-[var(--panel-border)] last:border-0"
                      >
                        <div className="w-10 h-10 shrink-0 bg-white/5 rounded shrink-0 flex items-center justify-center overflow-hidden">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xl">📦</span>
                          )}
                        </div>
                        <div className="overflow-hidden">
                          <div className="font-medium text-sm text-[var(--text-primary)] truncate">{item.name}</div>
                          <div className="text-xs text-[var(--text-secondary)] truncate">{item.brand}</div>
                        </div>
                      </button>
                    </li>
                  ))}
                  {autocompleteResults.items.length > 5 && (
                    <li>
                      <button
                        type="button"
                        onClick={handleSearch}
                        className="w-full text-center px-4 py-3 text-sm text-blue-500 hover:bg-blue-500/10 font-medium transition-colors"
                      >
                        View all {autocompleteResults.items.length} results
                      </button>
                    </li>
                  )}
                </ul>
              ) : (
                <div className="p-4 text-center text-sm text-[var(--text-muted)]">No matches found.</div>
              )}
            </div>
          )}
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
