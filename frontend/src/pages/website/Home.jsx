import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Zap, Shield, Award, Phone, Mail, MapPin,
         ArrowRight, BarChart3, Package, CheckCircle, Star, Layers, Menu, X } from 'lucide-react';
import logo from '../../assets/solarji logo.jpeg';

const ORANGE = '#f7941d';
const BLACK  = '#111111';
const WHITE  = '#ffffff';

/* ── Photo URLs (Unsplash CDN) ── */
const PHOTOS = {
  hero:         'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1920&q=85',
  rooftop:      'https://images.unsplash.com/photo-1611365892117-00ac5ef43c90?w=800&q=80',
  farm:         'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=800&q=80',
  engineer:     'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&q=80',
  panels:       'https://images.unsplash.com/photo-1548345680-f5475ea5df84?w=800&q=80',
  ground:       'https://images.unsplash.com/photo-1521618755572-156ae0cdd74d?w=800&q=80',
  installation: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=1200&q=80',
};

const SERVICES = [
  { icon:Sun,    title:'Residential Solar',  desc:'Complete rooftop solar for homes — cut your electricity bill by up to 90%.',    photo: PHOTOS.rooftop },
  { icon:Zap,    title:'Commercial Solar',   desc:'Large-scale solar for factories, malls, offices & industrial complexes.',        photo: PHOTOS.farm    },
  { icon:Shield, title:'AMC & Maintenance',  desc:'Annual maintenance contracts, panel cleaning, inverter servicing & audits.',     photo: PHOTOS.engineer},
  { icon:Award,  title:'Net Metering',       desc:'End-to-end Kesco documentation, meter installation & grid synchronisation.',    photo: PHOTOS.panels  },
];

const PRODUCTS = [
  { name:'Solar Panels',       brands:'Loom · Adani · Waaree',     desc:'Mono PERC & Bifacial 400–550W' },
  { name:'Inverters',          brands:'Solis · Delta · Growatt',    desc:'String & Hybrid 1kW–100kW'    },
  { name:'Batteries',          brands:'Luminous · Exide · Amaron',  desc:'Lead Acid & Li-ion 100–200Ah'  },
  { name:'Mounting Structure', brands:'GI & Aluminium alloy',       desc:'RCC, tin roof & ground mount'  },
  { name:'DC / AC Cable',      brands:'Finolex · Polycab',          desc:'4 / 6 / 10 mm² solar grade'   },
  { name:'ACDB / DCDB',        brands:'InstaEnergy · Custom',       desc:'Protection & distribution box' },
];

const STATS = [
  { value:'500+',  label:'Installations'      },
  { value:'2 MW+', label:'Capacity Installed' },
  { value:'1000+', label:'Happy Customers'    },
  { value:'5 Yrs', label:'Experience'         },
];

const GALLERY = [
  { photo: PHOTOS.rooftop,      label: 'Rooftop Installation' },
  { photo: PHOTOS.farm,         label: 'Solar Farm'           },
  { photo: PHOTOS.engineer,     label: 'Expert Engineers'     },
  { photo: PHOTOS.ground,       label: 'Ground Mount'         },
];

const WHY = [
  'Turnkey project delivery','Govt-certified engineers',
  'Tier-1 equipment only',  'Kesco net-metering support',
  '5-year workmanship warranty','Lifetime technical support',
];

