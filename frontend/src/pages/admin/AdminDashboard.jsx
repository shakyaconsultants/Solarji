import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Users, Target, Package, FileText, Plus, Trash2, Edit2, X, Sun, Layers, RotateCcw, RefreshCw, AlertCircle } from 'lucide-react';
import api from '../../api/axios';
import Layout from '../../components/Layout';
import toast from 'react-hot-toast';
import { showApiError } from '../../utils/apiError';
import { useDataCache } from '../../context/DataCacheContext';

const ORANGE = '#f7941d';

const OVERVIEW = [
  { key:'users',    label:'Users',       icon:Users,    color:'#6366f1', path:'/crm/users'     },
  { key:'leads',    label:'Leads',       icon:Target,   color:ORANGE,    path:'/crm/leads'     },
  { key:'items',    label:'Stock Items', icon:Package,  color:'#10b981', path:'/stock/items'   },
  { key:'vouchers', label:'Vouchers',    icon:FileText, color:'#f43f5e', path:'/stock/vouchers'},
];

const QUICK = [
  { label:'Manage Users',        desc:'Create & manage CRM team',  icon:Users,   color:'#6366f1', path:'/crm/users'  },
  { label:'Service Complaints',  desc:'View & assign complaints',  icon:AlertCircle, color:'#ea580c', path:'/crm/complaints' },
  { label:'Stock Inventory',     desc:'Add & edit stock items',    icon:Layers,  color:'#10b981', path:'/stock/items'},
  { label:'Quotation Generator', desc:'Generate solar estimates',  icon:Sun,     color:ORANGE,    path:'/quotation'  },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const {
    dashboardAdmin, fetchDashboardAdmin, setDashboardAdminData, invalidateDashboardCrm, isLoading,
  } = useDataCache();
  const [refreshing, setRefreshing] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name:'', description:'', footer:'', rows:[] });
  const emptyRow = { label:'', type:'input', formula:'', unit:'', defaultValue:0 };

  useEffect(() => {
    fetchDashboardAdmin().catch((err) => showApiError(err, 'Could not load admin dashboard.'));
  }, [fetchDashboardAdmin]);

  const counts = dashboardAdmin?.counts ?? { users: 0, leads: 0, items: 0, vouchers: 0 };
  const quotationTemplates = dashboardAdmin?.templates ?? [];
  const loading = isLoading('dashboard:admin') && !dashboardAdmin;

  const stats = {
    users: counts.users,
    leads: counts.leads,
    items: counts.items,
    vouchers: counts.vouchers,
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchDashboardAdmin({ force: true });
      toast.success('Dashboard updated');
    } catch (err) {
      showApiError(err, 'Could not refresh admin dashboard.');
    } finally {
      setRefreshing(false);
    }
  };

  const syncTemplates = (templates) => {
    setDashboardAdminData({ counts, templates });
  };

  const openCreate = () => { setEditing(null); setForm({name:'',description:'',footer:'',rows:[{...emptyRow}]}); setShowModal(true); };
  const openEdit   = t  => { setEditing(t); setForm({name:t.name,description:t.description||'',footer:t.footer||'',rows:t.rows.map(r=>({...r}))}); setShowModal(true); };
  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name||form.rows.length===0) return toast.error('Name and rows required');
    setSaving(true);
    try {
      if (editing) {
        const res = await api.put(`/quotations/templates/${editing._id}`, form);
        syncTemplates(quotationTemplates.map((t) => (t._id === editing._id ? res.data : t)));
        toast.success('Template updated');
      } else {
        const res = await api.post('/quotations/templates', form);
        syncTemplates([res.data, ...quotationTemplates]);
        toast.success('Template created');
      }
      setShowModal(false);
    } catch (err) { showApiError(err, 'Could not save quotation template.'); } finally { setSaving(false); }
  };
  const handleDelete = async id => {
    if(!window.confirm('Delete this template?')) return;
    try {
      await api.delete(`/quotations/templates/${id}`);
      syncTemplates(quotationTemplates.filter((t) => t._id !== id));
      toast.success('Deleted');
    }
    catch (err) { showApiError(err, 'Could not delete quotation template.'); }
  };

  const handleResetAllPoints = async () => {
    if (!window.confirm('Reset reward points to 0 for ALL team members?')) return;
    try {
      await api.post('/users/reset-points');
      invalidateDashboardCrm();
      toast.success('All reward points reset');
    } catch (err) {
      showApiError(err, 'Could not reset reward points.');
    }
  };

  const addRow    = () => setForm(f=>({...f,rows:[...f.rows,{...emptyRow}]}));
  const removeRow = i  => setForm(f=>({...f,rows:f.rows.filter((_,idx)=>idx!==i)}));
  const updateRow = (i,field,val) => setForm(f=>{const rows=[...f.rows];rows[i]={...rows[i],[field]:val};return{...f,rows};});

  return (
    <Layout module="crm">
      <div style={{ padding:'clamp(1rem, 4vw, 2rem) clamp(1rem, 4vw, 2rem) clamp(2rem, 5vw, 3rem)', maxWidth:1200 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'2rem', flexWrap:'wrap', gap:'1rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:42, height:42, borderRadius:12, background:'rgba(247,148,29,.1)', border:`1.5px solid rgba(247,148,29,.25)`, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Settings size={18} style={{ color:ORANGE }}/>
            </div>
            <div>
              <h1 style={{ fontSize:'1.65rem', fontWeight:900, color:'#111111', letterSpacing:'-.03em', lineHeight:1 }}>Admin Panel</h1>
              <p style={{ fontSize:'.875rem', color:'#9ca3af' }}>System overview &amp; configuration</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="btn-secondary"
            title="Refresh dashboard"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(175px,1fr))', gap:'1rem', marginBottom:'1.75rem', opacity: refreshing ? 0.7 : 1, transition:'opacity .15s' }}>
          {OVERVIEW.map(({ key, label, icon:Icon, color, path }) => (
            <button key={key} onClick={()=>navigate(path)} className="card" style={{ textAlign:'left', cursor:'pointer', border:'1.5px solid #f0f0f0', transition:'all .15s', padding:'1.5rem', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:color, borderRadius:'1rem 1rem 0 0' }}/>
              <div style={{ width:38, height:38, borderRadius:10, background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'1rem' }}>
                <Icon size={18} style={{ color }}/>
              </div>
              <p style={{ fontSize:'2rem', fontWeight:900, color:'#111111', letterSpacing:'-.04em', lineHeight:1, marginBottom:4 }}>{loading ? '…' : stats[key]}</p>
              <p style={{ fontSize:'.78rem', fontWeight:600, color:'#6b7280' }}>{label}</p>
            </button>
          ))}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:'1rem', marginBottom:'1.75rem' }}>
          {QUICK.map(({ label, desc, icon:Icon, color, path }) => (
            <button key={label} onClick={()=>navigate(path)} className="card" style={{ textAlign:'left', cursor:'pointer', display:'flex', alignItems:'center', gap:14, border:'1.5px solid #f0f0f0', borderLeft:`4px solid ${color}`, padding:'1.25rem 1.5rem' }}>
              <div style={{ width:40, height:40, borderRadius:10, background:`${color}15`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Icon size={18} style={{ color }}/>
              </div>
              <div>
                <p style={{ fontWeight:800, color:'#111111', fontSize:'.875rem' }}>{label}</p>
                <p style={{ fontSize:'.75rem', color:'#9ca3af', marginTop:2 }}>{desc}</p>
              </div>
            </button>
          ))}
          <button onClick={handleResetAllPoints} className="card" style={{ textAlign:'left', cursor:'pointer', display:'flex', alignItems:'center', gap:14, border:'1.5px solid #f0f0f0', borderLeft:'4px solid #f43f5e', padding:'1.25rem 1.5rem' }}>
            <div style={{ width:40, height:40, borderRadius:10, background:'#f43f5e15', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <RotateCcw size={18} style={{ color:'#f43f5e' }}/>
            </div>
            <div>
              <p style={{ fontWeight:800, color:'#111111', fontSize:'.875rem' }}>Reset Reward Points</p>
              <p style={{ fontSize:'.75rem', color:'#9ca3af', marginTop:2 }}>Set all team points back to zero</p>
            </div>
          </button>
        </div>
        <div className="card">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.25rem' }}>
            <div>
              <h2 style={{ fontWeight:800, color:'#111111', fontSize:'1rem' }}>Quotation Templates</h2>
              <p style={{ fontSize:'.78rem', color:'#9ca3af', marginTop:2 }}>Customise the solar quotation calculator</p>
            </div>
            <button onClick={openCreate} className="btn-primary" style={{ fontSize:'.8rem', padding:'.5rem 1rem' }}><Plus size={14}/> New Template</button>
          </div>
          {loading ? (
            <div style={{ padding:'2.5rem 0', textAlign:'center', color:'#9ca3af' }}>Loading templates…</div>
          ) : quotationTemplates.length===0 ? (
            <div style={{ padding:'2.5rem 0', textAlign:'center' }}>
              <FileText size={40} style={{ color:'#e5e7eb', display:'block', margin:'0 auto 10px' }}/>
              <p style={{ color:'#9ca3af', fontSize:'.875rem' }}>No templates yet.</p>
            </div>
          ) : quotationTemplates.map(t=>(
            <div key={t._id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'1rem 1.25rem', borderRadius:14, border:'1.5px solid #f0f0f0', marginBottom:8 }}>
              <div>
                <p style={{ fontWeight:800, color:'#111111', fontSize:'.875rem' }}>{t.name}</p>
                {t.description&&<p style={{ fontSize:'.78rem', color:'#9ca3af', marginTop:2 }}>{t.description}</p>}
              </div>
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={()=>openEdit(t)} className="btn-secondary" style={{ padding:'.4rem .7rem' }}><Edit2 size={13}/></button>
                <button onClick={()=>handleDelete(t._id)} className="btn-danger" style={{ padding:'.4rem .7rem' }}><Trash2 size={13}/></button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {showModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50, padding:'1rem' }}>
          <div style={{ background:'#fff', borderRadius:24, width:'100%', maxWidth:740, maxHeight:'90vh', overflow:'auto' }}>
            <div style={{ padding:'1.5rem 2rem', borderBottom:'1px solid #f0f0f0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <h3 style={{ fontWeight:900, color:'#111111' }}>{editing?'Edit':'Create'} Template</h3>
              <button onClick={()=>setShowModal(false)} style={{ background:'none', border:'none', cursor:'pointer' }}><X size={20}/></button>
            </div>
            <form onSubmit={handleSave} style={{ padding:'1.5rem 2rem', display:'flex', flexDirection:'column', gap:'1.25rem' }}>
              <div><label className="label">Template Name *</label><input className="input" required value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></div>
              <div><label className="label">Description</label><input className="input" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/></div>
              <button type="button" onClick={addRow} className="btn-secondary"><Plus size={12}/> Add Row</button>
              {form.rows.map((row,i)=>(
                <div key={i} className="grid grid-cols-2 gap-2">
                  <input className="input" value={row.label} onChange={e=>updateRow(i,'label',e.target.value)} placeholder="Label"/>
                  <button type="button" onClick={()=>removeRow(i)} className="btn-danger">Remove</button>
                </div>
              ))}
              <div style={{ display:'flex', gap:10 }}>
                <button type="button" onClick={()=>setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" className="btn-primary flex-1 justify-center" disabled={saving}>{saving?'Saving…':'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
