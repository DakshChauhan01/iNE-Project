import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowLeft, RefreshCw, Trash2, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['product', id, 'history'],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://ine-project-yc8q.onrender.com'}/api/products/${id}/history`);
      if (!res.ok) throw new Error('Failed to fetch history');
      return res.json();
    }
  });

  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ['product', id, 'logs'],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://ine-project-yc8q.onrender.com'}/api/products/${id}/logs`);
      if (!res.ok) throw new Error('Failed to fetch logs');
      return res.json();
    }
  });

  const scrapeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://ine-project-yc8q.onrender.com'}/api/products/${id}/scrape`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to trigger scrape');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product', id] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://ine-project-yc8q.onrender.com'}/api/products/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      return res.json();
    },
    onSuccess: () => {
      navigate('/');
    }
  });

  const chartData = history?.map((h: any) => ({
    time: new Date(h.scraped_at).toLocaleDateString() + ' ' + new Date(h.scraped_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    price: h.price
  })).reverse() || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" /> Back
        </button>
        <div className="flex gap-3">
          <button 
            onClick={() => scrapeMutation.mutate()}
            disabled={scrapeMutation.isPending}
            className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${scrapeMutation.isPending ? 'animate-spin' : ''}`} />
            {scrapeMutation.isPending ? 'Scraping...' : 'Force Scrape'}
          </button>
          <button 
            onClick={() => { if(confirm('Are you sure?')) deleteMutation.mutate() }}
            className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Untrack
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-6">Price History</h2>
            <div className="h-[300px] w-full">
              {historyLoading ? (
                <div className="h-full flex items-center justify-center"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="time" stroke="#666" tick={{fill: '#666'}} minTickGap={30} />
                    <YAxis stroke="#666" tick={{fill: '#666'}} domain={['auto', 'auto']} tickFormatter={(v) => `₹${v}`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#171717', borderColor: '#333', borderRadius: '8px' }}
                      itemStyle={{ color: '#3b82f6' }}
                    />
                    <Line type="stepAfter" dataKey="price" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, fill: '#3b82f6', strokeWidth: 0}} activeDot={{r: 6}} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-neutral-500">No price history available.</div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 h-[400px] flex flex-col">
            <h2 className="text-xl font-bold mb-4">Scrape Logs</h2>
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              {logsLoading ? (
                <div className="flex justify-center p-4"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>
              ) : logs?.length === 0 ? (
                <div className="text-center text-neutral-500 py-8">No logs yet.</div>
              ) : (
                logs?.map((log: any) => (
                  <div key={log.id} className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        {log.status === 'success' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> :
                         log.status === 'retried' ? <RefreshCw className="w-4 h-4 text-yellow-500" /> :
                         <AlertCircle className="w-4 h-4 text-red-500" />}
                        <span className={`font-semibold capitalize ${log.status === 'success' ? 'text-green-400' : log.status === 'retried' ? 'text-yellow-400' : 'text-red-400'}`}>
                          {log.status}
                        </span>
                      </div>
                      <span className="text-neutral-500 flex items-center gap-1 text-xs"><Clock className="w-3 h-3" /> {new Date(log.started_at).toLocaleTimeString()}</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs text-neutral-400 mb-2">
                      <div>Attempts: <span className="text-white">{log.attempt_count}</span></div>
                      <div>Duration: <span className="text-white">{log.duration_ms}ms</span></div>
                    </div>
                    
                    {log.structure_changed && (
                      <div className="mt-2 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-2 py-1 rounded text-xs">
                        ⚠️ DOM Structure Changed
                      </div>
                    )}
                    
                    {log.error_message && (
                      <div className="mt-2 bg-red-500/10 border border-red-500/20 text-red-400 px-2 py-1.5 rounded text-xs break-words">
                        {log.error_message}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
