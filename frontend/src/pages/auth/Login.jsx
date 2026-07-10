import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { showApiError } from '../../utils/apiError';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import logo from '../../assets/solarji logo.jpeg';

const ORANGE = '#f7941d';

export default function Login() {
  const [form, setForm] = useState({ email:'', password:'' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.name}!`);
      navigate(user.role === 'admin' ? '/admin' : user.role === 'stock_manager' ? '/stock' : '/crm');
    } catch (err) {
      showApiError(err, 'Login failed. Check your email and password.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight:'100dvh',
      display:'flex',
      fontFamily:"'Plus Jakarta Sans',sans-serif",
      paddingBottom:'env(safe-area-inset-bottom)',
    }}>

      {/* ── Left: White branding panel ── */}
      <div className="hidden lg:flex flex-col justify-between p-14"
        style={{ width:'48%', background:'#111111', position:'relative', overflow:'hidden' }}>

        {/* subtle orange glow */}
        <div className="anim-glow" style={{
          position:'absolute', top:'-20%', right:'-20%',
          width:500, height:500, borderRadius:'50%',
          background:'radial-gradient(circle, rgba(247,148,29,.18) 0%, transparent 65%)',
          pointerEvents:'none',
        }} />
        {/* dot texture */}
        <div style={{
          position:'absolute', inset:0, opacity:.04, pointerEvents:'none',
          backgroundImage:'radial-gradient(circle, #fff 1px, transparent 1px)',
          backgroundSize:'28px 28px',
        }} />

        {/* brand mark */}
        <div style={{ position:'relative', display:'flex', alignItems:'center', gap:12 }}>
          <img src={logo} alt="SolarJi" style={{
            width:44, height:44, borderRadius:12, objectFit:'cover',
            border:`2px solid ${ORANGE}`, boxShadow:`0 0 16px rgba(247,148,29,.45)`,
          }} />
          <div>
            <p style={{ fontWeight:900, fontSize:'1.15rem', color:'#fff', letterSpacing:'-.02em' }}>SolarJi</p>
            <p style={{ fontSize:'.72rem', color:ORANGE, fontWeight:700 }}>देश चलेगा सूरज से</p>
          </div>
        </div>

        {/* central copy */}
        <div style={{ position:'relative' }}>
          <div style={{
            display:'inline-block', padding:'6px 14px', borderRadius:99, marginBottom:'1.5rem',
            background:'rgba(247,148,29,.12)', border:'1px solid rgba(247,148,29,.25)', color:ORANGE,
            fontSize:'.75rem', fontWeight:700, letterSpacing:'.06em', textTransform:'uppercase',
          }}>Solar Energy CRM & ERP</div>

          <h1 style={{
            fontSize:'clamp(2rem,3.5vw,2.75rem)', fontWeight:900,
            color:'#fff', letterSpacing:'-.03em', lineHeight:1.1, marginBottom:'1.25rem',
          }}>
            Manage your solar<br />
            business smarter.
          </h1>
          <p style={{ color:'rgba(255,255,255,.45)', lineHeight:1.75, fontSize:'.95rem', maxWidth:380 }}>
            One platform for leads, inventory, quotations and your entire sales team.
            Built for Indian solar companies.
          </p>

          {/* feature pills */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:'2rem' }}>
            {['CRM & Leads','Stock Management','Quotation Generator','Team Management'].map(f => (
              <span key={f} style={{
                padding:'5px 12px', borderRadius:99, fontSize:'.76rem', fontWeight:600,
                background:'rgba(247,148,29,.1)', border:'1px solid rgba(247,148,29,.2)', color:ORANGE,
              }}>{f}</span>
            ))}
          </div>
        </div>

        <p style={{ position:'relative', fontSize:'.78rem', color:'rgba(255,255,255,.2)' }}>
          © {new Date().getFullYear()} SolarJi — Kanpur, Uttar Pradesh
        </p>
      </div>

      {/* ── Right: login form (white) ── */}
      <div style={{
        flex:1, display:'flex', alignItems:'center', justifyContent:'center',
        padding:'clamp(1rem, 5vw, 2rem)',
        paddingBottom:'max(2rem, env(safe-area-inset-bottom))',
        background:'#fff',
      }}>
        <div style={{ width:'100%', maxWidth:400 }}>

          {/* mobile logo */}
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:'2.5rem' }} className="lg:hidden">
            <img src={logo} alt="SolarJi" style={{ width:36, height:36, borderRadius:9, objectFit:'cover', border:`2px solid ${ORANGE}` }} />
            <span style={{ fontWeight:900, fontSize:'1.05rem', color:'#111' }}>SolarJi</span>
          </div>

          <h2 style={{ fontSize:'1.9rem', fontWeight:900, color:'#111111', letterSpacing:'-.03em', marginBottom:'.4rem' }}>
            Sign in
          </h2>
          <p style={{ color:'#9ca3af', fontSize:'.9rem', marginBottom:'2rem' }}>
            Access your SolarJi dashboard
          </p>

          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'1.15rem' }}>

            {/* email */}
            <div>
              <label style={{ display:'block', fontSize:'.72rem', fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:7 }}>
                Email or Username
              </label>
              <div style={{ position:'relative' }}>
                <Mail size={15} style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'#9ca3af' }} />
                <input
                  type="text" required autoComplete="username"
                  placeholder="Enter your email or username"
                  value={form.email}
                  onChange={e => setForm({ ...form, email:e.target.value })}
                  style={{
                    width:'100%', paddingLeft:40, paddingRight:14, paddingTop:12, paddingBottom:12,
                    border:'1.5px solid #e5e7eb', borderRadius:12, fontSize:'.9rem',
                    color:'#111', outline:'none', background:'#fff', transition:'border-color .15s, box-shadow .15s',
                  }}
                  onFocus={e => { e.target.style.borderColor=ORANGE; e.target.style.boxShadow=`0 0 0 3px rgba(247,148,29,.15)`; }}
                  onBlur={e =>  { e.target.style.borderColor='#e5e7eb'; e.target.style.boxShadow='none'; }}
                />
              </div>
            </div>

            {/* password */}
            <div>
              <label style={{ display:'block', fontSize:'.72rem', fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:7 }}>
                Password
              </label>
              <div style={{ position:'relative' }}>
                <Lock size={15} style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'#9ca3af' }} />
                <input
                  type={showPass ? 'text' : 'password'} required autoComplete="current-password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm({ ...form, password:e.target.value })}
                  style={{
                    width:'100%', paddingLeft:40, paddingRight:44, paddingTop:12, paddingBottom:12,
                    border:'1.5px solid #e5e7eb', borderRadius:12, fontSize:'.9rem',
                    color:'#111', outline:'none', background:'#fff', transition:'border-color .15s, box-shadow .15s',
                  }}
                  onFocus={e => { e.target.style.borderColor=ORANGE; e.target.style.boxShadow=`0 0 0 3px rgba(247,148,29,.15)`; }}
                  onBlur={e =>  { e.target.style.borderColor='#e5e7eb'; e.target.style.boxShadow='none'; }}
                />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{
                  position:'absolute', right:13, top:'50%', transform:'translateY(-50%)',
                  color:'#9ca3af', background:'none', border:'none', cursor:'pointer', padding:0, lineHeight:0,
                }}>
                  {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
            </div>

            {/* submit */}
            <button type="submit" disabled={loading} style={{
              width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              padding:14, borderRadius:12, border:'none', cursor: loading ? 'not-allowed':'pointer',
              background: loading ? 'rgba(247,148,29,.5)' : ORANGE,
              boxShadow: loading ? 'none' : '0 4px 16px rgba(247,148,29,.4)',
              fontSize:'.95rem', fontWeight:800, color:'#fff',
              transition:'all .15s', marginTop:4,
            }}
              onMouseEnter={e => { if(!loading) e.currentTarget.style.background='#e07800'; }}
              onMouseLeave={e => { e.currentTarget.style.background = loading ? 'rgba(247,148,29,.5)':ORANGE; }}
            >
              {loading ? (
                <><svg style={{ width:18,height:18 }} className="anim-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,.3)" strokeWidth="3"/>
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
                </svg> Signing in…</>
              ) : <>Sign In <ArrowRight size={16}/></>}
            </button>
          </form>

          {/* hint */}
          <div style={{
            marginTop:'1.75rem', padding:'1rem 1.25rem', borderRadius:12,
            background:'#fff8f0', border:`1px solid rgba(247,148,29,.25)`,
          }}>
          </div>
        </div>
      </div>
    </div>
  );
}
