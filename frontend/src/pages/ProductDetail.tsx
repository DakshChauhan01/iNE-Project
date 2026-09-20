import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  ArrowLeft, RefreshCw, Trash2, CheckCircle2, AlertCircle,
  ExternalLink, Star, Loader2, ThumbsUp, Package,
} from 'lucide-react';
import { getCategoryEmoji } from '../utils/categoryEmoji';
import { useWakingUp } from '../hooks/useWakingUp';

const API = import.meta.env.VITE_API_URL || 'https://ine-project-yc8q.onrender.com';

/* ─── helpers ─────────────────────────────────────────────────────────── */
function camelToLabel(key: string) {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-neutral-600'}`}
        />
      ))}
    </div>
  );
}

/* ─── skeleton block ──────────────────────────────────────────────────── */
function Skel({ h = 'h-5', w = 'w-full', cls = '' }: { h?: string; w?: string; cls?: string }) {
  return (
    <div
      className={`skeleton rounded-lg ${h} ${w} ${cls}`}
      style={{ background: 'var(--skeleton-bg)', border: '1px solid var(--skeleton-border)' }}
    />
  );
}

/* ─── custom chart dot ────────────────────────────────────────────────── */
function PriceDot(props: any) {
  const { cx, cy, payload } = props;
  if (!cx || !cy) return null;
  return (
    <circle
      cx={cx} cy={cy} r={5}
      fill={payload.in_stock ? '#22c55e' : '#ef4444'}
      stroke="var(--bg-base)" strokeWidth={2}
    />
  );
}

