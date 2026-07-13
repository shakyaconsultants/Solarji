import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, Target, Package, ShoppingCart, FileText,
  LogOut, Settings, PlusCircle, BarChart3, Home, Layers, ChevronRight, X, AlertCircle,
} from 'lucide-react';
import logo from '../assets/solarji logo.jpeg';
import { roleLabel } from '../utils/roles';

const CRM_LINKS = [
  { to:'/crm',           label:'Dashboard',      icon:LayoutDashboard, end:true },
  { to:'/crm/leads',     label:'All Leads',       icon:Target },
  { to:'/crm/leads/new', label:'New Lead',         icon:PlusCircle },
  { to:'/crm/complaints', label:'Complaints',     icon:AlertCircle },
  { to:'/crm/orders',     label:'Shop Orders',     icon:ShoppingCart },
];
const CRM_TEAM   = [{ to:'/crm/team', label:'Team', icon:Users }];
const CRM_ADMIN  = [{ to:'/crm/users', label:'User Management', icon:Users }];
const STOCK_LINKS = [
  { to:'/stock',              label:'Dashboard',      icon:BarChart3,   end:true },
  { to:'/stock/items',        label:'Inventory',       icon:Package },
  { to:'/stock/voucher/add',  label:'Purchase Voucher',icon:ShoppingCart },
  { to:'/stock/voucher/sell', label:'Sales Voucher',   icon:FileText },
  { to:'/stock/vouchers',     label:'Voucher History', icon:FileText },
];

const ORANGE = '#f7941d';
const BG     = '#111111';
const BORDER = 'rgba(255,255,255,0.08)';

function SectionLabel({ t }) {
  return (
    <p style={{ fontSize:'.65rem', fontWeight:800, color:'rgba(255,255,255,.28)', textTransform:'uppercase', letterSpacing:'.12em', padding:'0 10px', marginBottom:3 }}>{t}</p>
  );
}

function SLink({ to, label, icon:Icon, end, onNavigate }) {
  return (
    <NavLink to={to} end={end} style={{ textDecoration:'none', display:'block' }} onClick={() => onNavigate?.()}>
      {({ isActive }) => (
        <div style={{
          display:'flex', alignItems:'center', gap:10, padding:'9px 10px',
          borderRadius:11, transition:'all .13s', cursor:'pointer',
          background: isActive ? 'rgba(247,148,29,.15)' : 'transparent',
          border:`1px solid ${isActive ? 'rgba(247,148,29,.35)' : 'transparent'}`,
          color: isActive ? ORANGE : 'rgba(255,255,255,.5)',
          fontSize:'.85rem', fontWeight: isActive ? 700 : 500,
          marginBottom:2,
        }}>
          <Icon size={15} style={{ flexShrink:0, opacity: isActive ? 1 : .65 }} />
          <span style={{ flex:1 }}>{label}</span>
          {isActive && <ChevronRight size={11} style={{ opacity:.5 }} />}
        </div>
      )}
    </NavLink>
  );
}

function NavBtn({ onClick, label, icon:Icon }) {
  return (
    <button onClick={onClick} style={{
      display:'flex', alignItems:'center', gap:10, padding:'9px 10px', width:'100%',
      borderRadius:11, border:'1px solid transparent', background:'transparent',
      color:'rgba(255,255,255,.4)', fontSize:'.85rem', fontWeight:500, cursor:'pointer',
      transition:'all .13s', marginBottom:2,
    }}
      onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,.05)'; e.currentTarget.style.color='rgba(255,255,255,.8)'; }}
      onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='rgba(255,255,255,.4)'; }}
    >
      <Icon size={15} style={{ opacity:.6 }} /> {label}
    </button>
  );
}

