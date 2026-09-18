import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import SearchPage from './pages/SearchPage';
import Dashboard from './pages/Dashboard';
import ProductDetail from './pages/ProductDetail';
import { Activity, Search, LayoutDashboard } from 'lucide-react';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-neutral-900 text-neutral-100 font-sans">
        <nav className="border-b border-neutral-800 bg-neutral-950 p-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-xl font-bold text-blue-500">
              <Activity className="w-6 h-6" />
              PriceTracker
            </Link>
            <div className="flex gap-4">
              <Link to="/" className="flex items-center gap-2 hover:text-blue-400 transition-colors">
                <LayoutDashboard className="w-5 h-5" /> Dashboard
              </Link>
              <Link to="/search" className="flex items-center gap-2 hover:text-blue-400 transition-colors">
                <Search className="w-5 h-5" /> Search
              </Link>
            </div>
          </div>
        </nav>
        
        <main className="max-w-6xl mx-auto p-4 py-8">
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
