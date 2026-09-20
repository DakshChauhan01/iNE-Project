import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Search as SearchIcon, Plus, Image, SearchX, Filter } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useWakingUp } from '../hooks/useWakingUp';
import { getCategoryEmoji } from '../utils/categoryEmoji';

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const searchTerm = searchParams.get('q') || '';
  const navigate = useNavigate();

  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<string>('');

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['search', searchTerm],
    queryFn: async () => {
      if (!searchTerm) return { items: [] };
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://ine-project-yc8q.onrender.com'}/api/search?q=${encodeURIComponent(searchTerm)}`);
      if (!res.ok) throw new Error('Search failed');
      return res.json();
    },
    enabled: searchTerm.length > 0,
    staleTime: 60000,
  });

  const isWakingUp = useWakingUp(isLoading);

  const trackMutation = useMutation({
    mutationFn: async (product: any) => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://ine-project-yc8q.onrender.com'}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: product.name,
          store_url: `https://demo.inelabteamdev.com/product/${product.id}`,
          store_product_id: String(product.id),
          image_url: product.image_url || null,
          category: product.category || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to track product');
      return res.json();
    },
    onSuccess: () => {
      navigate('/');
    }
  });

  const rawItems = searchResults?.items || [];
  
  const categories = Array.from(new Set(rawItems.map((item: any) => item.category).filter(Boolean))) as string[];
  const brands = Array.from(new Set(rawItems.map((item: any) => item.brand).filter(Boolean))) as string[];

  const filteredItems = rawItems.filter((item: any) => {
    if (selectedCategory && item.category !== selectedCategory) return false;
    if (selectedBrand && item.brand !== selectedBrand) return false;
    return true;
  });



  return (
    <div className="space-y-6 animate-fade-in relative z-10">
      <div className="glass-panel p-8 rounded-2xl shadow-xl shadow-black/20">
        <h1 className="text-3xl font-bold font-display tracking-tight mb-2">
          {searchTerm ? `Results for "${searchTerm}"` : "Search Store"}
        </h1>
        <p className="text-neutral-400">
          {searchTerm ? "Find products to track from the iNE demo store." : "Enter a search query in the top bar to find products to track."}
        </p>
      </div>

      {rawItems.length > 0 && (
        <div className="glass-panel p-4 rounded-xl flex flex-wrap gap-4 items-center shadow-md shadow-black/10 border border-[var(--panel-border)] bg-[var(--panel-bg)]">
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] font-medium mr-2">
            <Filter className="w-4 h-4" /> Filters
          </div>
          
          <select 
            value={selectedCategory} 
            onChange={e => setSelectedCategory(e.target.value)}
            className="bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-[var(--text-primary)]"
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          
          <select 
            value={selectedBrand} 
            onChange={e => setSelectedBrand(e.target.value)}
            className="bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-[var(--text-primary)]"
          >
            <option value="">All Brands</option>
            {brands.map(b => <option key={b} value={b}>{b}</option>)}
          </select>

          <div className="h-6 w-px bg-[var(--panel-border)] mx-2 hidden sm:block"></div>

          <div className="flex gap-4 items-center opacity-50 cursor-not-allowed" title="Price and stock filters are available in the Dashboard for tracked products">
            <label className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
              <input type="checkbox" disabled className="rounded border-[var(--input-border)] bg-[var(--input-bg)]" />
              In Stock Only
            </label>
            <div className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
              <span>Price:</span>
              <input type="number" disabled placeholder="Min" className="w-16 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-2 py-1 text-xs" />
              <span>-</span>
              <input type="number" disabled placeholder="Max" className="w-16 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-2 py-1 text-xs" />
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton h-[150px] w-full flex flex-col p-6">
               <div className="flex gap-4 mb-4">
                  <div className="w-16 h-16 bg-white/10 rounded-lg shrink-0"></div>
                  <div className="flex-1 space-y-2 mt-1">
                     <div className="h-5 bg-white/10 rounded w-3/4"></div>
                     <div className="h-4 bg-white/10 rounded w-1/2"></div>
                  </div>
               </div>
               <div className="mt-auto">
                 <div className="h-10 bg-white/10 rounded-lg w-full"></div>
               </div>
            </div>
          ))}
          {isWakingUp && (
            <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center py-4 text-blue-400 font-medium animate-pulse">
              Waking up the server, this can take up to a minute on the free tier...
            </div>
          )}
        </div>
      )}

      {filteredItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item: any) => (
            <div key={item.id} className="glass-panel rounded-2xl p-6 hover:-translate-y-1 hover:border-white/30 transition-all duration-200 ease-out hover:shadow-2xl hover:shadow-blue-900/10 group flex flex-col">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-16 h-16 shrink-0 bg-white/5 rounded-lg border border-white/10 flex items-center justify-center overflow-hidden">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl" title={item.category || 'Unknown Category'}>
                      {getCategoryEmoji(item.name, item.category)}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="font-bold font-display text-lg line-clamp-1 group-hover:text-blue-300 transition-colors text-white drop-shadow-sm" style={{ color: 'var(--text-primary)' }}>{item.name}</h3>
                  <p className="text-sm text-neutral-300 drop-shadow-sm" style={{ color: 'var(--text-secondary)' }}>{item.brand}</p>
                </div>
              </div>
              
              <div className="mt-auto">
                <button 
                  onClick={() => trackMutation.mutate(item)}
                  disabled={trackMutation.isPending}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600/90 hover:bg-blue-600 text-white py-2 rounded-lg font-medium transition-all disabled:opacity-50 border border-transparent shadow-sm"
                >
                  {trackMutation.isPending ? 'Tracking...' : <><Plus className="w-4 h-4" /> Track Product</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {!isLoading && searchResults && filteredItems.length === 0 && (
        <div className="text-center glass-panel p-12 rounded-2xl flex flex-col items-center">
          <div className="bg-red-500/10 p-4 rounded-full mb-4 border border-red-500/20">
            <SearchX className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold font-display mb-2">No products found</h2>
          <p className="text-neutral-400">We couldn't find anything matching "{searchTerm}". Try another search.</p>
        </div>
      )}
    </div>
  );
}
