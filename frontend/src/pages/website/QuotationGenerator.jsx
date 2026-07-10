import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Printer, Building2, Zap,
  Battery, Sun, RotateCcw, Home as HomeIcon,
} from 'lucide-react';
import logo from '../../assets/solarji logo.jpeg';

/* ── Constants ─────────────────────────────────────────── */
const ORANGE   = '#f7941d';
const BLACK    = '#111111';
const WHITE    = '#ffffff';
const RATE     = { residential: 60000, commercial: 40000 };  // per kW, GST incl.
const BAT_COST = 50000;                                       // per battery, GST incl.

/* ── Subsidy calculation (residential on-grid only) ──────
   Central (PM Surya Ghar): 30K/1st kW, 30K/2nd kW, 18K/3rd kW, max 78K
   State (UP):              15K/kW, capped at 30K
──────────────────────────────────────────────────────── */
function getCentralSubsidy(kw) {
  if (kw <= 1) return kw * 30000;
  if (kw <= 2) return 30000 + (kw - 1) * 30000;
  if (kw <= 3) return 60000 + (kw - 2) * 18000;
  return 78000;
}
function getStateSubsidy(kw) {
  return Math.min(kw * 15000, 30000);
}
function getSubsidy(kw, type, sysType) {
  if (type !== 'residential') return 0;
  if (sysType === 'offGrid') return 0;   // on-grid & hybrid both eligible
  return getCentralSubsidy(kw) + getStateSubsidy(kw);
}

/* ── Formatters ──────────────────────────────────────────*/
function fmt(n) {
  return '₹\u00a0' + Math.round(n).toLocaleString('en-IN');
}

function numWords(num) {
  const a = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
             'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen',
             'Seventeen','Eighteen','Nineteen'];
  const b = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  function c(n) {
    if (!n) return '';
    if (n < 20)   return a[n];
    if (n < 100)  return b[Math.floor(n/10)] + (n%10 ? ' '+a[n%10] : '');
    if (n < 1e3)  return a[Math.floor(n/100)]+' Hundred'+(n%100?' '+c(n%100):'');
    if (n < 1e5)  return c(Math.floor(n/1e3))+' Thousand'+(n%1e3?' '+c(n%1e3):'');
    if (n < 1e7)  return c(Math.floor(n/1e5))+' Lakh'+(n%1e5?' '+c(n%1e5):'');
    return c(Math.floor(n/1e7))+' Crore'+(n%1e7?' '+c(n%1e7):'');
  }
  return c(Math.round(num)) + ' Rupees Only';
}

/* ── Bill of Material generator ──────────────────────── */
function getBOM(kw, type, sysType, batteries) {
  const wp       = type === 'commercial' ? 600 : 550;
  const cnt      = Math.ceil((kw * 1000) / wp);
  const panBrand = type === 'commercial' ? 'Adani / Waaree N-Type TopCon' : 'Loom / Adani Mono PERC';
  const invBrand = sysType === 'onGrid'  ? 'Solis / Delta / Growatt'      : 'Luminous / Microtek';
  const invType  = sysType === 'onGrid'  ? 'On-Grid String Inverter'       : 'Hybrid Inverter';

  const rows = [
    [`${panBrand} Solar Module (Non-DCR)`,             `${wp} Wp`,                 `${cnt} Nos`      ],
    [`${invBrand} ${invType}`,                          `${kw} kW`,                 '1 No'            ],
    ['Apollo GI / Aluminium Mounting Structure (C-Channel)', '140×50 mm',           'As per Need'     ],
    ['Apollo Base Plate',                               '140×140 mm',               'As per Need'     ],
    ['WAACAB / Polycab DC Solar Cable',                 '4 mm²',                    'As per Need'     ],
    ['Havells / Polycab AC Cable',                      '6 mm²',                    'As per Need'     ],
    ['Havells DCDB Protection Box',                     `${Math.ceil(cnt/10)} String`, '1 No'         ],
    ['Havells ACDB Protection Box (1-Phase)',            '1 In 1 Out',               '1 No'            ],
    ['GI Earthing with Copper Bonded Earth Rod',        '2 Mtr',                    '2 Sets'          ],
    ['Lightning Arrestor (LA-CB-Heavy) with GI Pole',  'Heavy Duty',               '1 No'            ],
    ['MC4 Connectors',                                  'Pair',                     'As per Need'     ],
    ['SS Z-Clamp, Mid-Clamp, Nut-Bolts & Fasteners',   '—',                        'As per Need'     ],
    ['PVC Conduit Pipe & Saddle',                       '25 mm',                    'As per Need'     ],
    ['UV Cable Tie',                                    '300 mm',                   'As per Need'     ],
    ['Flexible Rigid Armoured Pipe',                    '17 mm',                    'As per Need'     ],
    ['AKG / CAP PVC Pipe',                              '25 mm',                    'As per Need'     ],
    ['Copper Pin Type & Ring Type Lugs',                '—',                        'As per Need'     ],
    ['SS Washer, SS Nut-Bolt (Small & Large)',          '—',                        'As per Need'     ],
    ['Havells Lifeline / Polycab Green Wire',           '4 sq mm',                  'As per Need'     ],
    ['PVC Saddle & Cable Markers',                      '—',                        'As per Need'     ],
  ];

  if (sysType !== 'onGrid' && batteries > 0)
    rows.push(['Maxvolt Lithium Battery', '100 Ah / 48V', `${batteries} Nos`]);

  return rows.map(([desc, rating, qty], i) => ({ sno: i + 1, desc, rating, qty }));
}

/* ── Capacity dropdown options (multiples of 500 W) ─── */
function caps(type) {
  const maxKw = type === 'commercial' ? 100 : 10;
  return Array.from({ length: maxKw * 2 }, (_, i) => (i + 1) * 0.5);
}

const SYS_LABEL = { onGrid: 'On-Grid', hybrid: 'Hybrid', offGrid: 'Off-Grid' };

