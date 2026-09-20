import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useWakingUp } from '../hooks/useWakingUp';
import { getCategoryEmoji } from '../utils/categoryEmoji';
import { Clock, AlertCircle, RefreshCw, PackageOpen, Loader2, Filter } from 'lucide-react';
import { useState } from 'react';

const API = import.meta.env.VITE_API_URL || 'https://ine-project-yc8q.onrender.com';

export default function Dashboard() {
  const queryClient = useQueryClient();
  
  const { data: products, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await fetch(`${API}/api/products`);
      if (!res.ok) throw new Error('Failed to fetch products');
      return res.json();
    },
    staleTime: 60000,
    refetchInterval: (query) => {
      const data = query.state.data as any[];
      const hasPending = data?.some((p: any) => !p.price_histories?.length && p.scrape_logs?.[0]?.status !== 'failed');
      return hasPending ? 3000 : false;
    }
  });

  const retryMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${API}/api/products/${id}/scrape`, { method: 'POST' });
      if (!res.ok) throw new Error('Retry failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });

  const isWakingUp = useWakingUp(isLoading);

  const [inStockOnly, setInStockOnly] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const filteredProducts = products?.filter((product: any) => {
    const latestPrice = product.price_histories?.[0];
    if (inStockOnly && (!latestPrice || !latestPrice.in_stock)) return false;
    if (minPrice && (!latestPrice || latestPrice.price < Number(minPrice))) return false;
    if (maxPrice && (!latestPrice || latestPrice.price > Number(maxPrice))) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Dashboard
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Tracked products and their latest status.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all glass-panel hover:opacity-80 disabled:opacity-50"
          style={{ color: 'var(--text-secondary)' }}
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {products?.length > 0 && (
        <div className="glass-panel p-4 rounded-xl flex flex-wrap gap-4 items-center shadow-md shadow-black/10" style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-bg)' }}>
          <div className="flex items-center gap-2 text-sm font-medium mr-2" style={{ color: 'var(--text-secondary)' }}>
            <Filter className="w-4 h-4" /> Filters
          </div>
          
          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-primary)' }}>
            <input 
              type="checkbox" 
              checked={inStockOnly}
              onChange={e => setInStockOnly(e.target.checked)}
              className="rounded cursor-pointer" style={{ borderColor: 'var(--input-border)', background: 'var(--input-bg)' }} 
            />
            In Stock Only
          </label>
          
          <div className="h-6 w-px mx-2 hidden sm:block" style={{ background: 'var(--panel-border)' }}></div>

          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
            <span>Price:</span>
            <input 
              type="number" 
              placeholder="Min ₹" 
              value={minPrice}
              onChange={e => setMinPrice(e.target.value)}
              className="w-20 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 border"
              style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text-primary)' }} 
            />
            <span>-</span>
            <input 
              type="number" 
              placeholder="Max ₹" 
              value={maxPrice}
              onChange={e => setMaxPrice(e.target.value)}
              className="w-20 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 border"
              style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text-primary)' }} 
            />
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton h-full min-h-[180px] w-full rounded-2xl" />
          ))}
          {isWakingUp && (
            <div
              className="col-span-1 md:col-span-2 xl:col-span-3 text-center py-4 font-medium animate-pulse flex items-center justify-center gap-2 text-sm"
              style={{ color: '#60a5fa' }}
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              Waking up the server — this can take up to a minute on the free tier…
            </div>
          )}
        </div>
      ) : products?.length === 0 ? (
        <div className="text-center glass-panel p-12 rounded-2xl flex flex-col items-center">
          <div className="bg-blue-500/10 p-4 rounded-full mb-4 border border-blue-500/20">
            <PackageOpen className="w-8 h-8 text-blue-400" />
          </div>
          <h2 className="text-xl font-bold font-display mb-2" style={{ color: 'var(--text-primary)' }}>
            No products tracked yet
          </h2>
          <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Search the mock store to start tracking prices and history for any product.
          </p>
          <Link
            to="/search"
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-lg font-medium transition-all shadow-lg"
          >
            Find Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProducts?.map((product: any) => {
            const latestPrice = product.price_histories?.[0];
            const isOutdated = latestPrice
              ? (Date.now() - new Date(latestPrice.scraped_at).getTime()) > 1000 * 60 * 60 * 4
              : true;

            return (
              <Link key={product.id} to={`/product/${product.id}`} className="block group">
                <div className="glass-panel rounded-2xl p-6 hover:-translate-y-1 transition-all duration-200 ease-out hover:shadow-2xl h-full flex flex-col relative overflow-hidden"
                  style={{ borderColor: 'var(--panel-border)' }}
                >
                  {/* top accent line on hover */}
                  <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="flex items-start mb-5 gap-4">
                    <div
                      className="w-14 h-14 shrink-0 rounded-xl flex items-center justify-center overflow-hidden"
                      style={{ background: 'var(--skeleton-bg)', border: '1px solid var(--panel-border)' }}
                    >
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl" title={product.category || 'Product'}>
                          {getCategoryEmoji(product.name, product.category)}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      {product.category && (
                        <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#60a5fa' }}>
                          {product.category}
                        </p>
                      )}
                      <h3
                        className="font-bold font-display text-base leading-snug line-clamp-2 group-hover:text-blue-400 transition-colors"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {product.name}
                      </h3>
                    </div>
                  </div>

                  <div className="mt-auto">
                    {latestPrice ? (
                      <div className="flex items-end justify-between gap-2">
                        <div>
                          <p className="text-3xl font-bold font-display tracking-tight" style={{ color: 'var(--text-primary)' }}>
                            ₹{latestPrice.price?.toLocaleString() ?? '--'}
                          </p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                              latestPrice.in_stock
                                ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                : 'bg-red-500/20 text-red-400 border-red-500/30'
                            }`}>
                              {latestPrice.in_stock ? 'In Stock' : 'Out of Stock'}
                            </span>
                            {isOutdated && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> Stale
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="flex items-center gap-1 text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
                          <Clock className="w-3 h-3" />
                          {new Date(latestPrice.scraped_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ) : (
                      <div
                        className="flex items-center justify-center gap-2 p-3 rounded-xl text-sm"
                        style={{ background: 'var(--skeleton-bg)', border: '1px solid var(--panel-border)', color: 'var(--text-muted)' }}
                      >
                        {product.scrape_logs?.[0]?.status === 'failed' ? (
                          <div className="flex flex-col items-center gap-2">
                            <span className="text-red-400 flex items-center gap-1 text-xs font-medium"><AlertCircle className="w-3 h-3" /> Scrape failed</span>
                            <button 
                              onClick={(e) => {
                                e.preventDefault();
                                retryMutation.mutate(product.id);
                              }}
                              disabled={retryMutation.isPending}
                              className="text-xs bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 px-3 py-1 rounded-full transition-colors border border-blue-500/30"
                            >
                              {retryMutation.isPending ? 'Retrying...' : 'Retry Now'}
                            </button>
                          </div>
                        ) : (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-blue-400" /> Scraping now…
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
