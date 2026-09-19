import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Clock, AlertCircle, RefreshCw } from 'lucide-react';

export default function Dashboard() {
  const { data: products, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3000/api/products');
      if (!res.ok) throw new Error('Failed to fetch products');
      return res.json();
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-neutral-400 mt-1">Tracked products and their latest status.</p>
        </div>
        <button 
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-4 py-2 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : products?.length === 0 ? (
        <div className="text-center bg-neutral-900 border border-neutral-800 p-12 rounded-2xl">
          <h2 className="text-xl font-semibold mb-2">No products tracked yet</h2>
          <p className="text-neutral-500 mb-6">Search the store to start tracking prices.</p>
          <Link to="/search" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors">
            Find Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {products?.map((product: any) => {
            const latestPrice = product.price_histories?.[0];
            const isOutdated = latestPrice ? (Date.now() - new Date(latestPrice.scraped_at).getTime()) > 1000 * 60 * 60 * 4 : true;

            return (
              <Link key={product.id} to={`/product/${product.id}`} className="block group">
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 hover:border-blue-500/50 transition-all hover:shadow-xl hover:shadow-blue-900/10 h-full flex flex-col relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  
                  <div className="flex justify-between items-start mb-4 gap-4">
                    <h3 className="font-semibold text-lg leading-tight group-hover:text-blue-400 transition-colors line-clamp-2">
                      {product.name}
                    </h3>
                  </div>

                  <div className="mt-auto">
                    {latestPrice ? (
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-3xl font-bold tracking-tight">₹{latestPrice.price?.toLocaleString() || '--'}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${latestPrice.in_stock ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                              {latestPrice.in_stock ? 'In Stock' : 'Out of Stock'}
                            </span>
                            {isOutdated && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> Stale
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end text-neutral-500 text-sm">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(latestPrice.scraped_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-neutral-950 rounded-xl text-neutral-500 text-sm flex items-center gap-2 border border-neutral-800">
                        <Clock className="w-4 h-4" /> Awaiting first scrape
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