export default function Sidebar({ module, onNavigate, onCloseMobile }) {
  const { user, logout, isAdmin, canViewTeam, canAccessStock, canAccessComplaints } = useAuth();
  const navigate = useNavigate();
  const links = (module === 'stock' ? STOCK_LINKS : CRM_LINKS).filter(
    (l) => l.to !== '/crm/complaints' || canAccessComplaints,
  );

  return (
    <aside style={{
      width:240, height:'100vh', display:'flex', flexDirection:'column',
      background:BG, flexShrink:0, borderRight:`1px solid ${BORDER}`, position:'relative',
      paddingTop:'env(safe-area-inset-top, 0px)',
    }}>

      {onCloseMobile && (
        <button
          type="button"
          aria-label="Close menu"
          className="lg:hidden absolute top-3 right-3 z-10 flex items-center justify-center p-2 rounded-xl bg-white/[0.08] text-white border border-white/[0.12]"
          onClick={onCloseMobile}
        >
          <X size={20} />
        </button>
      )}

      {/* ── Brand ── */}
      <div style={{ padding:'18px 14px 14px', borderBottom:`1px solid ${BORDER}`, paddingRight: onCloseMobile ? 52 : 14 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <img src={logo} alt="SolarJi" style={{
            width:40, height:40, borderRadius:10, objectFit:'cover',
            border:`2px solid ${ORANGE}`, boxShadow:`0 0 12px rgba(247,148,29,.35)`,
          }} />
          <div>
            <p style={{ fontWeight:900, fontSize:'1rem', color:'#fff', letterSpacing:'-.02em', lineHeight:1.1 }}>SolarJi</p>
            <p style={{ fontSize:'.68rem', color:ORANGE, fontWeight:700, textTransform:'capitalize' }}>{module} Portal</p>
          </div>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav style={{ flex:1, padding:'12px 8px', overflowY:'auto' }}>

        {/* divider */}
        <div style={{ height:4 }} />
        <SectionLabel t={module === 'stock' ? 'Inventory' : 'CRM'} />
        {links.map(l => <SLink key={l.to} {...l} onNavigate={onNavigate} />)}

        {canViewTeam && !isAdmin && module === 'crm' && (
          <>
            <div style={{ height:12 }} />
            <SectionLabel t="Team" />
            {CRM_TEAM.map(l => <SLink key={l.to} {...l} onNavigate={onNavigate} />)}
          </>
        )}

        {isAdmin && module === 'crm' && (
          <>
            <div style={{ height:12 }} />
            <SectionLabel t="Admin" />
            {CRM_ADMIN.map(l => <SLink key={l.to} {...l} onNavigate={onNavigate} />)}
            <SLink to="/admin" label="Admin Panel" icon={Settings} onNavigate={onNavigate} />
          </>
        )}

        <div style={{ height:12 }} />
        <SectionLabel t="Navigate" />
        <NavBtn onClick={() => { navigate('/'); onNavigate?.(); }}     label="Website" icon={Home}   />
        {module !== 'crm'   && <NavBtn onClick={() => { navigate('/crm'); onNavigate?.(); }}   label="CRM"   icon={Target} />}
        {module !== 'stock' && canAccessStock && <NavBtn onClick={() => { navigate('/stock'); onNavigate?.(); }} label="Stock" icon={Layers} />}
      </nav>

      {/* ── User ── */}
      <div style={{ padding:'10px 8px 12px', borderTop:`1px solid ${BORDER}` }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', marginBottom:4 }}>
          <div style={{
            width:34, height:34, borderRadius:10, background:ORANGE,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:'.9rem', fontWeight:900, color:'#fff', flexShrink:0,
            boxShadow:`0 4px 10px rgba(247,148,29,.4)`,
          }}>
            {user?.name?.charAt(0)?.toUpperCase()}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ fontWeight:700, fontSize:'.85rem', color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.name}</p>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <p style={{ fontSize:'.7rem', color:'rgba(255,255,255,.35)' }}>
                {roleLabel(user?.role)}
              </p>
              {typeof user?.points === 'number' && (
                <span style={{
                  fontSize:'.65rem', fontWeight:800, padding:'1px 6px', borderRadius:99,
                  background: user.points >= 0 ? 'rgba(16,185,129,.2)' : 'rgba(244,63,94,.2)',
                  color: user.points >= 0 ? '#6ee7b7' : '#fca5a5',
                }}>
                  {user.points >= 0 ? `★ ${user.points}` : `★ ${user.points}`} pts
                </span>
              )}
            </div>
          </div>
        </div>
        <button onClick={() => { logout(); onNavigate?.(); }} style={{
          display:'flex', alignItems:'center', gap:10, padding:'9px 10px', width:'100%',
          borderRadius:11, border:'1px solid transparent', background:'transparent',
          color:'rgba(255,255,255,.35)', fontSize:'.85rem', fontWeight:500, cursor:'pointer', transition:'all .13s',
        }}
          onMouseEnter={e => { e.currentTarget.style.background='rgba(244,63,94,.12)'; e.currentTarget.style.color='#f87171'; e.currentTarget.style.borderColor='rgba(244,63,94,.25)'; }}
          onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='rgba(255,255,255,.35)'; e.currentTarget.style.borderColor='transparent'; }}
        >
          <LogOut size={14} style={{ opacity:.7 }} /> Sign Out
        </button>
      </div>
    </aside>
  );
}
