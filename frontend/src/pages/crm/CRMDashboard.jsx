import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, Plus, Clock, CheckCircle, ArrowRight, Activity, Star, RotateCcw, RefreshCw } from 'lucide-react';
import api from '../../api/axios';
import Layout from '../../components/Layout';
import { roleLabel } from '../../utils/roles';
import { useAuth } from '../../context/AuthContext';
import { useDataCache } from '../../context/DataCacheContext';
import toast from 'react-hot-toast';
import { showApiError } from '../../utils/apiError';

const ORANGE = '#f7941d';
const STAGES = ['Lead','Calling','Visit','Filing','Loan Filing','Loan Process','Installation','Kesco Filing','Kesco Process','Meter Install','Commission'];

const STAGE_STYLE = {
  'Lead':          { bg:'#eff6ff', color:'#1d4ed8' }, 'Calling':      { bg:'#f0fdf4', color:'#15803d' },
  'Visit':         { bg:'#fdf4ff', color:'#7e22ce' }, 'Filing':       { bg:'#fefce8', color:'#854d0e' },
  'Loan Filing':   { bg:'#fff7ed', color:'#c2410c' }, 'Loan Process': { bg:'#fff7ed', color:'#ea580c' },
  'Installation':  { bg:'#f0fdf4', color:'#166534' }, 'Kesco Filing': { bg:'#f0fdfa', color:'#0f766e' },
  'Kesco Process': { bg:'#ecfeff', color:'#0e7490' }, 'Meter Install':{ bg:'#eef2ff', color:'#4338ca' },
  'Commission':    { bg:'rgba(247,148,29,.12)',  color:ORANGE },
};

