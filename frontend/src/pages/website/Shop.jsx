import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ShoppingCart, Search, Trash2, ShieldCheck,
  CheckCircle, ChevronRight, X, Minus, Plus, Package
} from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import logo from '../../assets/solarji logo.jpeg';

const ORANGE = '#f7941d';
const BLACK  = '#111111';
const WHITE  = '#ffffff';



export default function Shop() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  /* Cart State */
  const [cart, setCart] = useState({});
  const [isCartOpen, setIsCartOpen] = useState(false);

  /* Checkout Dialog State */
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [createdLeadId, setCreatedLeadId] = useState(null);

  /* Customer Details Form */
  const [cName, setCName] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cAddr, setCAddr] = useState('');
  const [cCity, setCCity] = useState('Kanpur');
  const [cNotes, setCNotes] = useState('');

  useEffect(() => {
    setLoading(true);
    api.get('/stock/public/items')
      .then((res) => {
        setProducts(res.data.items || []);
      })
      .catch((err) => {
        console.error('Error fetching products:', err);
        toast.error('Could not load products. Please try again.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Filter Categories
  const categories = ['All', ...new Set(products.map(p => p.category).filter(Boolean))];

  // Filtered Products
  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  /* Cart actions */
  const addToCart = (product) => {
    if (product.quantity <= 0) {
      toast.error('Item is currently out of stock.');
      return;
    }
    setCart(prev => ({
      ...prev,
      [product._id]: { product, qty: 1 }
    }));
    toast.success(`${product.name} added to cart!`);
  };

  const updateCartQty = (productId, change) => {
    setCart(prev => {
      const item = prev[productId];
      if (!item) return prev;
      const newQty = item.qty + change;
      if (newQty <= 0) {
        const updated = { ...prev };
        delete updated[productId];
        return updated;
      }
      // Check stock limit
      if (newQty > item.product.quantity) {
        toast.error(`Cannot add more. Only ${item.product.quantity} items available in stock.`);
        return prev;
      }
      return {
        ...prev,
        [productId]: { ...item, qty: newQty }
      };
    });
  };

  const removeFromCart = (productId) => {
    setCart(prev => {
      const updated = { ...prev };
      delete updated[productId];
      return updated;
    });
  };

  const cartItems = Object.values(cart);
  const cartCount = cartItems.reduce((acc, curr) => acc + curr.qty, 0);
  const cartTotal = cartItems.reduce((acc, curr) => acc + (curr.product.sellPrice * curr.qty), 0);

  /* Form Validation */
  const phoneRegex = /^[6-9]\d{9}$/;
  const isPhoneValid = phoneRegex.test(cPhone.trim().replace(/[- ]/g, ''));
  const isFormValid = cName.trim() && isPhoneValid && cAddr.trim();

  /* Checkout Handler */
  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;
    setSubmitting(true);
    try {
      const items = cartItems.map(item => ({
        itemId: item.product._id,
        itemName: item.product.name,
        category: item.product.category,
        price: item.product.sellPrice,
        quantity: item.qty,
        unit: item.product.unit,
        total: item.product.sellPrice * item.qty
      }));

      const res = await api.post('/orders/public', {
        customerName: cName,
        phone: cPhone,
        address: cAddr,
        city: cCity,
        notes: cNotes,
        items,
        totalAmount: cartTotal
      });

      setCreatedLeadId(res.data.orderNumber); // use orderNumber as reference in UI
      setCheckoutSuccess(true);
      setCart({}); // Clear cart
      toast.success('Order placed successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Could not submit order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight:'100vh', background:'#f8f9fa', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
      
      {/* ── HEADER NAVBAR ── */}
      <header style={{ position:'sticky', top:0, zIndex:40, background:'rgba(255,255,255,.94)',
                       backdropFilter:'blur(16px)', borderBottom:'1px solid rgba(0,0,0,.06)' }}>
        <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 1.5rem', height:64,
                      display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <button onClick={() => navigate('/')}
              style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 12px', borderRadius:9,
                       border:'1.5px solid #e5e7eb', background:WHITE, color:'#6b7280',
                       fontSize:'.78rem', fontWeight:600, cursor:'pointer' }}>
              <ArrowLeft size={13}/> Home
            </button>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <img src={logo} alt="" style={{ width:30, height:30, borderRadius:8,
                                              objectFit:'cover', border:`1.5px solid ${ORANGE}` }}/>
              <span style={{ fontWeight:900, color:BLACK, fontSize:'1rem' }}>SolarJi Store</span>
            </div>
          </div>

          <button onClick={() => setIsCartOpen(true)}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 16px', borderRadius:10,
                     border:'none', background:BLACK, color:WHITE, fontWeight:700, fontSize:'.8rem',
                     cursor:'pointer', position:'relative', transition:'transform .15s active' }}>
            <ShoppingCart size={15} />
            Cart
            {cartCount > 0 && (
              <span style={{ position:'absolute', top:-6, right:-6, background:ORANGE, color:WHITE,
                             borderRadius:99, minWidth:18, height:18, display:'flex', alignItems:'center',
                             justifyContent:'center', fontSize:'.65rem', fontWeight:900, padding:'0 4px' }}>
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ── STORE BODY ── */}
      <main style={{ maxWidth:1200, margin:'0 auto', padding:'2.5rem 1.5rem' }}>
        
        {/* Intro */}
        <div style={{ marginBottom:'2.5rem', textAlign:'center' }}>
          <h1 style={{ fontSize:'2.25rem', fontWeight:900, color:BLACK, letterSpacing:'-.04em' }}>
            Solar & Electrical Supplies Store
          </h1>
          <p style={{ color:'#6b7280', fontSize:'.95rem', marginTop:8, maxWidth:600, margin:'8px auto 0', lineHeight:1.6 }}>
            Browse through our premium inventory of solar components. No credit card required! 
            Submit your order inquiry, and our team will contact you to process payments and schedule offline delivery.
          </p>
        </div>

        {/* Search and Category Filtering Row */}
        <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem', marginBottom:'2rem' }}>
          {/* Search bar */}
          <div style={{ position:'relative', width:'100%', maxWidth:480, margin:'0 auto' }}>
            <Search size={18} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'#9ca3af' }} />
            <input
              type="text"
              className="input w-full"
              placeholder="Search components (panels, inverters, cables)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft:42, borderRadius:12, height:46 }}
            />
          </div>

          {/* Category Pills */}
          <div style={{ display:'flex', gap:8, overflowX:'auto', padding:'4px 0', justifyContent:'center', flexWrap:'wrap' }}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding:'8px 16px',
                  borderRadius:99,
                  fontSize:'.82rem',
                  fontWeight:700,
                  cursor:'pointer',
                  border:'none',
                  transition:'all .15s',
                  background: selectedCategory === cat ? ORANGE : '#e5e7eb',
                  color: selectedCategory === cat ? WHITE : '#4b5563'
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div style={{ display:'flex', justifyContent:'center', padding:'4rem 0' }}>
            <div style={{ border:'3px solid #f3f3f3', borderTop:`3px solid ${ORANGE}`, borderRadius:'50%', width:40, height:40, animation:'spin 1s linear infinite' }} />
          </div>
        )}

        {/* Empty Catalog State */}
        {!loading && filteredProducts.length === 0 && (
          <div style={{ textAlign:'center', padding:'4rem 0', background:WHITE, borderRadius:20, border:'1px solid #e5e7eb' }}>
            <Package size={48} style={{ color:'#9ca3af', margin:'0 auto 1rem' }} />
            <h3 style={{ fontWeight:800, color:BLACK, fontSize:'1.1rem' }}>No products found</h3>
            <p style={{ color:'#9ca3af', fontSize:'.85rem', marginTop:4 }}>Try searching for a different keyword or checking other categories.</p>
          </div>
        )}

        {/* Grid of Products */}
        {!loading && filteredProducts.length > 0 && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:'1.75rem' }}>
            {filteredProducts.map(prod => {
              const inCart = cart[prod._id];
              const isOutOfStock = prod.quantity <= 0;

              const hasImage = prod.imageUrl && prod.imageUrl.trim() !== '';

              return (
                <div key={prod._id}
                  style={{
                    background:WHITE,
                    borderRadius:18,
                    overflow:'hidden',
                    border:'1px solid #e5e7eb',
                    display:'flex',
                    flexDirection:'column',
                    transition:'transform .2s, box-shadow .2s',
                    boxShadow:'0 2px 8px rgba(0,0,0,.03)'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,.08)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,.03)';
                  }}
                >
                  {hasImage ? (
                    /* Image wrapper */
                    <div style={{ height:180, width:'100%', overflow:'hidden', position:'relative', background:'#f3f4f6' }}>
                      <img
                        src={prod.imageUrl}
                        alt={prod.name}
                        style={{ width:'100%', height:'100%', objectFit:'cover' }}
                      />
                      <span style={{ position:'absolute', top:12, left:12, background:'rgba(17,17,17,.75)',
                                     backdropFilter:'blur(4px)', color:WHITE, fontSize:'.68rem', fontWeight:800,
                                     padding:'4px 8px', borderRadius:6 }}>
                        {prod.category.toUpperCase()}
                      </span>

                      {/* Stock status badge */}
                      <span style={{
                        position:'absolute',
                        top:12,
                        right:12,
                        fontSize:'.68rem',
                        fontWeight:800,
                        padding:'4px 8px',
                        borderRadius:6,
                        background: isOutOfStock ? '#ffebeb' : '#e6f7ed',
                        color: isOutOfStock ? '#ef4444' : '#16a34a'
                      }}>
                        {isOutOfStock ? 'OUT OF STOCK' : 'IN STOCK'}
                      </span>
                    </div>
                  ) : null}

                  {/* Details */}
                  <div style={{ padding:'1.25rem', flexGrow:1, display:'flex', flexDirection:'column' }}>
                    {!hasImage && (
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                        <span style={{ background:'#f3f4f6', color:'#4b5563', fontSize:'.65rem', fontWeight:800,
                                       padding:'3px 6px', borderRadius:4 }}>
                          {prod.category.toUpperCase()}
                        </span>
                        <span style={{
                          fontSize:'.68rem',
                          fontWeight:800,
                          padding:'3px 6px',
                          borderRadius:4,
                          background: isOutOfStock ? '#ffebeb' : '#e6f7ed',
                          color: isOutOfStock ? '#ef4444' : '#16a34a'
                        }}>
                          {isOutOfStock ? 'OUT OF STOCK' : 'IN STOCK'}
                        </span>
                      </div>
                    )}

                    <h3 style={{ fontWeight:800, color:BLACK, fontSize:'.92rem', minHeight:44, lineHeight:1.4 }}>
                      {prod.name}
                    </h3>
                    
                    <div style={{ display:'flex', alignItems:'baseline', gap:4, marginTop:'auto', marginBottom:'1.25rem' }}>
                      <span style={{ fontSize:'1.25rem', fontWeight:900, color:ORANGE }}>
                        ₹{prod.sellPrice.toLocaleString('en-IN')}
                      </span>
                      <span style={{ fontSize:'.75rem', color:'#9ca3af' }}>/ {prod.unit}</span>
                    </div>

                    {/* Add to Cart Actions */}
                    {inCart ? (
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                                    background:'#f3f4f6', borderRadius:10, padding:'6px 10px' }}>
                        <button onClick={() => updateCartQty(prod._id, -1)}
                          style={{ border:'none', background:'none', color:'#4b5563', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', width:26, height:26 }}>
                          <Minus size={14} />
                        </button>
                        <span style={{ fontSize:'.88rem', fontWeight:800, color:BLACK }}>
                          {inCart.qty}
                        </span>
                        <button onClick={() => updateCartQty(prod._id, 1)}
                          style={{ border:'none', background:'none', color:'#4b5563', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', width:26, height:26 }}>
                          <Plus size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        disabled={isOutOfStock}
                        onClick={() => addToCart(prod)}
                        style={{
                          width:'100%',
                          padding:'10px',
                          borderRadius:10,
                          border:'none',
                          background: isOutOfStock ? '#e5e7eb' : BLACK,
                          color: isOutOfStock ? '#9ca3af' : WHITE,
                          fontWeight:800,
                          fontSize:'.8rem',
                          cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                          transition:'background .15s'
                        }}
                        onMouseEnter={e => { if(!isOutOfStock) e.currentTarget.style.background = ORANGE; }}
                        onMouseLeave={e => { if(!isOutOfStock) e.currentTarget.style.background = BLACK; }}
                      >
                        Add to Cart
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── CART DRAWER OVERLAY ── */}
      {isCartOpen && (
        <div style={{ position:'fixed', inset:0, zIndex:100, display:'flex', justifyContent:'flex-end' }}>
          {/* Backdrop */}
          <div onClick={() => setIsCartOpen(false)}
            style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.4)', backdropFilter:'blur(4px)' }} />

          {/* Drawer Body */}
          <div style={{
            position:'relative',
            width:'100%',
            maxWidth:440,
            height:'100%',
            background:WHITE,
            boxShadow:'-8px 0 32px rgba(0,0,0,.15)',
            display:'flex',
            flexDirection:'column',
            animation:'slideIn .25s ease-out'
          }}>
            <style>{`
              @keyframes slideIn {
                from { transform: translateX(100%); }
                to { transform: translateX(0); }
              }
            `}</style>
            
            {/* Header */}
            <div style={{ padding:'1.25rem 1.5rem', borderBottom:'1px solid #e5e7eb',
                          display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <ShoppingCart size={18} style={{ color:ORANGE }} />
                <h2 style={{ fontWeight:900, color:BLACK, fontSize:'1.1rem' }}>Shopping Cart ({cartCount})</h2>
              </div>
              <button onClick={() => setIsCartOpen(false)}
                style={{ border:'none', background:'none', cursor:'pointer', color:'#9ca3af' }}>
                <X size={20} />
              </button>
            </div>

            {/* Cart Items List */}
            <div style={{ flexGrow:1, overflowY:'auto', padding:'1.5rem' }}>
              {cartItems.length === 0 ? (
                <div style={{ textAlign:'center', padding:'4rem 0', color:'#9ca3af' }}>
                  <ShoppingCart size={40} style={{ margin:'0 auto 12px', opacity:.5 }} />
                  <p style={{ fontWeight:700, fontSize:'.9rem' }}>Your cart is empty</p>
                  <p style={{ fontSize:'.78rem', marginTop:4 }}>Add components from the store to generate an order proposal.</p>
                </div>
              ) : (
                <div style={{ display:'grid', gap:'1.25rem' }}>
                  {cartItems.map(item => (
                    <div key={item.product._id}
                      style={{ display:'flex', gap:12, paddingBottom:'1.25rem', borderBottom:'1px solid #f3f4f6' }}>
                      {item.product.imageUrl && item.product.imageUrl.trim() !== '' ? (
                        <img
                          src={item.product.imageUrl}
                          alt=""
                          style={{ width:64, height:64, borderRadius:8, objectFit:'cover', background:'#f3f4f6' }}
                        />
                      ) : null}
                      <div style={{ flexGrow:1 }}>
                        <h4 style={{ fontSize:'.85rem', fontWeight:800, color:BLACK, lineHeight:1.3, marginBottom:4 }}>
                          {item.product.name}
                        </h4>
                        <p style={{ fontSize:'.75rem', color:'#9ca3af', marginBottom:8 }}>
                          ₹{item.product.sellPrice.toLocaleString('en-IN')} / {item.product.unit}
                        </p>
                        
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                          {/* Qty control */}
                          <div style={{ display:'flex', alignItems:'center', gap:10, background:'#f3f4f6',
                                        borderRadius:8, padding:'4px 8px' }}>
                            <button onClick={() => updateCartQty(item.product._id, -1)}
                              style={{ border:'none', background:'none', color:'#4b5563', cursor:'pointer' }}>
                              <Minus size={12} />
                            </button>
                            <span style={{ fontSize:'.78rem', fontWeight:800, color:BLACK }}>
                              {item.qty}
                            </span>
                            <button onClick={() => updateCartQty(item.product._id, 1)}
                              style={{ border:'none', background:'none', color:'#4b5563', cursor:'pointer' }}>
                              <Plus size={12} />
                            </button>
                          </div>

                          <button onClick={() => removeFromCart(item.product._id)}
                            style={{ border:'none', background:'none', color:'#ef4444', cursor:'pointer',
                                     display:'flex', alignItems:'center', gap:4, fontSize:'.72rem', fontWeight:700 }}>
                            <Trash2 size={12} /> Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer / Summary */}
            {cartItems.length > 0 && (
              <div style={{ padding:'1.5rem', borderTop:'1px solid #e5e7eb', background:'#fafafa' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'1.25rem' }}>
                  <span style={{ color:'#4b5563', fontSize:'.88rem', fontWeight:700 }}>Grand Total:</span>
                  <span style={{ color:ORANGE, fontSize:'1.3rem', fontWeight:900 }}>
                    ₹{cartTotal.toLocaleString('en-IN')}
                  </span>
                </div>

                <button onClick={() => { setIsCartOpen(false); setIsCheckoutOpen(true); }}
                  style={{
                    width:'100%',
                    padding:'12px',
                    borderRadius:12,
                    border:'none',
                    background:ORANGE,
                    color:WHITE,
                    fontWeight:800,
                    fontSize:'.9rem',
                    cursor:'pointer',
                    display:'flex',
                    alignItems:'center',
                    justifyContent:'center',
                    gap:8,
                    boxShadow:'0 4px 16px rgba(247,148,29,.3)'
                  }}
                >
                  Proceed to Checkout <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CHECKOUT MODAL ── */}
      {isCheckoutOpen && (
        <div style={{ position:'fixed', inset:0, zIndex:110, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
          {/* Backdrop */}
          <div onClick={() => { if(!submitting && !checkoutSuccess) setIsCheckoutOpen(false); }}
            style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.5)', backdropFilter:'blur(4px)' }} />

          {/* Modal Body */}
          <div style={{
            position:'relative',
            background:WHITE,
            borderRadius:24,
            width:'100%',
            maxWidth:500,
            maxHeight:'90vh',
            overflowY:'auto',
            padding:'2rem',
            boxShadow:'0 10px 40px rgba(0,0,0,.15)',
            animation:'scaleUp .2s ease-out'
          }}>
            <style>{`
              @keyframes scaleUp {
                from { transform: scale(0.95); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
              }
            `}</style>

            {/* Success Screen */}
            {checkoutSuccess ? (
              <div style={{ textAlign:'center', padding:'1rem 0' }}>
                <CheckCircle size={56} style={{ color:'#16a34a', margin:'0 auto 1.25rem' }} />
                <h3 style={{ fontSize:'1.4rem', fontWeight:900, color:BLACK, letterSpacing:'-.02em' }}>
                  Inquiry Placed Successfully!
                </h3>
                <p style={{ color:'#6b7280', fontSize:'.85rem', marginTop:8, lineHeight:1.6 }}>
                  Thank you for placing your order request with SolarJi! We have logged your request in our database. 
                  A sales coordinator will call you on <strong>{cPhone}</strong> within 24 hours to schedule payment confirmation and shipment.
                </p>
                <div style={{ background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:12, padding:'10px 14px', margin:'1.25rem 0', fontSize:'.78rem', color:'#4b5563' }}>
                  Reference Inquiry ID: <strong style={{ color:ORANGE }}>{createdLeadId}</strong>
                </div>
                <button onClick={() => { setIsCheckoutOpen(false); setCheckoutSuccess(false); setCreatedLeadId(null); setCName(''); setCPhone(''); setCAddr(''); setCNotes(''); }}
                  style={{ padding:'10px 24px', borderRadius:10, border:'none', background:BLACK, color:WHITE, fontWeight:800, fontSize:'.85rem', cursor:'pointer' }}
                >
                  Back to Store
                </button>
              </div>
            ) : (
              /* Checkout Form */
              <form onSubmit={handleCheckoutSubmit}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.5rem' }}>
                  <h3 style={{ fontSize:'1.25rem', fontWeight:900, color:BLACK, letterSpacing:'-.02em' }}>
                    Delivery & Installation Details
                  </h3>
                  <button type="button" onClick={() => setIsCheckoutOpen(false)} disabled={submitting}
                    style={{ border:'none', background:'none', cursor:'pointer', color:'#9ca3af' }}>
                    <X size={20} />
                  </button>
                </div>

                {/* Offline Payment Box */}
                <div style={{
                  display:'flex',
                  gap:10,
                  padding:'1rem',
                  borderRadius:14,
                  background:'rgba(247,148,29,.05)',
                  border:`1.5px solid rgba(247,148,29,.2)`,
                  marginBottom:'1.5rem'
                }}>
                  <ShieldCheck size={20} style={{ color:ORANGE, flexShrink:0, marginTop:1 }} />
                  <div>
                    <p style={{ fontSize:'.8rem', fontWeight:800, color:BLACK }}>No Online Payment Required</p>
                    <p style={{ fontSize:'.72rem', color:'#6b7280', marginTop:2, lineHeight:1.4 }}>
                      Payment is processed completely offline. We accept cash, check, bank transfers, or financing agreements upon delivery or work completion.
                    </p>
                  </div>
                </div>

                {/* Input Fields */}
                <div style={{ display:'grid', gap:'1rem', marginBottom:'1.75rem' }}>
                  <div>
                    <label style={{ display:'block', fontSize:'.75rem', fontWeight:700, color:'#374151', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }}>
                      Full Name *
                    </label>
                    <input type="text" className="input w-full" required placeholder="Mr. / Ms. Name"
                      value={cName} onChange={e => setCName(e.target.value)} disabled={submitting} />
                  </div>

                  <div>
                    <label style={{ display:'block', fontSize:'.75rem', fontWeight:700, color:'#374151', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }}>
                      Mobile Number *
                    </label>
                    <input type="tel" className="input w-full" required placeholder="e.g. 9876543210"
                      value={cPhone} onChange={e => setCPhone(e.target.value)} disabled={submitting} />
                    {cPhone && !isPhoneValid && (
                      <p style={{ color: '#ef4444', fontSize: '.72rem', marginTop: 4, fontWeight: 600 }}>
                        Please enter a valid 10-digit Indian mobile number (e.g. 9876543210)
                      </p>
                    )}
                  </div>

                  <div>
                    <label style={{ display:'block', fontSize:'.75rem', fontWeight:700, color:'#374151', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }}>
                      Installation / Delivery Address *
                    </label>
                    <textarea rows={2} className="input w-full" required placeholder="Plot / House No., Street, Area..."
                      value={cAddr} onChange={e => setCAddr(e.target.value)} disabled={submitting} style={{ resize:'none' }} />
                  </div>

                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                    <div>
                      <label style={{ display:'block', fontSize:'.75rem', fontWeight:700, color:'#374151', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }}>
                        City
                      </label>
                      <input type="text" className="input w-full" value={cCity} onChange={e => setCCity(e.target.value)} disabled={submitting} />
                    </div>
                    <div>
                      <label style={{ display:'block', fontSize:'.75rem', fontWeight:700, color:'#374151', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }}>
                        State
                      </label>
                      <input type="text" className="input w-full" value="Uttar Pradesh" disabled />
                    </div>
                  </div>

                  <div>
                    <label style={{ display:'block', fontSize:'.75rem', fontWeight:700, color:'#374151', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }}>
                      Order Notes (Optional)
                    </label>
                    <input type="text" className="input w-full" placeholder="Preferred delivery time, specific requirements..."
                      value={cNotes} onChange={e => setCNotes(e.target.value)} disabled={submitting} />
                  </div>
                </div>

                {/* Submit buttons */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:'1rem' }}>
                  <button type="button" onClick={() => setIsCheckoutOpen(false)} disabled={submitting}
                    className="btn-secondary" style={{ height:46 }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={!isFormValid || submitting}
                    style={{
                      height:46,
                      borderRadius:12,
                      border:'none',
                      background: isFormValid && !submitting ? ORANGE : '#e5e7eb',
                      color: isFormValid && !submitting ? WHITE : '#9ca3af',
                      fontWeight:800,
                      fontSize:'.9rem',
                      cursor: isFormValid && !submitting ? 'pointer' : 'not-allowed',
                      display:'flex',
                      alignItems:'center',
                      justifyContent:'center',
                      boxShadow: isFormValid && !submitting ? '0 4px 16px rgba(247,148,29,.3)' : 'none'
                    }}
                  >
                    {submitting ? 'Submitting Request...' : `Place Offline Order • ₹${cartTotal.toLocaleString('en-IN')}`}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