/* ── Small shared atoms ───────────────────────────────── */
const Lbl = ({ children }) => (
  <p style={{ fontSize:'.78rem', fontWeight:700, color:'#374151', textTransform:'uppercase',
              letterSpacing:'.06em', marginBottom:7 }}>{children}</p>
);

/* ── Main Component ───────────────────────────────────── */
export default function QuotationGenerator() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  /* customer */
  const [cName,  setCName]  = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cAddr,  setCAddr]  = useState('');
  const [cCity,  setCCity]  = useState('Kanpur');

  /* system */
  const [cType, setCType] = useState('');       // residential | commercial
  const [sType, setSType] = useState('onGrid'); // onGrid | hybrid | offGrid
  const [kw,    setKw]    = useState(2);
  const [bats,  setBats]  = useState(1);

  /* stable per-session refs */
  const [qNo]   = useState(() => `SJ-${new Date().getFullYear()}-${String(Math.floor(Math.random()*900)+100)}`);
  const [qDate] = useState(() => new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' }));

  /* derived */
  const rate    = RATE[cType] || 60000;
  const total   = kw * rate + (sType !== 'onGrid' ? bats * BAT_COST : 0);
  const subsidy = getSubsidy(kw, cType, sType);
  const net     = total - subsidy;
  const sLabel    = SYS_LABEL[sType];
  const tLabel    = cType === 'commercial' ? 'COMMERCIAL' : 'RESIDENTIAL';
  const dailyGen  = kw * 5;                   // 5 units / kW / day
  const annGen    = Math.round(dailyGen * 365);
  const annSave   = annGen * 8;               // ₹8 per unit avg
  const subEligible = cType === 'residential' && sType !== 'offGrid';
  const centralSub  = subEligible ? getCentralSubsidy(kw) : 0;
  const stateSub    = subEligible ? getStateSubsidy(kw)   : 0;
  const bom       = cType ? getBOM(kw, cType, sType, bats) : [];

  const ok1 = cName.trim() && cPhone.trim();
  const ok2 = cType && sType && kw > 0;

  /* ── Shared table header / cell atoms ── */
  const TH = ({ children, right }) => (
    <th style={{ padding:'10px 12px', textAlign: right ? 'right' : 'left',
                 fontSize:'.72rem', fontWeight:700, letterSpacing:'.07em',
                 color:WHITE, whiteSpace:'nowrap' }}>{children}</th>
  );
  const TD = ({ children, right, bold, orange, small }) => (
    <td style={{ padding:'9px 12px', textAlign: right ? 'right' : 'left',
                 fontWeight: bold ? 800 : 400, color: orange ? ORANGE : BLACK,
                 fontSize: small ? '.78rem' : '.85rem' }}>{children}</td>
  );

  /* ══════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════ */
  return (
    <div style={{ minHeight:'100vh', background:'#f5f6f8', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
      <style>{`
        @page { size: A4; margin: 12mm 14mm; }
        @media print {
          .no-print  { display: none !important; }
          body       { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          #qdoc      { max-width: 100% !important; padding: 0 !important; margin: 0 !important; }
          .qs        { border-radius: 6pt !important; margin-bottom: 5pt !important; padding: 9pt 11pt !important; }
          .qs-cover  { border-radius: 6pt !important; padding: 14pt !important; }
          .pb        { page-break-before: always !important; }
          .tc-list   { columns: 2; column-gap: 1.5em; }
          .tc-list li { break-inside: avoid; font-size: 7.5pt !important; line-height: 1.5 !important; }
        }
      `}</style>

      {/* ══ STICKY HEADER ══════════════════════════════════ */}
      <div className="no-print"
        style={{ position:'sticky', top:0, zIndex:50, background:'rgba(255,255,255,.94)',
                 backdropFilter:'blur(16px)', borderBottom:'1px solid rgba(0,0,0,.07)' }}>
        <div style={{ maxWidth:1000, margin:'0 auto', padding:'0 1.5rem', height:64,
                      display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          {/* logo */}
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <button onClick={()=>navigate('/')}
              style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 12px', borderRadius:9,
                       border:'1.5px solid #e5e7eb', background:WHITE, color:'#6b7280',
                       fontSize:'.78rem', fontWeight:600, cursor:'pointer' }}>
              <ArrowLeft size={13}/> Home
            </button>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <img src={logo} alt="" style={{ width:30, height:30, borderRadius:8,
                                              objectFit:'cover', border:`1.5px solid ${ORANGE}` }}/>
              <span style={{ fontWeight:900, color:BLACK, fontSize:'.9rem' }}>Quotation Generator</span>
            </div>
          </div>

          {/* step pills */}
          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
            {['Customer','System','Preview'].map((lbl, i) => {
              const s = i + 1;
              const active = step === s, done = step > s;
              return (
                <div key={s} style={{ display:'flex', alignItems:'center', gap:4 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 11px',
                                borderRadius:99, transition:'all .2s',
                                background: active ? ORANGE : done ? 'rgba(247,148,29,.12)' : '#f0f0f0' }}>
                    <span style={{ fontSize:'.68rem', fontWeight:900,
                                   color: active ? WHITE : done ? ORANGE : '#bbb' }}>{s}</span>
                    <span style={{ fontSize:'.72rem', fontWeight:700,
                                   color: active ? WHITE : done ? ORANGE : '#bbb' }}>{lbl}</span>
                  </div>
                  {i < 2 && <div style={{ width:20, height:1.5, background: step > s ? ORANGE : '#e5e7eb' }}/>}
                </div>
              );
            })}
          </div>

          {/* actions (step 3 only) */}
          <div style={{ display:'flex', gap:8 }}>
            {step === 3 && <>
              <button onClick={() => { setStep(1); setCType(''); setSType('onGrid'); setKw(2); setBats(1); }}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 12px', borderRadius:9,
                         border:'1.5px solid #e5e7eb', background:WHITE, color:'#6b7280',
                         fontSize:'.78rem', fontWeight:600, cursor:'pointer' }}>
                <RotateCcw size={13}/> New
              </button>
              <button onClick={() => window.print()}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10,
                         border:'none', background:ORANGE, color:WHITE, fontWeight:700, fontSize:'.82rem',
                         cursor:'pointer', boxShadow:'0 4px 14px rgba(247,148,29,.35)' }}>
                <Printer size={14}/> Print / PDF
              </button>
            </>}
          </div>
        </div>
      </div>

      {/* ══ CONTENT ════════════════════════════════════════ */}
      <div style={{ padding:'2.5rem 1.5rem' }}>

        {/* ── STEP 1: Customer Info ──────────────────────── */}
        {step === 1 && (
          <div className="no-print"
            style={{ maxWidth:520, margin:'0 auto', background:WHITE, borderRadius:24,
                     padding:'2.5rem', boxShadow:'0 4px 32px rgba(0,0,0,.06)', border:'1px solid #f0f0f0' }}>
            <div style={{ textAlign:'center', marginBottom:'2rem' }}>
              <div style={{ width:52, height:52, borderRadius:14, background:'rgba(247,148,29,.1)',
                            border:'1.5px solid rgba(247,148,29,.2)', display:'flex',
                            alignItems:'center', justifyContent:'center', margin:'0 auto 1rem' }}>
                <Sun size={22} style={{ color:ORANGE }}/>
              </div>
              <h2 style={{ fontSize:'1.35rem', fontWeight:900, color:BLACK }}>Customer Details</h2>
              <p style={{ color:'#9ca3af', fontSize:'.82rem', marginTop:5 }}>Start with your customer's basic information</p>
            </div>

            <div style={{ display:'grid', gap:'1rem' }}>
              <div>
                <Lbl>Customer Name *</Lbl>
                <input className="input" value={cName} onChange={e => setCName(e.target.value)}
                  placeholder="Mr. / Ms. Full Name"/>
              </div>
              <div>
                <Lbl>Phone Number *</Lbl>
                <input className="input" type="tel" value={cPhone} onChange={e => setCPhone(e.target.value)}
                  placeholder="+91 XXXXX XXXXX"/>
              </div>
              <div>
                <Lbl>Installation Address</Lbl>
                <textarea className="input" rows={2} value={cAddr} onChange={e => setCAddr(e.target.value)}
                  placeholder="Plot / House No., Street, Area..." style={{ resize:'none' }}/>
              </div>
              <div>
                <Lbl>City</Lbl>
                <input className="input" value={cCity} onChange={e => setCCity(e.target.value)}/>
              </div>
            </div>

            <button disabled={!ok1} onClick={() => setStep(2)}
              style={{ marginTop:'1.75rem', width:'100%', display:'flex', alignItems:'center',
                       justifyContent:'center', gap:8, padding:'13px', borderRadius:13, border:'none',
                       background: ok1 ? ORANGE : '#e5e7eb', color: ok1 ? WHITE : '#9ca3af',
                       fontWeight:800, fontSize:'.95rem', cursor: ok1 ? 'pointer' : 'not-allowed',
                       boxShadow: ok1 ? '0 4px 16px rgba(247,148,29,.3)' : 'none', transition:'all .2s' }}>
              Next: System Selection <ArrowRight size={17}/>
            </button>
          </div>
        )}

        {/* ── STEP 2: System Config ──────────────────────── */}
        {step === 2 && (
          <div className="no-print"
            style={{ maxWidth:680, margin:'0 auto', background:WHITE, borderRadius:24,
                     padding:'2.5rem', boxShadow:'0 4px 32px rgba(0,0,0,.06)', border:'1px solid #f0f0f0' }}>
            <div style={{ textAlign:'center', marginBottom:'2rem' }}>
              <h2 style={{ fontSize:'1.35rem', fontWeight:900, color:BLACK }}>System Configuration</h2>
              <p style={{ color:'#9ca3af', fontSize:'.82rem', marginTop:5 }}>
                Choose customer type, system type, capacity and batteries
              </p>
            </div>

            {/* Customer Type */}
            <div style={{ marginBottom:'1.75rem' }}>
              <Lbl>Customer Type *</Lbl>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                {[
                  { id:'residential', Icon:HomeIcon,  label:'Residential', sub:'Home / Housing Society',          note:`₹60,000 / kW (On-Grid)` },
                  { id:'commercial',  Icon:Building2, label:'Commercial',  sub:'Factory / Office / Mall / School', note:`₹40,000 / kW (On-Grid)` },
                ].map(({ id, Icon, label, sub, note }) => (
                  <button key={id}
                    onClick={() => { setCType(id); setKw(id === 'commercial' ? 5 : 2); }}
                    style={{ padding:'1.25rem', borderRadius:14, cursor:'pointer', textAlign:'left',
                             transition:'all .15s', border:`2px solid ${cType === id ? ORANGE : '#e5e7eb'}`,
                             background: cType === id ? '#fff8f0' : WHITE }}>
                    <Icon size={18} style={{ color: cType === id ? ORANGE : '#bbb', marginBottom:10 }}/>
                    <p style={{ fontWeight:800, color:BLACK, marginBottom:3, fontSize:'.9rem' }}>{label}</p>
                    <p style={{ fontSize:'.75rem', color:'#9ca3af', marginBottom:5 }}>{sub}</p>
                    <p style={{ fontSize:'.78rem', fontWeight:700, color:ORANGE }}>{note}</p>
                    {id === 'residential' && (
                      <p style={{ fontSize:'.72rem', color:'#16a34a', marginTop:3, fontWeight:600 }}>
                        + PM Surya Ghar Subsidy eligible
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* System Type */}
            <div style={{ marginBottom:'1.75rem' }}>
              <Lbl>System Type *</Lbl>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'.75rem' }}>
                {[
                  { id:'onGrid',  Icon:Zap,     label:'On-Grid',  sub:'Grid-tied. Kesco net metering. No battery.' },
                  { id:'hybrid',  Icon:Battery, label:'Hybrid',   sub:'Grid + Battery. +₹50K per battery. Subsidy eligible (residential).' },
                  { id:'offGrid', Icon:Sun,     label:'Off-Grid', sub:'Fully off-grid. Battery powered. +₹50K per battery. No subsidy.' },
                ].map(({ id, Icon, label, sub }) => (
                  <button key={id} onClick={() => setSType(id)}
                    style={{ padding:'1rem', borderRadius:13, cursor:'pointer', textAlign:'left',
                             transition:'all .15s', border:`2px solid ${sType === id ? ORANGE : '#e5e7eb'}`,
                             background: sType === id ? '#fff8f0' : WHITE }}>
                    <Icon size={16} style={{ color: sType === id ? ORANGE : '#bbb', marginBottom:7 }}/>
                    <p style={{ fontWeight:800, color:BLACK, fontSize:'.85rem', marginBottom:4 }}>{label}</p>
                    <p style={{ fontSize:'.72rem', color:'#9ca3af', lineHeight:1.5 }}>{sub}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Capacity */}
            <div style={{ marginBottom:'1.75rem' }}>
              <Lbl>
                System Capacity *{' '}
                <span style={{ color:ORANGE, fontWeight:600, textTransform:'none', fontSize:'.72rem' }}>
                  (multiples of 500 W)
                </span>
              </Lbl>
              <select className="input" value={kw}
                onChange={e => setKw(parseFloat(e.target.value))}
                style={{ fontWeight:700, fontSize:'1rem' }}>
                {caps(cType || 'residential').map(v => (
                  <option key={v} value={v}>{v} kW ({(v * 1000)} Watts)</option>
                ))}
              </select>
            </div>

            {/* Batteries */}
            {sType !== 'onGrid' && (
              <div style={{ marginBottom:'1.75rem', padding:'1.25rem', borderRadius:13,
                            background:'rgba(247,148,29,.05)', border:'1.5px solid rgba(247,148,29,.2)' }}>
                <Lbl>
                  Number of Batteries{' '}
                  <span style={{ color:'#9ca3af', fontWeight:400, textTransform:'none', fontSize:'.72rem' }}>
                    (₹50,000 per battery, GST inclusive)
                  </span>
                </Lbl>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <button onClick={() => setBats(Math.max(1, bats - 1))}
                    style={{ width:36, height:36, borderRadius:9, border:`1.5px solid ${ORANGE}`,
                             background:WHITE, color:ORANGE, fontWeight:900, fontSize:'1.2rem', cursor:'pointer' }}>
                    −
                  </button>
                  <span style={{ fontSize:'1.5rem', fontWeight:900, color:BLACK, minWidth:36, textAlign:'center' }}>
                    {bats}
                  </span>
                  <button onClick={() => setBats(bats + 1)}
                    style={{ width:36, height:36, borderRadius:9, border:'none', background:ORANGE,
                             color:WHITE, fontWeight:900, fontSize:'1.2rem', cursor:'pointer' }}>
                    +
                  </button>
                  <span style={{ fontSize:'.85rem', color:'#6b7280' }}>= {fmt(bats * BAT_COST)}</span>
                </div>
              </div>
            )}

            {/* Live Price Preview */}
            {cType && (
              <div style={{ padding:'1.5rem', borderRadius:16, background:BLACK, marginBottom:'1.75rem' }}>
                <p style={{ fontSize:'.7rem', fontWeight:700, color:'rgba(255,255,255,.35)',
                            textTransform:'uppercase', letterSpacing:'.12em', marginBottom:'1rem' }}>
                  Estimated Cost Preview
                </p>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem',
                              marginBottom: subsidy > 0 ? '1rem' : 0 }}>
                  <div>
                    <p style={{ fontSize:'.72rem', color:'rgba(255,255,255,.35)', marginBottom:3 }}>
                      System ({kw}kW × ₹{(rate / 1000).toFixed(0)}K/kW)
                    </p>
                    <p style={{ fontSize:'1.2rem', fontWeight:900, color:WHITE }}>{fmt(kw * rate)}</p>
                  </div>
                  {sType !== 'onGrid' && (
                    <div>
                      <p style={{ fontSize:'.72rem', color:'rgba(255,255,255,.35)', marginBottom:3 }}>
                        Batteries ({bats} × ₹50K)
                      </p>
                      <p style={{ fontSize:'1.2rem', fontWeight:900, color:WHITE }}>{fmt(bats * BAT_COST)}</p>
                    </div>
                  )}
                  <div>
                    <p style={{ fontSize:'.72rem', color:'rgba(255,255,255,.35)', marginBottom:3 }}>
                      Total (GST Incl.)
                    </p>
                    <p style={{ fontSize:'1.4rem', fontWeight:900, color:ORANGE }}>{fmt(total)}</p>
                  </div>
                  {subsidy > 0 && (
                    <div>
                      <p style={{ fontSize:'.72rem', color:'rgba(255,255,255,.35)', marginBottom:3 }}>
                        PM Surya Ghar Subsidy
                      </p>
                      <p style={{ fontSize:'1.2rem', fontWeight:900, color:'#4ade80' }}>− {fmt(subsidy)}</p>
                    </div>
                  )}
                </div>
                {subsidy > 0 && (
                  <div style={{ borderTop:'1px solid rgba(255,255,255,.08)', paddingTop:'.75rem' }}>
                    <p style={{ fontSize:'.72rem', color:'rgba(255,255,255,.35)', marginBottom:3 }}>
                      Net Cost After Subsidy
                    </p>
                    <p style={{ fontSize:'1.6rem', fontWeight:900, color:'#4ade80' }}>{fmt(net)}</p>
                  </div>
                )}
              </div>
            )}

            {/* nav */}
            <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:'1rem' }}>
              <button onClick={() => setStep(1)}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'12px 18px', borderRadius:12,
                         border:'1.5px solid #e5e7eb', background:WHITE, color:'#6b7280',
                         fontWeight:700, cursor:'pointer' }}>
                <ArrowLeft size={15}/> Back
              </button>
              <button disabled={!ok2} onClick={() => setStep(3)}
                style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:7,
                         padding:'12px', borderRadius:12, border:'none',
                         background: ok2 ? ORANGE : '#e5e7eb', color: ok2 ? WHITE : '#9ca3af',
                         fontWeight:800, fontSize:'.95rem', cursor: ok2 ? 'pointer' : 'not-allowed',
                         boxShadow: ok2 ? '0 4px 16px rgba(247,148,29,.3)' : 'none', transition:'all .2s' }}>
                Generate Quotation <ArrowRight size={17}/>
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: QUOTATION DOCUMENT ─────────────────── */}
        {step === 3 && (
          <div id="qdoc" style={{ maxWidth:900, margin:'0 auto' }}>

            {/* action bar (no-print) */}
            <div className="no-print"
              style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                       background:WHITE, borderRadius:16, padding:'1rem 1.5rem', marginBottom:'1.5rem',
                       border:'1px solid #f0f0f0', boxShadow:'0 2px 12px rgba(0,0,0,.04)' }}>
              <div>
                <p style={{ fontWeight:800, color:BLACK, fontSize:'.95rem' }}>
                  Quotation Ready — {qNo}
                </p>
                <p style={{ fontSize:'.78rem', color:'#9ca3af', marginTop:2 }}>
                  {kw} kWp {sLabel} · {cType === 'residential' ? 'Residential' : 'Commercial'} · {cName}
                </p>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => setStep(2)}
                  style={{ display:'flex', alignItems:'center', gap:5, padding:'8px 14px', borderRadius:10,
                           border:'1.5px solid #e5e7eb', background:WHITE, color:'#6b7280',
                           fontSize:'.8rem', fontWeight:600, cursor:'pointer' }}>
                  <ArrowLeft size={13}/> Edit
                </button>
                <button onClick={() => window.print()}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 18px', borderRadius:10,
                           border:'none', background:ORANGE, color:WHITE, fontWeight:700, fontSize:'.85rem',
                           cursor:'pointer', boxShadow:'0 4px 14px rgba(247,148,29,.35)' }}>
                  <Printer size={14}/> Print / Save PDF
                </button>
              </div>
            </div>

            {/* ═══ PAGE 1 — COVER ══════════════════════════ */}
            <div className="qs-cover" style={{ background:WHITE, borderRadius:20, border:`3px solid ${ORANGE}`,
                          padding:'2.5rem 2.5rem', marginBottom:'1.5rem', textAlign:'center',
                          pageBreakAfter:'always' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
                            gap:14, marginBottom:'1.75rem' }}>
                <img src={logo} alt="SolarJi"
                  style={{ width:80, height:80, borderRadius:18, objectFit:'cover',
                           border:`3px solid ${ORANGE}`, boxShadow:'0 8px 24px rgba(247,148,29,.3)' }}/>
                <div style={{ textAlign:'left' }}>
                  <p style={{ fontSize:'2.25rem', fontWeight:900, color:BLACK,
                              letterSpacing:'-.04em', lineHeight:1 }}>SolarJi</p>
                  <p style={{ fontSize:'.78rem', color:ORANGE, fontWeight:800, letterSpacing:'.05em' }}>
                    SOLAR ENERGY SOLUTIONS
                  </p>
                </div>
              </div>

              <p style={{ fontSize:'.8rem', color:'#9ca3af' }}>
                Shop No. 5, Solar Market, Naubasta Hamirpur Road, Kanpur Nagar — 208021
              </p>
              <p style={{ fontSize:'.8rem', color:'#9ca3af', marginBottom:'2rem' }}>
                +91 98765 43210 · +91 87654 32109 · info@solarji.com
              </p>

              <div style={{ background:ORANGE, color:WHITE, borderRadius:16,
                            padding:'2rem', margin:'0 auto 2rem', maxWidth:360 }}>
                <p style={{ fontSize:'.7rem', fontWeight:800, letterSpacing:'.2em',
                            textTransform:'uppercase', opacity:.8, marginBottom:10 }}>
                  Solar Proposal
                </p>
                <p style={{ fontSize:'3.25rem', fontWeight:900,
                            letterSpacing:'-.05em', lineHeight:.9 }}>{kw} kWp</p>
                <p style={{ fontSize:'1rem', fontWeight:700, marginTop:12, opacity:.9 }}>
                  {sLabel.toUpperCase()} — {tLabel}
                </p>
              </div>

              <p style={{ fontSize:'.9rem', color:'#9ca3af', marginBottom:6 }}>Prepared For</p>
              <p style={{ fontSize:'2rem', fontWeight:900, color:BLACK,
                          letterSpacing:'-.03em', marginBottom:6 }}>
                {cName.toUpperCase()}
              </p>
              {cAddr && (
                <p style={{ fontSize:'.85rem', color:'#9ca3af' }}>{cAddr}, {cCity} (Uttar Pradesh)</p>
              )}
              <p style={{ fontSize:'.85rem', color:'#9ca3af', marginBottom:'1.5rem' }}>{cPhone}</p>

              <div style={{ display:'inline-flex', gap:'2rem', flexWrap:'wrap',
                            justifyContent:'center', borderTop:'1px solid #f0f0f0', paddingTop:'1.25rem' }}>
                <span style={{ fontSize:'.8rem', color:'#6b7280' }}>Date: <strong>{qDate}</strong></span>
                <span style={{ fontSize:'.8rem', color:'#6b7280' }}>
                  Quote No: <strong style={{ color:ORANGE }}>{qNo}</strong>
                </span>
              </div>
            </div>

            {/* ═══ PAGE 2 — QUOTE TABLE ══════════════════════ */}
            <div className="qs" style={{ background:WHITE, borderRadius:20, border:'1px solid #e5e7eb',
                          padding:'1.75rem', marginBottom:'1.25rem' }}>
              {/* Header */}
              <div style={{ display:'flex', justifyContent:'space-between',
                            flexWrap:'wrap', gap:'1rem', marginBottom:'1.5rem' }}>
                <div>
                  <p style={{ fontWeight:900, color:BLACK }}>TO, {cName.toUpperCase()}</p>
                  {cAddr && (
                    <p style={{ fontSize:'.85rem', color:'#6b7280' }}>{cAddr}, {cCity} (Uttar Pradesh)</p>
                  )}
                  <p style={{ fontSize:'.85rem', color:'#6b7280' }}>{cPhone}</p>
                </div>
                <div style={{ textAlign:'right' }}>
                  <p style={{ fontWeight:800, color:ORANGE }}>Quote No: {qNo}</p>
                  <p style={{ fontSize:'.85rem', color:'#6b7280' }}>Date: {qDate}</p>
                </div>
              </div>

              <div style={{ padding:'10px 14px', background:'rgba(247,148,29,.08)', borderRadius:9,
                            border:'1px solid rgba(247,148,29,.2)', marginBottom:'1.25rem' }}>
                <p style={{ fontWeight:800, color:BLACK, fontSize:'.88rem' }}>
                  SUBJECT: {kw} KW PROPOSAL FOR ROOF TOP {sLabel.toUpperCase()} SOLAR POWER PLANT — {tLabel}
                </p>
              </div>

              <p style={{ fontSize:'.82rem', color:'#374151', marginBottom:'1.25rem', lineHeight:1.7 }}>
                Dear Sir/Ma'am, Kindly find the product details below.
                GST rates for Solar Power Generating Systems are as mentioned:
              </p>

              {/* Quote table */}
              <div style={{ overflowX:'auto', marginBottom:'1rem' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ background:BLACK }}>
                      <TH>SR.NO</TH>
                      <TH>PRODUCT DESCRIPTION</TH>
                      <TH>RATING</TH>
                      <TH>QTY</TH>
                      <TH right>UNIT RATE</TH>
                      <TH right>AMOUNT</TH>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom:'2px solid #e5e7eb' }}>
                      <TD bold>1</TD>
                      <td style={{ padding:'14px 12px' }}>
                        <p style={{ fontWeight:700, color:BLACK, marginBottom:5, fontSize:'.9rem' }}>
                          Design, Supply, Installation, Testing and Commissioning of {sLabel}
                          {' '}Interactive SPV based Solar Power Plant
                          {sType !== 'offGrid' ? ' with Net Metering' : ''}
                        </p>
                        <p style={{ fontSize:'.75rem', color:'#9ca3af' }}>
                          GST Inclusive — 70% Supply @5% GST + 30% Service @18% GST
                        </p>
                        {sType !== 'onGrid' && (
                          <p style={{ fontSize:'.75rem', color:'#9ca3af', marginTop:3 }}>
                            Includes {bats} Tubular {bats === 1 ? 'Battery' : 'Batteries'}{' '}
                            @ ₹50,000 each (GST Incl.)
                          </p>
                        )}
                      </td>
                      <TD>{kw} kW</TD>
                      <TD>1</TD>
                      <TD right bold>{fmt(total)}</TD>
                      <TD right bold orange>{fmt(total)}</TD>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr style={{ background:'#fafafa' }}>
                      <td colSpan={4} style={{ padding:'10px 12px', fontSize:'.78rem', color:'#9ca3af' }}>
                        Note: GST Inclusive
                      </td>
                      <td style={{ padding:'10px 12px', textAlign:'right', fontWeight:700,
                                   fontSize:'.85rem', color:BLACK }}>Total</td>
                      <td style={{ padding:'10px 12px', textAlign:'right', fontWeight:900,
                                   color:ORANGE, fontSize:'1rem' }}>{fmt(total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* amount in words */}
              <div style={{ padding:'9px 13px', background:'rgba(247,148,29,.05)', borderRadius:8,
                            marginBottom:'1.5rem', fontSize:'.8rem' }}>
                <strong>Amount in Words:</strong>{' '}
                <span style={{ color:'#374151' }}>{numWords(total)}</span>
              </div>

              {/* Subsidy table */}
              <div>
                <p style={{ fontWeight:800, color:BLACK, fontSize:'.85rem', marginBottom:8 }}>
                  Government Subsidy (PM Surya Ghar — Residential On-Grid Only)
                </p>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'.82rem' }}>
                  <thead>
                    <tr style={{ background:'#f9fafb' }}>
                      {['Plant Capacity','Central Subsidy (MNRE)','State Subsidy (UP)','Total Subsidy','Applicable'].map(h => (
                        <th key={h} style={{ padding:'7px 10px', textAlign:'left',
                                             fontWeight:700, fontSize:'.72rem' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom:'1px solid #f0f0f0' }}>
                      <td style={{ padding:'8px 10px', fontWeight:600 }}>{kw} kW</td>
                      <td style={{ padding:'8px 10px', fontWeight:600,
                                   color: centralSub > 0 ? '#16a34a' : '#9ca3af' }}>
                        {centralSub > 0 ? fmt(centralSub) : 'N/A'}
                      </td>
                      <td style={{ padding:'8px 10px', fontWeight:600,
                                   color: stateSub > 0 ? '#16a34a' : '#9ca3af' }}>
                        {stateSub > 0 ? fmt(stateSub) : 'N/A'}
                      </td>
                      <td style={{ padding:'8px 10px', fontWeight:700,
                                   color: subsidy > 0 ? '#16a34a' : '#9ca3af' }}>
                        {subsidy > 0 ? fmt(subsidy) : 'N/A'}
                      </td>
                      <td style={{ padding:'8px 10px' }}>
                        <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:99,
                                       fontSize:'.7rem', fontWeight:700,
                                       background: subsidy > 0 ? '#dcfce7' : '#f5f5f5',
                                       color: subsidy > 0 ? '#16a34a' : '#9ca3af' }}>
                          {subsidy > 0 ? 'YES' : 'NO'}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
                {subsidy > 0 ? (
                  <>
                    <p style={{ fontSize:'.75rem', color:'#16a34a', marginTop:6, fontWeight:600 }}>
                      ✓ Net cost after subsidy: <strong>{fmt(net)}</strong>
                    </p>
                    <p style={{ fontSize:'.75rem', color:'#9ca3af', marginTop:3 }}>
                      * Central: ₹30,000 for 1st kW + ₹30,000 for 2nd kW + ₹18,000 for 3rd kW (max ₹78,000).
                      State (UP): ₹15,000/kW capped at ₹30,000. Credited directly to customer's bank account as per MNRE policy.
                    </p>
                  </>
                ) : (
                  <p style={{ fontSize:'.75rem', color:'#9ca3af', marginTop:6 }}>
                    {cType !== 'residential'
                      ? '* PM Surya Ghar subsidy is applicable for residential consumers only.'
                      : '* PM Surya Ghar subsidy is not applicable for Off-Grid systems.'}
                  </p>
                )}
              </div>
            </div>

            {/* ═══ PAGE 3 — BILL OF MATERIAL ═══════════════ */}
            <div className="qs pb" style={{ background:WHITE, borderRadius:20, border:'1px solid #e5e7eb',
                          padding:'2rem', marginBottom:'1.5rem', pageBreakBefore:'always' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:'1.5rem' }}>
                <div style={{ width:42, height:42, borderRadius:11, background:'rgba(247,148,29,.1)',
                              display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Zap size={18} style={{ color:ORANGE }}/>
                </div>
                <div>
                  <h3 style={{ fontWeight:900, color:BLACK, fontSize:'1rem', marginBottom:2 }}>
                    Bill of Material (BOM)
                  </h3>
                  <p style={{ fontSize:'.78rem', color:'#9ca3af' }}>
                    For {kw} kWp {sLabel} {cType === 'commercial' ? 'Commercial' : 'Residential'} System
                  </p>
                </div>
              </div>

              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ background:BLACK }}>
                      <TH>S.NO</TH>
                      <TH>PRODUCT DESCRIPTION</TH>
                      <TH>RATING</TH>
                      <TH>QTY</TH>
                    </tr>
                  </thead>
                  <tbody>
                    {bom.map((item, i) => (
                      <tr key={i} style={{ borderBottom:'1px solid #f0f0f0',
                                          background: i % 2 === 0 ? WHITE : '#fafafa' }}>
                        <td style={{ padding:'6px 10px', textAlign:'center', color:'#9ca3af',
                                     fontWeight:700, fontSize:'.8rem' }}>{item.sno}</td>
                        <td style={{ padding:'6px 10px', color:BLACK, fontWeight:500,
                                     fontSize:'.82rem' }}>{item.desc}</td>
                        <td style={{ padding:'6px 10px', color:'#6b7280',
                                     fontSize:'.8rem', whiteSpace:'nowrap' }}>{item.rating}</td>
                        <td style={{ padding:'6px 10px', color:'#6b7280',
                                     fontSize:'.8rem', whiteSpace:'nowrap' }}>{item.qty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p style={{ fontSize:'.75rem', color:'#9ca3af', marginTop:'1rem', padding:'8px 12px',
                          background:'rgba(247,148,29,.04)', borderRadius:7 }}>
                Note: Goods are sent in extra quantities to avoid shortfall on site.
                Surplus material will be collected back after work completion.
              </p>
            </div>

            {/* ═══ PAGE 4 — WARRANTY · PAYMENT · T&C · BANK ═══ */}
            <div className="pb" style={{ marginBottom:'1.5rem', pageBreakBefore:'always' }}>

              {/* Warranty + Payment */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr',
                            gap:'.75rem', marginBottom:'.75rem' }}>
                {/* Warranty */}
                <div className="qs" style={{ background:WHITE, borderRadius:20, border:'1px solid #e5e7eb', padding:'1.5rem' }}>
                  <p style={{ fontWeight:900, color:BLACK, fontSize:'.9rem', marginBottom:'1rem' }}>
                    Product Warranty
                  </p>
                  {[
                    ['Solar Module',      '25 Years'],
                    ['Inverter',          '10 Years (Brand Warranty)'],
                    ['Structure (GI)',    '30 Years'],
                    ['Cables & BOS',      '5 Years'],
                    ['On System',         '5 Years'],
                  ].map(([item, val]) => (
                    <div key={item}
                      style={{ display:'flex', justifyContent:'space-between', padding:'7px 0',
                               borderBottom:'1px solid #f0f0f0', fontSize:'.83rem' }}>
                      <span style={{ color:'#374151' }}>{item}</span>
                      <span style={{ fontWeight:700, color:ORANGE }}>{val}</span>
                    </div>
                  ))}
                </div>

                {/* Payment */}
                <div className="qs" style={{ background:WHITE, borderRadius:20, border:'1px solid #e5e7eb', padding:'1.5rem' }}>
                  <p style={{ fontWeight:900, color:BLACK, fontSize:'.9rem', marginBottom:'1rem' }}>
                    Payment Schedule
                  </p>
                  {/* Non-loan */}
                  <p style={{ fontSize:'.75rem', fontWeight:800, color:ORANGE, textTransform:'uppercase',
                               letterSpacing:'.06em', marginBottom:6 }}>Without Bank Loan</p>
                  <div style={{ display:'flex', gap:12, padding:'9px 0', borderBottom:'1px solid #f0f0f0',
                                fontSize:'.83rem', alignItems:'flex-start', marginBottom:'1rem' }}>
                    <span style={{ fontWeight:900, color:ORANGE, minWidth:46, fontSize:'1rem', lineHeight:1 }}>100%</span>
                    <span style={{ color:'#374151', lineHeight:1.55 }}>Full payment before commencement of work</span>
                  </div>
                  {/* Loan */}
                  <p style={{ fontSize:'.75rem', fontWeight:800, color:'#6b7280', textTransform:'uppercase',
                               letterSpacing:'.06em', marginBottom:6 }}>With Bank Loan</p>
                  <div style={{ display:'flex', gap:12, padding:'9px 0', borderBottom:'1px solid #f0f0f0',
                                fontSize:'.83rem', alignItems:'flex-start' }}>
                    <span style={{ fontWeight:900, color:ORANGE, minWidth:46, fontSize:'.95rem', lineHeight:1 }}>₹5,000</span>
                    <span style={{ color:'#374151', lineHeight:1.55 }}>Advance token amount; balance via bank loan disbursement</span>
                  </div>
                  <p style={{ fontSize:'.73rem', color:'#9ca3af', marginTop:8 }}>
                    Implementation begins after advance payment is received.
                  </p>
                </div>
              </div>

              {/* Terms & Conditions */}
              <div className="qs" style={{ background:WHITE, borderRadius:20, border:'1px solid #e5e7eb',
                            padding:'1.5rem', marginBottom:'1rem' }}>
                <p style={{ fontWeight:900, color:BLACK, fontSize:'.9rem', marginBottom:'1rem' }}>
                  Standard Terms &amp; Conditions
                </p>
                <ol className="tc-list" style={{ paddingLeft:'1.1rem', display:'grid', gap:4 }}>
                  {[
                    'Quotation valid for 15 days from date of issue.',
                    'Transportation and material loading/unloading charges are included in the quoted price.',
                    sType !== 'offGrid'
                      ? 'Net Meter / Smart Meter installation depends on Kesco timeline after we file the application.'
                      : null,
                    'Wi-Fi to be provided by client for remote monitoring system (if applicable).',
                    'Module cleaning is on client\'s scope.',
                    'Grid-tie (On-Grid) systems function only when grid power is available.',
                    'Electricity load extension (if required) is on client\'s scope.',
                    `Estimated generation: ${dailyGen} units/day → ${annGen} units/year (${kw} kW × 5 units/kW/day).`,
                    'As per MNRE policy, applicable subsidy will be credited directly to customer\'s bank account.',
                    'Meter load should be at minimum equal to solar system capacity.',
                    'Wiring of solar output will be routed as mutually agreed with the customer.',
                    'Material delivered in extra quantity; surplus collected back after site completion.',
                  ].filter(Boolean).map((tc, i) => (
                    <li key={i} style={{ fontSize:'.8rem', color:'#6b7280', lineHeight:1.65 }}>{tc}</li>
                  ))}
                </ol>
              </div>

              {/* Bank Details + Signature */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'.75rem' }}>
                {/* Bank */}
                <div className="qs" style={{ background:WHITE, borderRadius:20, border:'1px solid #e5e7eb', padding:'1.5rem' }}>
                  <p style={{ fontWeight:900, color:BLACK, fontSize:'.9rem', marginBottom:'1rem' }}>Bank Details</p>
                  {[
                    ['Beneficiary Name', 'SolarJi'],
                    ['Bank Name',        'State Bank of India'],
                    ['Account No.',      'XXXXXXXXXXXX'],
                    ['IFSC Code',        'SBIN00XXXXX'],
                  ].map(([k, v]) => (
                    <div key={k}
                      style={{ display:'flex', gap:8, padding:'6px 0',
                               borderBottom:'1px solid #f0f0f0', fontSize:'.83rem' }}>
                      <span style={{ color:'#9ca3af', minWidth:116 }}>{k}:</span>
                      <span style={{ fontWeight:700, color:BLACK }}>{v}</span>
                    </div>
                  ))}
                </div>

                {/* Signature */}
                <div className="qs" style={{ background:WHITE, borderRadius:20, border:'1px solid #e5e7eb',
                              padding:'1.5rem', display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
                  <div>
                    <p style={{ fontWeight:900, color:BLACK, fontSize:'.9rem', marginBottom:'1rem' }}>For SolarJi</p>
                    <div style={{ height:56, borderBottom:'1.5px dashed #d1d5db', marginBottom:'.75rem' }}/>
                    <p style={{ fontSize:'.75rem', color:'#9ca3af' }}>Authorised Signatory</p>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:10,
                                marginTop:'1rem', paddingTop:'1rem', borderTop:'1px solid #f0f0f0' }}>
                    <img src={logo} alt=""
                      style={{ width:34, height:34, borderRadius:9, objectFit:'cover',
                               border:`2px solid ${ORANGE}` }}/>
                    <div>
                      <p style={{ fontWeight:900, color:BLACK, fontSize:'.85rem' }}>SolarJi</p>
                      <p style={{ fontSize:'.7rem', color:'#9ca3af' }}>Solar Energy Solutions, Kanpur</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer — inside page 4 so it never spills to a new page */}
              <div style={{ textAlign:'center', padding:'.75rem 1rem 0',
                            borderTop:`2px solid rgba(247,148,29,.2)`, marginTop:'.75rem' }}>
                <p style={{ fontWeight:900, color:ORANGE, fontSize:'.88rem', marginBottom:3 }}>
                  Thanks &amp; Regards — SolarJi
                </p>
                <p style={{ fontSize:'.75rem', color:'#9ca3af' }}>
                  +91 98765 43210 · info@solarji.com · Kanpur, Uttar Pradesh &nbsp;|&nbsp; देश चलेगा सूरज से ☀️
                </p>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