/* ─── status badge ────────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    success: { bg: 'bg-green-500/20 border-green-500/30', text: 'text-green-400', icon: <CheckCircle2 className="w-3 h-3" /> },
    retried: { bg: 'bg-yellow-500/20 border-yellow-500/30', text: 'text-yellow-400', icon: <RefreshCw className="w-3 h-3" /> },
    failed:  { bg: 'bg-red-500/20 border-red-500/30',    text: 'text-red-400',    icon: <AlertCircle className="w-3 h-3" /> },
  };
  const c = cfg[status] ?? cfg.failed;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold border ${c.bg} ${c.text}`}>
      {c.icon} <span className="capitalize">{status}</span>
    </span>
  );
}

/* ─── main component ──────────────────────────────────────────────────── */
export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  /* our tracker data */
  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const res = await fetch(`${API}/api/products/${id}`);
      if (!res.ok) throw new Error('Product not found');
      return res.json();
    },
    staleTime: 60000,
  });

  /* external store data */
  const { data: storeProduct, isLoading: storeLoading } = useQuery({
    queryKey: ['storeProduct', product?.store_product_id],
    queryFn: async () => {
      const res = await fetch(`${API}/api/store/product/${product.store_product_id}`);
      if (!res.ok) throw new Error('Store data unavailable');
      return res.json();
    },
    enabled: !!product?.store_product_id,
    staleTime: 300000, // 5 min — store data is stable
  });

  /* price history */
  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['product', id, 'history'],
    queryFn: async () => {
      const res = await fetch(`${API}/api/products/${id}/history`);
      if (!res.ok) throw new Error('History unavailable');
      return res.json();
    },
  });

  /* scrape logs */
  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ['product', id, 'logs'],
    queryFn: async () => {
      const res = await fetch(`${API}/api/products/${id}/logs`);
      if (!res.ok) throw new Error('Logs unavailable');
      return res.json();
    },
  });

  /* mutations */
  const scrapeMutation = useMutation({
    mutationFn: () => fetch(`${API}/api/products/${id}/scrape`, { method: 'POST' }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product', id, 'history'] });
      queryClient.invalidateQueries({ queryKey: ['product', id, 'logs'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => fetch(`${API}/api/products/${id}`, { method: 'DELETE' }).then(r => r.json()),
    onSuccess: () => navigate('/'),
  });

  /* derived state */
  const isWakingUp = useWakingUp(productLoading || storeLoading || historyLoading);
  const latestPrice = history?.[0];
  const leftLoading = productLoading || storeLoading;

  const chartData = (history ?? [])
    .slice()
    .reverse()
    .map((h: any) => ({
      time: new Date(h.scraped_at).toLocaleString([], {
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      }),
      price: h.price,
      in_stock: h.in_stock,
    }));

  /* specs: normalise weightGrams → "1,234 g", modelYear → plain string */
  const specEntries: [string, string][] = storeProduct?.specs
    ? Object.entries(storeProduct.specs).map(([k, v]) => {
        let label = camelToLabel(k);
        let val = String(v);
        if (k === 'weightGrams') { label = 'Weight'; val = `${Number(v).toLocaleString()} g`; }
        if (k === 'modelYear')   { label = 'Model Year'; }
        if (k === 'inTheBox')    { label = 'In the Box'; }
        if (k === 'countryOfOrigin') { label = 'Country of Origin'; }
        return [label, val];
      })
    : [];

  return (
    <div className="animate-fade-in space-y-6 pb-16">

      {/* ── top bar ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm font-medium transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        <button
          onClick={() => { if (confirm('Stop tracking this product?')) deleteMutation.mutate(); }}
          disabled={deleteMutation.isPending}
          className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" /> Untrack
        </button>
      </div>

      {/* ── waking-up notice ────────────────────────────────────────── */}
      {isWakingUp && (
        <div
          className="flex items-center justify-center gap-2 text-sm font-medium py-3 px-4 rounded-xl animate-pulse glass-panel"
          style={{ color: '#60a5fa' }}
        >
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          Waking up the server — this can take up to a minute on the free tier…
        </div>
      )}

      {/* ── two-column layout ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-8 items-start">

        {/* ══ LEFT COLUMN — store info ════════════════════════════════ */}
        <div className="space-y-5">

          {/* product card */}
          <div
            className="glass-panel rounded-2xl p-7 space-y-6"
            style={{ opacity: leftLoading ? 0.6 : 1, transition: 'opacity 0.4s ease' }}
          >
            {/* thumbnail */}
            <div
              className="w-full aspect-video rounded-xl flex items-center justify-center overflow-hidden"
              style={{ background: 'var(--skeleton-bg)', border: '1px solid var(--panel-border)' }}
            >
              {leftLoading ? (
                <Loader2 className="w-10 h-10 animate-spin" style={{ color: 'var(--text-muted)' }} />
              ) : product?.image_url ? (
                <img src={product.image_url} alt={product.name} className="w-full h-full object-contain" />
              ) : storeProduct?.imageUrl ? (
                <img src={storeProduct.imageUrl} alt={product?.name} className="w-full h-full object-contain" />
              ) : (
                <span className="text-7xl select-none drop-shadow-sm">
                  {getCategoryEmoji(product?.name ?? '', product?.category || storeProduct?.category)}
                </span>
              )}
            </div>

            {/* category label */}
            {leftLoading ? <Skel h="h-4" w="w-24" /> : (
              <p
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: '#60a5fa' }}
              >
                {product?.category || storeProduct?.category || 'Product'}
              </p>
            )}

            {/* title */}
            {leftLoading ? (
              <div className="space-y-2"><Skel h="h-8" /><Skel h="h-5" w="w-2/3" /></div>
            ) : (
              <div>
                <h1 className="text-2xl font-bold font-display leading-tight" style={{ color: 'var(--text-primary)' }}>
                  {product?.name}
                </h1>
                {/* brand + SKU */}
                <p className="mt-1.5 text-sm" style={{ color: 'var(--text-muted)' }}>
                  {[storeProduct?.brand, storeProduct?.sku].filter(Boolean).join(' · ')}
                </p>
              </div>
            )}

            {/* store link */}
            {!leftLoading && product?.store_url && (
              <a
                href={product.store_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors hover:opacity-80"
                style={{
                  color: 'var(--text-secondary)',
                  borderColor: 'var(--panel-border)',
                  background: 'var(--panel-bg)',
                }}
              >
                <ExternalLink className="w-3.5 h-3.5" /> View on Store
              </a>
            )}

            {/* about */}
            {leftLoading ? (
              <div className="space-y-1.5"><Skel h="h-4" /><Skel h="h-4" /><Skel h="h-4" w="w-3/4" /></div>
            ) : storeProduct?.description && (
              <div>
                <h3
                  className="text-xs font-semibold uppercase tracking-widest mb-2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  About this item
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {storeProduct.description}
                </p>
              </div>
            )}
          </div>

          {/* specs card */}
          {leftLoading ? (
            <div className="glass-panel rounded-2xl p-7 space-y-3">
              {[1,2,3,4,5].map(i => <Skel key={i} h="h-5" />)}
            </div>
          ) : specEntries.length > 0 && (
            <div className="glass-panel rounded-2xl p-7">
              <h2 className="font-display font-bold text-base mb-4" style={{ color: 'var(--text-primary)' }}>
                Specifications
              </h2>
              <table className="spec-table">
                <tbody>
                  {specEntries.map(([label, val]) => (
                    <tr key={label}>
                      <td>{label}</td>
                      <td>{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* reviews card */}
          {!leftLoading && storeProduct?.reviews?.length > 0 && (
            <div className="glass-panel rounded-2xl p-7">
              <h2 className="font-display font-bold text-base mb-5" style={{ color: 'var(--text-primary)' }}>
                Customer Reviews
              </h2>
              <div className="space-y-4 max-h-[520px] overflow-y-auto custom-scrollbar pr-1">
                {storeProduct.reviews.map((r: any) => (
                  <div
                    key={r.id}
                    className="rounded-xl p-4 space-y-2"
                    style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)' }}
                  >
                    {/* header row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                            {r.author}
                          </span>
                          {r.verifiedPurchase && (
                            <span className="bg-blue-500/15 text-blue-400 text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider font-bold border border-blue-500/20">
                              Verified
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {new Date(r.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <StarRow rating={r.rating} />
                    </div>

                    {/* review title */}
                    <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {r.title}
                    </h4>

                    {/* body */}
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {r.body}
                    </p>

                    {/* helpful votes */}
                    {r.helpfulVotes > 0 && (
                      <p
                        className="flex items-center gap-1 text-[11px]"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <ThumbsUp className="w-3 h-3" />
                        {r.helpfulVotes} {r.helpfulVotes === 1 ? 'person' : 'people'} found this helpful
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ══ RIGHT COLUMN — tracker data ════════════════════════════ */}
        <div className="space-y-5">

          {/* price card */}
          <div className="glass-panel rounded-2xl overflow-hidden" style={{ borderColor: 'rgba(59,130,246,0.25)' }}>
            <div className="h-1 w-full" style={{ background: 'linear-gradient(to right, #3b82f6, #818cf8)' }} />
            <div className="p-7 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
                  Current Tracked Price
                </p>
                {historyLoading ? (
                  <Skel h="h-12" w="w-48" />
                ) : latestPrice ? (
                  <div className="price-pop flex flex-wrap items-center gap-3">
                    <span className="text-5xl font-bold font-display tracking-tight" style={{ color: 'var(--text-primary)' }}>
                      ₹{latestPrice.price?.toLocaleString() ?? '--'}
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                        latestPrice.in_stock
                          ? 'bg-green-500/20 text-green-400 border-green-500/30'
                          : 'bg-red-500/20 text-red-400 border-red-500/30'
                      }`}
                    >
                      {latestPrice.in_stock ? 'In Stock' : 'Out of Stock'}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                    <Package className="w-5 h-5" /> No data yet — click Refresh to scrape
                  </div>
                )}
              </div>

              <button
                onClick={() => scrapeMutation.mutate()}
                disabled={scrapeMutation.isPending}
                className={`shrink-0 flex flex-col items-center justify-center gap-1.5 w-20 h-20 rounded-2xl text-white text-xs font-semibold uppercase tracking-wide transition-all shadow-lg disabled:opacity-60 ${
                  scrapeMutation.isPending
                    ? 'bg-blue-700 cursor-wait'
                    : 'bg-blue-600 hover:bg-blue-500 active:scale-95'
                }`}
              >
                <RefreshCw className={`w-6 h-6 ${scrapeMutation.isPending ? 'animate-spin' : ''}`} />
                {scrapeMutation.isPending ? 'Scraping' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* price history chart */}
          <div className="glass-panel rounded-2xl p-7 flex flex-col" style={{ height: '380px' }}>
            <div className="flex items-center justify-between mb-5 shrink-0">
              <h2 className="font-display font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                Price History
              </h2>
              <div
                className="flex gap-3 text-xs px-3 py-1.5 rounded-full border"
                style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', color: 'var(--text-secondary)' }}
              >
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> In Stock</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Out of Stock</span>
              </div>
            </div>

            <div className="flex-1 min-h-0">
              {historyLoading ? (
                <Skel h="h-full" />
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ left: 8, right: 8, bottom: 0, top: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                    <XAxis
                      dataKey="time"
                      stroke="var(--chart-axis)"
                      tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
                      minTickGap={40}
                    />
                    <YAxis
                      stroke="var(--chart-axis)"
                      tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
                      domain={['auto', 'auto']}
                      tickFormatter={v => `₹${Number(v).toLocaleString()}`}
                      width={70}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--tooltip-bg)',
                        borderColor: 'var(--tooltip-border)',
                        borderRadius: '10px',
                        fontSize: 12,
                      }}
                      itemStyle={{ color: '#3b82f6' }}
                      labelStyle={{ color: 'var(--chart-axis)', marginBottom: 4 }}
                    />
                    <Line
                      type="stepAfter"
                      dataKey="price"
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      dot={<PriceDot />}
                      activeDot={{ r: 7, fill: '#3b82f6', stroke: 'var(--bg-base)', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div
                  className="h-full flex items-center justify-center text-sm rounded-xl border-2 border-dashed"
                  style={{ color: 'var(--text-muted)', borderColor: 'var(--panel-border)' }}
                >
                  No price history yet
                </div>
              )}
            </div>
          </div>

          {/* scrape logs */}
          <div className="glass-panel rounded-2xl p-7 flex flex-col" style={{ height: '380px' }}>
            <h2 className="font-display font-bold text-base mb-4 shrink-0" style={{ color: 'var(--text-primary)' }}>
              Scrape Logs
            </h2>

            <div className="flex-1 overflow-auto custom-scrollbar min-h-0">
              {logsLoading ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => <Skel key={i} h="h-10" />)}
                </div>
              ) : !logs?.length ? (
                <div
                  className="h-full flex items-center justify-center text-sm rounded-xl border-2 border-dashed"
                  style={{ color: 'var(--text-muted)', borderColor: 'var(--panel-border)' }}
                >
                  No logs yet
                </div>
              ) : (
                <table
                  className="w-full text-left border-collapse text-sm"
                  style={{ minWidth: '520px' }}
                >
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--panel-border)', color: 'var(--text-muted)' }}>
                      <th className="pb-2.5 font-medium pr-4">Status</th>
                      <th className="pb-2.5 font-medium pr-4">Time</th>
                      <th className="pb-2.5 font-medium pr-4 text-right">Attempt</th>
                      <th className="pb-2.5 font-medium pr-4 text-right">Duration</th>
                      <th className="pb-2.5 font-medium">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log: any) => (
                      <tr
                        key={log.id}
                        style={{ borderBottom: '1px solid var(--panel-border)', color: 'var(--text-secondary)' }}
                        className="hover:opacity-80 transition-opacity"
                      >
                        <td className="py-2.5 pr-4"><StatusBadge status={log.status} /></td>
                        <td className="py-2.5 pr-4 whitespace-nowrap text-xs">
                          {new Date(log.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="py-2.5 pr-4 text-right text-xs">{log.attempt_count}</td>
                        <td className="py-2.5 pr-4 text-right text-xs whitespace-nowrap">{log.duration_ms} ms</td>
                        <td className="py-2.5 text-xs max-w-[180px]">
                          <span className="block truncate" title={log.error_message || ''}>
                            {log.error_message || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                          </span>
                          {log.structure_changed && (
                            <span className="text-yellow-400 text-[10px] uppercase font-bold">DOM changed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
