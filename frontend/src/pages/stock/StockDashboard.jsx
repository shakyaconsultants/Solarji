import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, ShoppingCart, FileText, Plus, TrendingUp, AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react';
import Layout from '../../components/Layout';
import toast from 'react-hot-toast';
import { showApiError } from '../../utils/apiError';
import { useDataCache } from '../../context/DataCacheContext';
import { useAuth } from '../../context/AuthContext';

const ORANGE = '#f7941d';

function StatCard({ label, value, color, icon:Icon, sub }) {
  return (
    <div className="card" style={{ padding:'1.5rem', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:0, left:0, width:4, height:'100%', background:color, borderRadius:'1rem 0 0 1rem' }}/>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', paddingLeft:12 }}>
        <div>
          <p style={{ fontSize:'.7rem', fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.09em', marginBottom:8 }}>{label}</p>
          <p style={{ fontSize:'2.35rem', fontWeight:900, color:'#111111', letterSpacing:'-.04em', lineHeight:1 }}>{value}</p>
          {sub && <p style={{ fontSize:'.78rem', color:'#6b7280', fontWeight:500, marginTop:6 }}>{sub}</p>}
        </div>
        <div style={{ width:44, height:44, borderRadius:12, background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon size={20} style={{ color }}/>
        </div>
      </div>
    </div>
  );
}

export default function StockDashboard() {
  const navigate = useNavigate();
  const { dashboardStock, fetchDashboardStock, isLoading } = useDataCache();
  const [refreshing, setRefreshing] = useState(false);
  const { isAdmin } = useAuth();

  useEffect(() => {
    fetchDashboardStock().catch((err) => showApiError(err, 'Could not load stock dashboard.'));
  }, [fetchDashboardStock]);

  const stats = dashboardStock?.stats ?? { totalItems: 0, totalValue: 0, lowStockCount: 0, totalVouchers: 0 };
  const lowStock = dashboardStock?.lowStock ?? [];
  const items = dashboardStock?.previewItems ?? [];
  const vouchers = dashboardStock?.recentVouchers ?? [];
  const loading = isLoading('dashboard:stock') && !dashboardStock;

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchDashboardStock({ force: true });
      toast.success('Dashboard updated');
    } catch (err) {
      showApiError(err, 'Could not refresh stock dashboard.');
    } finally {
      setRefreshing(false);
    }
  };

  const statCards = [
    { label:'Total Items',     value:stats.totalItems,   icon:Package,       color:'#6366f1' },
    ...(isAdmin ? [{ label:'Inventory Value', value:`₹${(stats.totalValue / 1000).toFixed(0)}K`, icon:TrendingUp, color:ORANGE, sub:'at purchase cost' }] : []),
    { label:'Low Stock',       value:stats.lowStockCount, icon:AlertTriangle, color:'#f43f5e' },
    { label:'Total Vouchers',  value:stats.totalVouchers, icon:FileText,      color:'#10b981' },
  ];

  return (
    <Layout module="stock">
      <div style={{ padding:'clamp(1rem, 4vw, 2rem) clamp(1rem, 4vw, 2rem) clamp(2rem, 5vw, 3rem)', maxWidth:1400 }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'2rem', flexWrap:'wrap', gap:'1rem' }}>
          <div>
            <h1 style={{ fontSize:'1.65rem', fontWeight:900, color:'#111111', letterSpacing:'-.03em', marginBottom:4 }}>Stock Dashboard</h1>
            <p style={{ color:'#9ca3af', fontSize:'.875rem' }}>Inventory &amp; voucher management</p>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="btn-secondary"
              title="Refresh dashboard"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            </button>
            {isAdmin && (
              <button onClick={()=>navigate('/stock/voucher/add')} className="btn-success"><Plus size={15}/> Purchase</button>
            )}
            <button onClick={()=>navigate('/stock/voucher/sell')} className="btn-primary"><ShoppingCart size={15}/> Sell</button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'1rem', marginBottom:'1.5rem', opacity: refreshing ? 0.7 : 1, transition:'opacity .15s' }}>
          {statCards.map(s=><StatCard key={s.label} {...s}/>)}
        </div>

        {/* Low stock */}
        {lowStock.length>0 && (
          <div style={{ marginBottom:'1.5rem', padding:'1rem 1.25rem', borderRadius:16, background:'#fff8f0', border:`1.5px solid rgba(247,148,29,.3)`, display:'flex', alignItems:'flex-start', gap:12 }}>
            <AlertTriangle size={18} style={{ color:ORANGE, flexShrink:0, marginTop:2 }}/>
            <div>
              <p style={{ fontWeight:800, color:'#92400e', fontSize:'.875rem', marginBottom:8 }}>
                Low Stock Alert — {lowStock.length} item{lowStock.length>1?'s':''} need restocking
              </p>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {lowStock.map(i=>(
                  <span key={i._id} style={{ padding:'3px 10px', borderRadius:99, fontSize:'.75rem', fontWeight:700, background:'rgba(247,148,29,.12)', border:'1px solid rgba(247,148,29,.3)', color:'#92400e' }}>
                    {i.name} ({i.quantity} {i.unit})
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.25rem' }}>

          {/* Items */}
          <div className="card">
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.25rem' }}>
              <h2 style={{ fontWeight:800, color:'#111111', fontSize:'1rem' }}>Stock Items</h2>
              <button onClick={()=>navigate('/stock/items')} style={{ fontSize:'.8rem', fontWeight:700, color:ORANGE, background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
                View all <ArrowRight size={13}/>
              </button>
            </div>
            {loading ? (
              <div style={{ padding:'2rem 0', textAlign:'center', color:'#9ca3af' }}>Loading…</div>
            ) : items.length===0 ? (
              <div style={{ padding:'2rem 0', textAlign:'center' }}>
                <Package size={36} style={{ color:'#e5e7eb', display:'block', margin:'0 auto 10px' }}/>
                <p style={{ color:'#9ca3af', fontSize:'.875rem', marginBottom:'1rem' }}>No items yet</p>
                <button onClick={()=>navigate('/stock/items')} className="btn-primary" style={{ fontSize:'.8rem', padding:'.45rem 1rem' }}>Add Items</button>
              </div>
            ) : items.map(item=>(
              <div key={item._id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #f9fafb' }}>
                <div>
                  <p style={{ fontWeight:600, fontSize:'.875rem', color:'#111111' }}>{item.name}</p>
                  <p style={{ fontSize:'.75rem', color:'#9ca3af', marginTop:2 }}>{item.category}</p>
                </div>
                <div style={{ textAlign:'right' }}>
                  <p style={{ fontWeight:700, fontSize:'.875rem', color: item.quantity<=item.minQuantity&&item.minQuantity>0?ORANGE:'#374151' }}>
                    {item.quantity} {item.unit}
                  </p>
                  <p style={{ fontSize:'.72rem', color:'#9ca3af' }}>₹{item.sellPrice}/unit</p>
                </div>
              </div>
            ))}
          </div>

          {/* Vouchers */}
          <div className="card">
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.25rem' }}>
              <h2 style={{ fontWeight:800, color:'#111111', fontSize:'1rem' }}>Recent Vouchers</h2>
              <button onClick={()=>navigate('/stock/vouchers')} style={{ fontSize:'.8rem', fontWeight:700, color:ORANGE, background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
                View all <ArrowRight size={13}/>
              </button>
            </div>
            {loading ? (
              <div style={{ padding:'2rem 0', textAlign:'center', color:'#9ca3af' }}>Loading…</div>
            ) : vouchers.length===0 ? (
              <div style={{ padding:'2rem 0', textAlign:'center' }}>
                <FileText size={36} style={{ color:'#e5e7eb', display:'block', margin:'0 auto 10px' }}/>
                <p style={{ color:'#9ca3af', fontSize:'.875rem' }}>No vouchers yet</p>
              </div>
            ) : vouchers.map(v=>(
              <div key={v._id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #f9fafb' }}>
                <div>
                  <p style={{ fontWeight:700, fontSize:'.875rem', color:'#111111' }}>{v.voucherNumber}</p>
                  <p style={{ fontSize:'.75rem', color:'#9ca3af', marginTop:2 }}>{v.party||'No party'} · {new Date(v.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</p>
                </div>
                <div style={{ textAlign:'right', display:'flex', flexDirection:'column', alignItems:'flex-end', gap:5 }}>
                  <span style={{ padding:'2px 10px', borderRadius:99, fontSize:'.7rem', fontWeight:700, background:v.type==='ADD'?'rgba(16,185,129,.1)':'rgba(244,63,94,.1)', color:v.type==='ADD'?'#059669':'#e11d48' }}>
                    {v.type==='ADD'?'Purchase':'Sale'}
                  </span>
                  <p style={{ fontSize:'.875rem', fontWeight:700, color:'#374151' }}>₹{v.totalAmount.toLocaleString('en-IN')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}

