import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Search as SearchIcon, Plus, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['search', searchTerm],
    queryFn: async () => {
      if (!searchTerm) return { items: [] };
      const res = await fetch(`http://localhost:3000/api/search?q=${encodeURIComponent(searchTerm)}`);
      if (!res.ok) throw new Error('Search failed');
      return res.json();
    },
    enabled: searchTerm.length > 0
  });

  const trackMutation = useMutation({
    mutationFn: async (product: any) => {
      const res = await fetch('http://localhost:3000/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: product.name,
          store_url: `https://demo.inelabteamdev.com/product/${product.id}`,
          store_product_id: String(product.id),
          image_url: product.image_url || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to track product');
      return res.json();
    },
    onSuccess: () => {
      navigate('/');
    }
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(query);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-2xl shadow-xl shadow-black/20">
        <h1 className="text-3xl font-bold mb-2">Search Store</h1>
        <p className="text-neutral-400 mb-6">Find products to track from the iNE demo store.</p>
        
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
            <input 
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or brand..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-neutral-100"
            />
          </div>
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-medium transition-all shadow-lg shadow-blue-900/20 active:scale-95">
            Search
          </button>
        </form>
      </div>

      {isLoading && (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {searchResults?.items && searchResults.items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {searchResults.items.map((item: any) => (
            <div key={item.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 hover:border-neutral-700 transition-colors group">
              <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-blue-400 transition-colors">{item.name}</h3>
              <p className="text-sm text-neutral-500 mb-4">{item.brand}</p>
              
              <button 
                onClick={() => trackMutation.mutate(item)}
                disabled={trackMutation.isPending}
                className="w-full flex items-center justify-center gap-2 bg-neutral-800 hover:bg-blue-600 text-white py-2 rounded-lg font-medium transition-all disabled:opacity-50"
              >
                {trackMutation.isPending ? 'Tracking...' : <><Plus className="w-4 h-4" /> Track Product</>}
              </button>
            </div>
          ))}
        </div>
      )}
      
      {searchResults?.items && searchResults.items.length === 0 && (
        <div className="text-center p-12 text-neutral-500">
          No products found matching "{searchTerm}".
        </div>
      )}
    </div>
  );
}