export default function Home() {
  const navigate = useNavigate();
  const [mobileNav, setMobileNav] = useState(false);

  const scrollLock = () => setMobileNav(false);

  return (
    <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", color:BLACK, background:WHITE }}>

      {/* ══ NAVBAR ══ */}
      <header style={{ position:'sticky', top:0, zIndex:50, background:'rgba(255,255,255,.92)', backdropFilter:'blur(16px)', borderBottom:'1px solid rgba(0,0,0,.07)' }}>
        <nav style={{ maxWidth:1200, margin:'0 auto', padding:'0 clamp(0.75rem, 4vw, 1.5rem)' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, minHeight:64 }}>
            <a href="/" style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none', flexShrink:0 }} onClick={scrollLock}>
              <img src={logo} alt="SolarJi" style={{ width:36, height:36, borderRadius:10, objectFit:'cover', border:`2px solid ${ORANGE}` }}/>
              <span style={{ fontWeight:900, fontSize:'clamp(0.95rem, 4vw, 1.05rem)', color:BLACK, letterSpacing:'-.02em' }}>SolarJi</span>
            </a>

            {/* Desktop links */}
            <div className="hidden md:flex" style={{ alignItems:'center', gap:'2rem' }}>
              {['Services','Products','Gallery','Why Us','Contact'].map(l=>(
                <a key={l} href={`#${l.toLowerCase().replace(' ','-')}`}
                  style={{ fontSize:'.875rem', fontWeight:600, color:'#6b7280', textDecoration:'none', transition:'color .15s' }}
                  onMouseEnter={e=>e.target.style.color=ORANGE}
                  onMouseLeave={e=>e.target.style.color='#6b7280'}
                >{l}</a>
              ))}
              <button
                type="button"
                onClick={() => navigate('/complaint')}
                style={{ fontSize:'.875rem', fontWeight:600, color:'#6b7280', background:'none', border:'none', cursor:'pointer', padding:0, transition:'color .15s' }}
                onMouseEnter={e=>e.currentTarget.style.color=ORANGE}
                onMouseLeave={e=>e.currentTarget.style.color='#6b7280'}
              >Register Complaint</button>
            </div>

            {/* Desktop CTAs */}
            <div className="hidden md:flex" style={{ alignItems:'center', gap:8, flexShrink:0 }}>
              <button onClick={()=>navigate('/crm')} className="btn-secondary" style={{ fontSize:'.8rem', padding:'7px 14px', display:'flex', gap:6 }}><BarChart3 size={13}/> CRM</button>
              <button onClick={()=>navigate('/stock')} className="btn-secondary" style={{ fontSize:'.8rem', padding:'7px 14px', display:'flex', gap:6 }}><Package size={13}/> Stock</button>
              <button onClick={()=>navigate('/quotation')} className="btn-primary" style={{ padding:'9px 18px', fontSize:'.85rem' }}>
                Get Quote <ArrowRight size={14}/>
              </button>
            </div>

            <button
              type="button"
              className="md:hidden flex items-center justify-center p-2.5 rounded-xl border border-gray-200 bg-white text-gray-800 shadow-sm"
              aria-expanded={mobileNav}
              aria-label={mobileNav ? 'Close menu' : 'Open menu'}
              onClick={() => setMobileNav(v => !v)}
            >
              {mobileNav ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>

          {/* Mobile menu panel */}
          {mobileNav && (
            <div className="md:hidden border-t border-gray-100 py-4 flex flex-col gap-3 animate-[fadeUp_.2s_ease_both]">
              <div className="flex flex-col gap-1">
                {['Services','Products','Gallery','Why Us','Contact'].map(l=>(
                  <a
                    key={l}
                    href={`#${l.toLowerCase().replace(' ','-')}`}
                    className="py-2.5 px-2 rounded-xl font-semibold text-gray-700 active:bg-orange-50"
                    onClick={scrollLock}
                  >{l}</a>
                ))}
                <button
                  type="button"
                  className="py-2.5 px-2 rounded-xl font-semibold text-gray-700 active:bg-orange-50 text-left w-full"
                  onClick={() => { navigate('/complaint'); scrollLock(); }}
                >Register Complaint</button>
              </div>
              <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
                <button onClick={()=>{ navigate('/crm'); scrollLock(); }} className="btn-secondary justify-center w-full"><BarChart3 size={14}/> CRM</button>
                <button onClick={()=>{ navigate('/stock'); scrollLock(); }} className="btn-secondary justify-center w-full"><Package size={14}/> Stock</button>
                <button onClick={()=>{ navigate('/quotation'); scrollLock(); }} className="btn-primary justify-center w-full">Get Quote <ArrowRight size={14}/></button>
              </div>
            </div>
          )}
        </nav>
      </header>

      {/* ══ HERO — full photo background ══ */}
      <section style={{ position:'relative', minHeight:'clamp(78vh, 85vh, 95vh)', display:'flex', alignItems:'center', overflow:'hidden' }}>
        {/* background photo */}
        <img src={PHOTOS.hero} alt="Solar farm"
          style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', objectPosition:'center' }}
        />
        {/* dark + orange gradient overlay */}
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg, rgba(17,17,17,.88) 0%, rgba(17,17,17,.7) 50%, rgba(247,148,29,.25) 100%)' }}/>
        {/* orange glow top-right */}
        <div style={{ position:'absolute', top:'-5%', right:'-5%', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle, rgba(247,148,29,.22) 0%, transparent 65%)', pointerEvents:'none' }} className="anim-glow"/>

        <div style={{ maxWidth:1200, margin:'0 auto', padding:'clamp(3rem, 10vw, 6rem) clamp(1rem, 4vw, 1.5rem)', width:'100%', position:'relative' }}>
          <div className="anim-fade-up" style={{ maxWidth:680 }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'6px 16px', borderRadius:99, background:'rgba(247,148,29,.15)', border:'1px solid rgba(247,148,29,.35)', color:ORANGE, fontSize:'.78rem', fontWeight:700, marginBottom:'1.75rem' }}>
              <span style={{ width:7, height:7, borderRadius:'50%', background:ORANGE, display:'inline-block' }} className="anim-glow"/>
              Kanpur's #1 Solar Company — देश चलेगा सूरज से
            </div>
            <h1 style={{ fontSize:'clamp(2.8rem,6vw,5.25rem)', fontWeight:900, color:WHITE, letterSpacing:'-.04em', lineHeight:1.04, marginBottom:'1.5rem' }}>
              Power Your Future<br/>
              <span style={{ color:ORANGE }}>With Solar Energy</span>
            </h1>
            <p className="anim-fade-up-1" style={{ fontSize:'1.1rem', color:'rgba(255,255,255,.55)', lineHeight:1.8, maxWidth:520, marginBottom:'2.5rem' }}>
              End-to-end solar solutions — design, supply, installation, Kesco net metering
              &amp; lifetime support. One trusted partner, zero hassle.
            </p>
            <div className="anim-fade-up-2" style={{ display:'flex', flexWrap:'wrap', gap:12 }}>
              <button onClick={()=>navigate('/quotation')} style={{ display:'flex', alignItems:'center', gap:8, padding:'15px 30px', borderRadius:14, border:'none', background:ORANGE, color:WHITE, fontSize:'1rem', fontWeight:800, cursor:'pointer', boxShadow:'0 8px 28px rgba(247,148,29,.5)', transition:'all .15s' }}
                onMouseEnter={e=>{e.currentTarget.style.background='#e07800';e.currentTarget.style.transform='translateY(-2px)';}}
                onMouseLeave={e=>{e.currentTarget.style.background=ORANGE;e.currentTarget.style.transform='translateY(0)';}}
              >Get Free Quotation <ArrowRight size={18}/></button>
              <a href="#contact" style={{ display:'flex', alignItems:'center', gap:8, padding:'15px 30px', borderRadius:14, border:'1.5px solid rgba(255,255,255,.2)', background:'transparent', color:'rgba(255,255,255,.8)', fontSize:'1rem', fontWeight:700, cursor:'pointer', textDecoration:'none', transition:'all .15s' }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,.45)';e.currentTarget.style.color=WHITE;}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,.2)';e.currentTarget.style.color='rgba(255,255,255,.8)';}}
              ><Phone size={16}/> Call Us Now</a>
            </div>
            <div className="anim-fade-up-3" style={{ display:'flex', flexWrap:'wrap', gap:'1.5rem', marginTop:'3rem', paddingTop:'2rem', borderTop:'1px solid rgba(255,255,255,.1)' }}>
              {[{icon:Star,label:'5-Star Rated'},{icon:CheckCircle,label:'Govt Approved'},{icon:Shield,label:'Fully Insured'},{icon:Zap,label:'Tier-1 Products'}].map(({icon:Icon,label})=>(
                <div key={label} style={{ display:'flex', alignItems:'center', gap:7, fontSize:'.85rem', color:'rgba(255,255,255,.45)', fontWeight:500 }}>
                  <Icon size={15} style={{ color:ORANGE }}/> {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ STATS ══ */}
      <section style={{ background:ORANGE }}>
        <div style={{ maxWidth:1200, margin:'0 auto', padding:'3rem 1.5rem', display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:'1.5rem', textAlign:'center' }}>
          {STATS.map(({value,label})=>(
            <div key={label}>
              <p style={{ fontSize:'clamp(2rem,4vw,2.75rem)', fontWeight:900, color:WHITE, letterSpacing:'-.03em' }}>{value}</p>
              <p style={{ fontSize:'.875rem', color:'rgba(255,255,255,.8)', fontWeight:600, marginTop:4 }}>{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══ SERVICES — photo cards ══ */}
      <section id="services" style={{ background:'#f5f6f8', padding:'6rem 0' }}>
        <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 1.5rem' }}>
          <div style={{ textAlign:'center', marginBottom:'3.5rem' }}>
            <span style={{ display:'inline-block', padding:'5px 14px', borderRadius:99, background:'rgba(247,148,29,.1)', border:`1px solid rgba(247,148,29,.25)`, color:ORANGE, fontSize:'.72rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'.1em', marginBottom:'1rem' }}>What We Do</span>
            <h2 style={{ fontSize:'clamp(1.8rem,3.5vw,2.75rem)', fontWeight:900, color:BLACK, letterSpacing:'-.03em', marginBottom:'.75rem' }}>Our Services</h2>
            <p style={{ color:'#9ca3af', maxWidth:480, margin:'0 auto' }}>Complete solar solutions — from consultation to commissioning and lifetime support.</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:'1.5rem' }}>
            {SERVICES.map(({icon:Icon, title, desc, photo})=>(
              <div key={title} style={{ background:WHITE, borderRadius:20, overflow:'hidden', border:'1.5px solid #f0f0f0', transition:'all .25s', cursor:'default' }}
                onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-6px)';e.currentTarget.style.boxShadow=`0 20px 50px rgba(247,148,29,.15)`;e.currentTarget.style.borderColor=ORANGE;}}
                onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='none';e.currentTarget.style.borderColor='#f0f0f0';}}
              >
                {/* photo */}
                <div style={{ height:180, overflow:'hidden', position:'relative' }}>
                  <img src={photo} alt={title} style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform .4s' }}
                    onMouseEnter={e=>e.target.style.transform='scale(1.06)'}
                    onMouseLeave={e=>e.target.style.transform='scale(1)'}
                  />
                  <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,.5) 100%)' }}/>
                  <div style={{ position:'absolute', bottom:12, left:14, width:36, height:36, borderRadius:10, background:ORANGE, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Icon size={18} style={{ color:WHITE }}/>
                  </div>
                </div>
                {/* content */}
                <div style={{ padding:'1.25rem 1.5rem' }}>
                  <h3 style={{ fontWeight:800, fontSize:'1rem', color:BLACK, marginBottom:'.5rem' }}>{title}</h3>
                  <p style={{ fontSize:'.875rem', color:'#6b7280', lineHeight:1.65 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ PHOTO GALLERY STRIP ══ */}
      <section id="gallery" style={{ background:WHITE, padding:'5rem 0' }}>
        <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 1.5rem' }}>
          <div style={{ textAlign:'center', marginBottom:'3rem' }}>
            <span style={{ display:'inline-block', padding:'5px 14px', borderRadius:99, background:'rgba(247,148,29,.1)', border:`1px solid rgba(247,148,29,.25)`, color:ORANGE, fontSize:'.72rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'.1em', marginBottom:'1rem' }}>Our Work</span>
            <h2 style={{ fontSize:'clamp(1.8rem,3.5vw,2.75rem)', fontWeight:900, color:BLACK, letterSpacing:'-.03em', marginBottom:'.75rem' }}>Installations Gallery</h2>
            <p style={{ color:'#9ca3af' }}>Real solar projects delivered across Kanpur and Uttar Pradesh.</p>
          </div>
          {/* 2×2 grid top + wide bottom */}
          <div className="home-gallery-grid">
            {GALLERY.map(({photo,label},i)=>(
              <div key={i} style={{ position:'relative', overflow:'hidden', borderRadius:16, gridColumn: i===3?'3/5':undefined, gridRow: i===3?'1/3':undefined }}>
                <img src={photo} alt={label} style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform .5s' }}
                  onMouseEnter={e=>e.target.style.transform='scale(1.07)'}
                  onMouseLeave={e=>e.target.style.transform='scale(1)'}
                />
                <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,.65) 100%)' }}/>
                <div style={{ position:'absolute', bottom:14, left:16 }}>
                  <span style={{ display:'inline-block', padding:'4px 10px', borderRadius:99, background:'rgba(247,148,29,.9)', color:WHITE, fontSize:'.72rem', fontWeight:800 }}>{label}</span>
                </div>
              </div>
            ))}
            {/* wide bottom photo */}
            <div style={{ gridColumn:'1/3', gridRow:'2/3', position:'relative', overflow:'hidden', borderRadius:16 }}>
              <img src={PHOTOS.installation} alt="Installation" style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform .5s' }}
                onMouseEnter={e=>e.target.style.transform='scale(1.06)'}
                onMouseLeave={e=>e.target.style.transform='scale(1)'}
              />
              <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,.65) 100%)' }}/>
              <div style={{ position:'absolute', bottom:18, left:20 }}>
                <span style={{ display:'inline-block', padding:'4px 12px', borderRadius:99, background:'rgba(247,148,29,.9)', color:WHITE, fontSize:'.72rem', fontWeight:800 }}>Kanpur Installations</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ PRODUCTS ══ */}
      <section id="products" style={{ background:'#f5f6f8', padding:'6rem 0' }}>
        <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 1.5rem' }}>
          <div style={{ textAlign:'center', marginBottom:'3.5rem' }}>
            <span style={{ display:'inline-block', padding:'5px 14px', borderRadius:99, background:'rgba(247,148,29,.1)', border:`1px solid rgba(247,148,29,.25)`, color:ORANGE, fontSize:'.72rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'.1em', marginBottom:'1rem' }}>Equipment</span>
            <h2 style={{ fontSize:'clamp(1.8rem,3.5vw,2.75rem)', fontWeight:900, color:BLACK, letterSpacing:'-.03em', marginBottom:'.75rem' }}>Premium Products</h2>
            <p style={{ color:'#9ca3af' }}>Tier-1 solar equipment from globally trusted manufacturers.</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,240px),1fr))', gap:'1rem' }}>
            {PRODUCTS.map(({name,brands,desc})=>(
              <div key={name} style={{ display:'flex', gap:14, padding:'1.25rem 1.5rem', borderRadius:16, border:'1.5px solid #e5e7eb', background:WHITE, transition:'all .15s' }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=ORANGE;e.currentTarget.style.background='#fff8f0';}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='#e5e7eb';e.currentTarget.style.background=WHITE;}}
              >
                <div style={{ width:40, height:40, borderRadius:10, background:'rgba(247,148,29,.1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:2 }}>
                  <Layers size={17} style={{ color:ORANGE }}/>
                </div>
                <div>
                  <p style={{ fontWeight:800, color:BLACK, marginBottom:3 }}>{name}</p>
                  <p style={{ fontSize:'.75rem', color:ORANGE, fontWeight:700, marginBottom:4 }}>{brands}</p>
                  <p style={{ fontSize:'.825rem', color:'#9ca3af' }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ WHY US — photo + text ══ */}
      <section id="why-us" style={{ background:WHITE, padding:'6rem 0' }}>
        <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 clamp(1rem, 4vw, 1.5rem)', paddingBottom:'clamp(2rem, 8vw, 4rem)' }} className="home-why-grid">
          {/* Left: stacked photos */}
          <div style={{ position:'relative' }}>
            <img src={PHOTOS.farm} alt="Solar farm"
              style={{ width:'100%', height:380, objectFit:'cover', borderRadius:24, boxShadow:'0 24px 60px rgba(0,0,0,.15)' }}
            />
            {/* floating small photo */}
            <div className="home-float-photo" style={{ width:180, height:140, borderRadius:18, overflow:'hidden', border:`4px solid ${WHITE}`, boxShadow:'0 16px 40px rgba(0,0,0,.2)' }}>
              <img src={PHOTOS.engineer} alt="Engineer" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
            </div>
            {/* stat pill */}
            <div style={{ position:'absolute', top:24, left:24, padding:'10px 18px', borderRadius:14, background:ORANGE, boxShadow:'0 8px 24px rgba(247,148,29,.4)' }}>
              <p style={{ fontWeight:900, fontSize:'1.5rem', color:WHITE, letterSpacing:'-.03em', lineHeight:1 }}>500+</p>
              <p style={{ fontSize:'.72rem', color:'rgba(255,255,255,.8)', fontWeight:600, marginTop:2 }}>Projects Done</p>
            </div>
          </div>

          {/* Right: text */}
          <div style={{ paddingBottom:32 }}>
            <span style={{ display:'inline-block', padding:'5px 14px', borderRadius:99, background:'rgba(247,148,29,.1)', border:`1px solid rgba(247,148,29,.25)`, color:ORANGE, fontSize:'.72rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'.1em', marginBottom:'1.25rem' }}>Why SolarJi</span>
            <h2 style={{ fontSize:'clamp(1.8rem,3.5vw,2.75rem)', fontWeight:900, color:BLACK, letterSpacing:'-.03em', marginBottom:'1rem' }}>
              Kanpur's Most<br/>Trusted Solar Brand
            </h2>
            <p style={{ color:'#6b7280', lineHeight:1.75, marginBottom:'2rem', maxWidth:420 }}>
              5+ years, 500+ installations and 1000+ happy customers — we are the solar partner
              businesses and homes across UP trust most.
            </p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'2.5rem' }}>
              {WHY.map(item=>(
                <div key={item} style={{ display:'flex', alignItems:'center', gap:9 }}>
                  <div style={{ width:22, height:22, borderRadius:'50%', background:'rgba(247,148,29,.12)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <CheckCircle size={12} style={{ color:ORANGE }}/>
                  </div>
                  <span style={{ fontSize:'.85rem', color:'#374151', fontWeight:600 }}>{item}</span>
                </div>
              ))}
            </div>
            <button onClick={()=>navigate('/quotation')} style={{ display:'flex', alignItems:'center', gap:8, padding:'14px 28px', borderRadius:14, border:'none', background:ORANGE, color:WHITE, fontSize:'1rem', fontWeight:800, cursor:'pointer', boxShadow:'0 6px 20px rgba(247,148,29,.4)', transition:'all .15s' }}
              onMouseEnter={e=>{e.currentTarget.style.background='#e07800';e.currentTarget.style.transform='translateY(-2px)';}}
              onMouseLeave={e=>{e.currentTarget.style.background=ORANGE;e.currentTarget.style.transform='translateY(0)';}}
            >Get Free Estimate <ArrowRight size={18}/></button>
          </div>
        </div>
      </section>

      {/* ══ CTA ══ */}
      <section style={{ position:'relative', overflow:'hidden', padding:'0' }}>
        <img src={PHOTOS.panels} alt="Solar panels"
          style={{ width:'100%', height:400, objectFit:'cover', display:'block' }}
        />
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg, rgba(17,17,17,.82) 0%, rgba(247,148,29,.5) 100%)' }}/>
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', textAlign:'center', padding:'2rem' }}>
          <Zap size={42} style={{ color:WHITE, opacity:.85, marginBottom:'1.25rem' }}/>
          <h2 style={{ fontSize:'clamp(1.8rem,3.5vw,2.75rem)', fontWeight:900, color:WHITE, letterSpacing:'-.03em', marginBottom:'1rem' }}>
            Get Your Free Solar Estimate
          </h2>
          <p style={{ color:'rgba(255,255,255,.75)', fontSize:'1.05rem', lineHeight:1.75, marginBottom:'2rem', maxWidth:500 }}>
            Enter your electricity bill and instantly see your solar system size, cost, savings &amp; payback period.
          </p>
          <button onClick={()=>navigate('/quotation')} style={{ display:'inline-flex', alignItems:'center', gap:10, padding:'15px 36px', borderRadius:14, border:'none', background:ORANGE, color:WHITE, fontSize:'1rem', fontWeight:800, cursor:'pointer', boxShadow:'0 8px 28px rgba(247,148,29,.55)', transition:'all .15s' }}
            onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.background='#e07800';}}
            onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.background=ORANGE;}}
          >Generate Quotation Now <ArrowRight size={20}/></button>
        </div>
      </section>

      {/* ══ CONTACT ══ */}
      <section id="contact" style={{ background:BLACK, padding:'6rem 0' }}>
        <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 1.5rem' }}>
          <div style={{ textAlign:'center', marginBottom:'3.5rem' }}>
            <span style={{ display:'inline-block', padding:'5px 14px', borderRadius:99, background:'rgba(247,148,29,.1)', border:`1px solid rgba(247,148,29,.3)`, color:ORANGE, fontSize:'.72rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'.1em', marginBottom:'1rem' }}>Get In Touch</span>
            <h2 style={{ fontSize:'clamp(1.8rem,3.5vw,2.75rem)', fontWeight:900, color:WHITE, letterSpacing:'-.03em' }}>Contact Us</h2>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:'1.25rem' }}>
            {[
              { icon:Phone,  title:'Call Us',  lines:['+91 98765 43210','+91 87654 32109'] },
              { icon:Mail,   title:'Email Us', lines:['info@solarji.com','sales@solarji.com'] },
              { icon:MapPin, title:'Visit Us', lines:['Shop No. 5, Solar Market','Kanpur, Uttar Pradesh'] },
            ].map(({icon:Icon,title,lines})=>(
              <div key={title} style={{ textAlign:'center', padding:'2.25rem 1.75rem', borderRadius:20, border:'1px solid rgba(255,255,255,.07)', background:'rgba(255,255,255,.03)', transition:'all .2s' }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(247,148,29,.35)';e.currentTarget.style.background='rgba(247,148,29,.05)';e.currentTarget.style.transform='translateY(-4px)';}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,.07)';e.currentTarget.style.background='rgba(255,255,255,.03)';e.currentTarget.style.transform='translateY(0)';}}
              >
                <div style={{ width:54, height:54, borderRadius:14, background:'rgba(247,148,29,.12)', border:`1px solid rgba(247,148,29,.25)`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1.25rem' }}>
                  <Icon size={22} style={{ color:ORANGE }}/>
                </div>
                <h3 style={{ fontWeight:800, color:WHITE, marginBottom:'.75rem' }}>{title}</h3>
                {lines.map(l=><p key={l} style={{ color:'rgba(255,255,255,.4)', fontSize:'.875rem', lineHeight:1.8 }}>{l}</p>)}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer style={{ background:'#0a0a0a', borderTop:'1px solid rgba(255,255,255,.06)', padding:'1.75rem 0' }}>
        <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 1.5rem', display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between', gap:'1rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <img src={logo} alt="SolarJi" style={{ width:30, height:30, borderRadius:8, objectFit:'cover', border:`1.5px solid ${ORANGE}` }}/>
            <span style={{ fontWeight:900, color:'rgba(255,255,255,.4)', fontSize:'.875rem' }}>SolarJi</span>
          </div>
          <p style={{ fontSize:'.78rem', color:'rgba(255,255,255,.2)' }}>
            © {new Date().getFullYear()} SolarJi — Powered by Green Energy ☀️
          </p>
          <div style={{ display:'flex', gap:'1.5rem' }}>
            {['Services','Products','Gallery','Contact'].map(l=>(
              <a key={l} href={`#${l.toLowerCase()}`} style={{ fontSize:'.78rem', color:'rgba(255,255,255,.25)', textDecoration:'none', transition:'color .15s' }}
                onMouseEnter={e=>e.target.style.color='rgba(255,255,255,.6)'}
                onMouseLeave={e=>e.target.style.color='rgba(255,255,255,.25)'}
              >{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