function StatCard({ label, value, icon:Icon, color, sub }) {
  return (
    <div className="card" style={{ padding:'1.5rem', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:0, left:0, width:4, height:'100%', background:color, borderRadius:'1rem 0 0 1rem' }} />
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', paddingLeft:12 }}>
        <div>
          <p style={{ fontSize:'.7rem', fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.09em', marginBottom:8 }}>{label}</p>
          <p style={{ fontSize:'2.5rem', fontWeight:900, color:'#111111', letterSpacing:'-.04em', lineHeight:1 }}>{value}</p>
          {sub && <p style={{ fontSize:'.78rem', color:'#10b981', fontWeight:600, marginTop:6 }}>{sub}</p>}
        </div>
        <div style={{ width:44, height:44, borderRadius:12, background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon size={20} style={{ color }} />
        </div>
      </div>
    </div>
  );
}

function medalColor(i) {
  return i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#d97706' : '#9ca3af';
}

export default function CRMDashboard() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const {
    dashboardCrm, fetchDashboardCrm, setDashboardCrmData, isLoading,
  } = useDataCache();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardCrm().catch((err) => showApiError(err, 'Could not load CRM dashboard.'));
  }, [fetchDashboardCrm]);

  const stats = dashboardCrm?.stats ?? { total: 0, stageCounts: {}, commissioned: 0, inProgress: 0, newToday: 0 };
  const recent = dashboardCrm?.recent ?? [];
  const leaderboard = dashboardCrm?.leaderboard ?? [];
  const sc = stats.stageCounts || {};
  const loading = isLoading('dashboard:crm') && !dashboardCrm;

  const statCards = [
    { label:'Total Leads',  value:stats.total ?? 0, icon:Target,      color:'#6366f1' },
    { label:'Commissioned', value:stats.commissioned ?? 0, icon:CheckCircle, color:ORANGE },
    { label:'In Progress',  value:stats.inProgress ?? 0, icon:Activity, color:'#10b981' },
    { label:'New Today',    value:stats.newToday ?? 0, icon:Clock, color:'#f43f5e' },
  ];

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchDashboardCrm({ force: true });
      toast.success('Dashboard updated');
    } catch (err) {
      showApiError(err, 'Could not refresh CRM dashboard.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleResetAllPoints = async () => {
    if (!window.confirm('Reset reward points to 0 for ALL team members?')) return;
    try {
      await api.post('/users/reset-points');
      if (dashboardCrm) {
        setDashboardCrmData({
          ...dashboardCrm,
          leaderboard: (dashboardCrm.leaderboard || []).map((u) => ({ ...u, points: 0 })),
        });
      }
      toast.success('All reward points reset');
    } catch (err) {
      showApiError(err, 'Could not reset reward points.');
    }
  };

  return (
    <Layout module="crm">
      <div style={{ padding:'clamp(1rem, 4vw, 2rem) clamp(1rem, 4vw, 2rem) clamp(2rem, 5vw, 3rem)', maxWidth:1400 }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'2rem', flexWrap:'wrap', gap:'1rem' }}>
          <div>
            <h1 style={{ fontSize:'1.65rem', fontWeight:900, color:'#111111', letterSpacing:'-.03em', marginBottom:4 }}>CRM Dashboard</h1>
            <p style={{ color:'#9ca3af', fontSize:'.875rem' }}>Welcome back, <span style={{ color:ORANGE, fontWeight:700 }}>{user?.name}</span> 👋</p>
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
            <button onClick={() => navigate('/crm/leads/new')} className="btn-primary"><Plus size={15}/> New Lead</button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'1rem', marginBottom:'1.75rem', opacity: refreshing ? 0.7 : 1, transition:'opacity .15s' }}>
          {statCards.map(s => <StatCard key={s.label} {...s}/>)}
        </div>

        {/* Pipeline */}
        <div className="card" style={{ marginBottom:'1.5rem' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.25rem' }}>
            <h2 style={{ fontWeight:800, color:'#111111', fontSize:'1rem' }}>Lead Pipeline</h2>
            <span style={{ fontSize:'.78rem', color:'#9ca3af' }}>{stats.total ?? 0} total leads</span>
          </div>
          <div style={{ overflowX:'auto', paddingBottom:4 }}>
            <div style={{ display:'flex', gap:8, minWidth:'max-content' }}>
              {STAGES.map(stage => (
                <button key={stage} onClick={() => navigate(`/crm/leads?stage=${stage}`)} style={{
                  display:'flex', flexDirection:'column', alignItems:'center', gap:5,
                  padding:'12px 14px', borderRadius:12, minWidth:88, cursor:'pointer',
                  background: sc[stage]>0?'rgba(247,148,29,.06)':'#fafafa',
                  border:`1.5px solid ${sc[stage]>0?'rgba(247,148,29,.25)':'#f0f0f0'}`,
                  transition:'all .15s',
                }}
                  onMouseEnter={e=>{e.currentTarget.style.background='rgba(247,148,29,.1)';e.currentTarget.style.borderColor='rgba(247,148,29,.4)';e.currentTarget.style.transform='translateY(-2px)';}}
                  onMouseLeave={e=>{e.currentTarget.style.background=sc[stage]>0?'rgba(247,148,29,.06)':'#fafafa';e.currentTarget.style.borderColor=sc[stage]>0?'rgba(247,148,29,.25)':'#f0f0f0';e.currentTarget.style.transform='translateY(0)';}}
                >
                  <span style={{ fontSize:'1.6rem', fontWeight:900, color:sc[stage]>0?ORANGE:'#d1d5db', letterSpacing:'-.03em' }}>{sc[stage]||0}</span>
                  <span style={{ fontSize:'.67rem', color:'#9ca3af', textAlign:'center', lineHeight:1.3, fontWeight:600 }}>{stage}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        {leaderboard.length > 0 && (
          <div className="card" style={{ marginBottom:'1.5rem' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.25rem' }}>
              <h2 style={{ fontWeight:800, color:'#111111', fontSize:'1rem', display:'flex', alignItems:'center', gap:7 }}>
                <Star size={15} style={{ color: ORANGE }}/> Team Leaderboard
              </h2>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:'.75rem', color:'#9ca3af', fontWeight:500 }}>Points = 5 − days in stage</span>
              {isAdmin && (
                <button
                  onClick={handleResetAllPoints}
                  className="btn-secondary"
                  style={{ fontSize:'.72rem', padding:'5px 10px' }}
                >
                  <RotateCcw size={12} /> Reset All Points
                </button>
              )}
            </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {leaderboard.map((u, i) => {
                const isMe = u._id === user?._id;
                return (
                  <div key={u._id} style={{
                    display:'flex', alignItems:'center', gap:12, padding:'10px 14px',
                    borderRadius:12, background: isMe ? 'rgba(247,148,29,.07)' : '#fafafa',
                    border:`1.5px solid ${isMe ? 'rgba(247,148,29,.3)' : '#f0f0f0'}`,
                  }}>
                    <span style={{ width:26, height:26, borderRadius:'50%', background: medalColor(i) + '22', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:'.78rem', color: medalColor(i), flexShrink:0 }}>
                      {i + 1}
                    </span>
                    <div style={{ width:30, height:30, borderRadius:8, background: ORANGE, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, color:'#fff', fontSize:'.82rem', flexShrink:0 }}>
                      {u.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontWeight:700, color:'#111', fontSize:'.875rem', marginBottom:1 }}>{u.name} {isMe && <span style={{ fontSize:'.65rem', color:ORANGE }}>(you)</span>}</p>
                      <p style={{ fontSize:'.72rem', color:'#9ca3af', textTransform:'capitalize' }}>
                        {roleLabel(u.role)}
                      </p>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <p style={{ fontWeight:900, fontSize:'1.3rem', color: u.points >= 0 ? '#10b981' : '#f43f5e', letterSpacing:'-.03em', lineHeight:1 }}>
                        {u.points >= 0 ? `+${u.points}` : u.points}
                      </p>
                      <p style={{ fontSize:'.65rem', color:'#9ca3af', fontWeight:600 }}>points</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <p style={{ fontSize:'.72rem', color:'#9ca3af', marginTop:10, lineHeight:1.6 }}>
              <strong>How it works:</strong> When you move a lead to the next stage, you earn <strong>5 − days_in_stage</strong> points.<br/>
              Move same day → +5 pts · After 1 day → +4 · After 5 days → 0 · After 6+ days → negative
            </p>
          </div>
        )}

        {/* Table */}
        <div className="card">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.25rem' }}>
            <h2 style={{ fontWeight:800, color:'#111111', fontSize:'1rem' }}>Recent Leads</h2>
            <button onClick={() => navigate('/crm/leads')} style={{ fontSize:'.8rem', fontWeight:700, color:ORANGE, background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
              View all <ArrowRight size={13}/>
            </button>
          </div>

          {loading ? (
            <div style={{ padding:'3rem 0', textAlign:'center', color:'#9ca3af' }}>
              <div style={{ width:32, height:32, borderRadius:'50%', border:`3px solid #f0f0f0`, borderTopColor:ORANGE, animation:'spin 1s linear infinite', margin:'0 auto 12px' }}/>
              Loading…
            </div>
          ) : recent.length === 0 ? (
            <div style={{ padding:'3rem 0', textAlign:'center' }}>
              <Target size={40} style={{ color:'#e5e7eb', display:'block', margin:'0 auto 12px' }}/>
              <p style={{ color:'#9ca3af', marginBottom:'1rem' }}>No leads yet. Add your first one!</p>
              <button onClick={()=>navigate('/crm/leads/new')} className="btn-primary">Create First Lead</button>
            </div>
          ) : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ borderBottom:'2px solid #f5f6f8' }}>
                    {['Name','Phone','Stage','Assigned To','Updated'].map(h=>(
                      <th key={h} style={{ textAlign:'left', padding:'10px 16px', fontSize:'.7rem', fontWeight:800, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.08em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recent.map(lead => (
                    <tr key={lead._id} onClick={()=>navigate(`/crm/leads/${lead._id}`)}
                      style={{ borderBottom:'1px solid #f9fafb', cursor:'pointer', transition:'background .1s' }}
                      onMouseEnter={e=>e.currentTarget.style.background='#fff8f0'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                    >
                      <td style={{ padding:'13px 16px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <div style={{ width:33, height:33, borderRadius:'50%', background:ORANGE, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'.8rem', fontWeight:900, color:'#fff', flexShrink:0 }}>
                            {lead.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <span style={{ fontWeight:700, color:'#111111', fontSize:'.875rem' }}>{lead.name}</span>
                        </div>
                      </td>
                      <td style={{ padding:'13px 16px', fontSize:'.85rem', color:'#6b7280' }}>{lead.phone}</td>
                      <td style={{ padding:'13px 16px' }}>
                        <span style={{ display:'inline-flex', padding:'3px 10px', borderRadius:99, fontSize:'.72rem', fontWeight:700, background:STAGE_STYLE[lead.stage]?.bg||'#f3f4f6', color:STAGE_STYLE[lead.stage]?.color||'#374151' }}>
                          {lead.stage}
                        </span>
                      </td>
                      <td style={{ padding:'13px 16px', fontSize:'.85rem', color:'#6b7280' }}>{lead.assignedTo?.name||'—'}</td>
                      <td style={{ padding:'13px 16px', fontSize:'.8rem', color:'#9ca3af' }}>{new Date(lead.updatedAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </Layout>
  );
}
