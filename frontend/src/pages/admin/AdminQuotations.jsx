import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Trash2, Printer, ChevronLeft, RefreshCw, Sparkles, PlusCircle, Save, History, Search, X } from 'lucide-react';
import api from '../../api/axios';
import Layout from '../../components/Layout';
import toast from 'react-hot-toast';
import { showApiError } from '../../utils/apiError';
import logo from '../../assets/solarji logo.jpeg';
import signature from '../../assets/signature.png';

const ACCENT_COLOR = '#f7941d'; // Brand orange color
const DARK_GRAY = '#1E1E1E';



// Helper for Indian Rupees format
function fmt(n) {
  return '₹\u00a0' + Math.round(n).toLocaleString('en-IN');
}

// Convert numbers to Words in Lakhs/Crores
function numWords(num) {
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
             'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
             'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  function c(n) {
    if (!n) return '';
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '');
    if (n < 1e3) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + c(n % 100) : '');
    if (n < 1e5) return c(Math.floor(n / 1e3)) + ' Thousand' + (n % 1e3 ? ' ' + c(n % 1e3) : '');
    if (n < 1e7) return c(Math.floor(n / 1e5)) + ' Lakh' + (n % 1e5 ? ' ' + c(n % 1e5) : '');
    return c(Math.floor(n / 1e7)) + ' Crore' + (n % 1e7 ? ' ' + c(n % 1e7) : '');
  }
  const result = c(Math.round(num));
  return result ? result + ' Rupees Only' : 'Zero Rupees Only';
}

export default function AdminQuotations() {
  const navigate = useNavigate();
  
  // Tab category selection
  const [category, setCategory] = useState('rooftop');
  
  // Customer details
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  
  // Invoice general settings
  const [estimateNo, setEstimateNo] = useState(() => String(Math.floor(Math.random() * 9000) + 1000));
  const [estimateDate, setEstimateDate] = useState(() => {
    const d = new Date();
    return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;
  });
  
  // Quotation items (starts empty by default, fully customizable)
  const [items, setItems] = useState([]);

  // View mode & history state
  const [viewMode, setViewMode] = useState('builder'); // 'builder' or 'history'
  const [history, setHistory] = useState([]);

  // Inventory items for product picker
  const [stockItems, setStockItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Fetch quotations history
  const fetchHistory = () => {
    api.get('/quotations')
      .then(res => {
        setHistory(res.data || []);
      })
      .catch(err => {
        console.error('Failed to load history:', err);
      });
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    api.get('/stock/items', { params: { picker: 1, limit: 1000 } })
      .then(res => {
        setStockItems(res.data.items || []);
      })
      .catch(err => {
        console.error('Failed to load stock items:', err);
      });
  }, []);

  const handleSaveQuotation = async () => {
    if (!customerName.trim()) {
      toast.error('Please enter a Client Name.');
      return;
    }
    if (items.length === 0) {
      toast.error('Please add at least one component to the quotation list.');
      return;
    }

    try {
      await api.post('/quotations', {
        estimateNo,
        date: estimateDate,
        customerName,
        customerPhone,
        customerAddress,
        category,
        items,
        subTotal: totals.subTotal,
        totalGst: totals.totalGst,
        grandTotal: totals.grandTotal
      });
      toast.success('Quotation saved to history!');
      fetchHistory();
      setViewMode('history'); // Switch to history tab to view saved record
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to save quotation');
    }
  };

  const handlePrintQuotation = async () => {
    if (!customerName.trim()) {
      toast.error('Please enter a Client Name before printing.');
      return;
    }
    if (items.length === 0) {
      toast.error('Please add at least one component to the quotation list.');
      return;
    }

    try {
      await api.post('/quotations', {
        estimateNo,
        date: estimateDate,
        customerName,
        customerPhone,
        customerAddress,
        category,
        items,
        subTotal: totals.subTotal,
        totalGst: totals.totalGst,
        grandTotal: totals.grandTotal
      });
      fetchHistory();
      toast.success('Quotation archived to history!');
    } catch (err) {
      console.error('Auto-save before print failed:', err);
      toast.error('Failed to auto-save quotation to history.');
    }

    window.print();
  };

  const loadQuotation = (q) => {
    setEstimateNo(q.estimateNo);
    setEstimateDate(q.date);
    setCustomerName(q.customerName || '');
    setCustomerPhone(q.customerPhone || '');
    setCustomerAddress(q.customerAddress || '');
    setCategory(q.category || 'rooftop');
    setItems(q.items.map(item => ({
      name: item.name,
      hsn: item.hsn || '',
      qty: item.qty,
      unit: item.unit || 'Nos',
      price: item.price,
      gst: item.gst
    })));
    setViewMode('builder');
    toast.success(`Loaded Estimate #${q.estimateNo}`);
  };

  const deleteQuotation = async (id) => {
    if (!window.confirm('Are you sure you want to delete this quotation from history?')) return;
    try {
      await api.delete(`/quotations/${id}`);
      toast.success('Quotation deleted from history');
      fetchHistory();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete quotation');
    }
  };

  // Stock items dependency removed (fully editable custom mode)

  // Handle category change
  const handleCategoryChange = (cat) => {
    setCategory(cat);
  };

  // Handle cell edit
  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    if (field === 'price' || field === 'qty' || field === 'gst') {
      updated[index][field] = parseFloat(value) || 0;
    } else {
      updated[index][field] = value;
    }
    setItems(updated);
  };

  // Add empty row
  const addRow = () => {
    setItems([...items, { name: '', hsn: '', qty: 1, unit: 'Nos', price: 0, gst: 18 }]);
  };

  // Add item from inventory
  const addInventoryItem = (item) => {
    const newItem = {
      name: item.name,
      hsn: '',
      qty: 1,
      unit: item.unit || 'Nos',
      price: item.sellPrice || 0,
      gst: 18
    };
    setItems([...items, newItem]);
    toast.success(`Added "${item.name}" from inventory`);
  };

  // Add stock item function removed

  // Remove row
  const removeRow = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };



  // Calculations
  const calculateTotals = () => {
    let subTotal = 0;
    let totalGst = 0;
    const gstGroups = {};

    items.forEach(item => {
      const baseAmount = item.qty * item.price;
      const gstAmt = baseAmount * (item.gst / 100);
      subTotal += baseAmount;
      totalGst += gstAmt;

      // Group by GST rate for CGST/SGST breakdown
      const rate = item.gst;
      if (!gstGroups[rate]) {
        gstGroups[rate] = 0;
      }
      gstGroups[rate] += baseAmount;
    });

    const grandTotal = subTotal + totalGst;

    return {
      subTotal,
      totalGst,
      grandTotal,
      gstGroups
    };
  };

  const totals = calculateTotals();

  // Filtered stock items helper removed

  return (
    <Layout module="crm">
      {/* CSS Print Styles */}
      <style>{`
        @page {
          size: A4;
          margin: 0;
        }
        @media print {
          /* Hide all non-printable elements */
          header, aside, .no-print {
            display: none !important;
          }
          
          /* Reset layout constraints for printing to fill the page */
          html, body, #root, div[class*="h-screen"], main, .print-invoice-wrapper {
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
            position: static !important;
            background: white !important;
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
          }

          #print-invoice, #print-invoice * {
            visibility: visible !important;
          }

          #print-invoice {
            display: block !important;
            position: relative !important;
            width: 100% !important;
            max-width: 100% !important;
            min-height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            color: #000 !important;
            background: white !important;
            box-sizing: border-box !important;
          }
          /* Remove borders & backgrounds for input style pre-views */
          input, textarea, select {
            border: none !important;
            outline: none !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            width: auto !important;
            appearance: none;
            -moz-appearance: none;
            -webkit-appearance: none;
          }
          .badge-print {
            border: none !important;
            background: transparent !important;
            color: #000 !important;
          }
          /* Ensure header colors print accurately */
          .print-header-bg {
            background-color: ${ACCENT_COLOR} !important;
            color: #ffffff !important;
            padding-top: 6mm !important;
            padding-bottom: 2mm !important;
            padding-left: 12mm !important;
            padding-right: 12mm !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-dark-bg {
            background-color: ${DARK_GRAY} !important;
            color: #ffffff !important;
            padding-top: 3mm !important;
            padding-bottom: 3mm !important;
            padding-left: 12mm !important;
            padding-right: 12mm !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .table-header-print {
            background-color: ${ACCENT_COLOR} !important;
            color: #ffffff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-border-accent {
            border-color: ${ACCENT_COLOR} !important;
          }

          /* Spacing compression overrides to force everything onto a single page */
          #print-invoice table th, #print-invoice table td {
            padding-top: 1.2mm !important;
            padding-bottom: 1.2mm !important;
          }
          #print-invoice .mt-6 {
            margin-top: 3mm !important;
          }
          #print-invoice .mb-6 {
            margin-bottom: 3mm !important;
          }
          #print-invoice .mt-8 {
            margin-top: 3mm !important;
          }
          #print-invoice .pt-4 {
            padding-top: 2mm !important;
          }
          .print-content-wrapper {
            margin-top: 3mm !important;
            padding-bottom: 2mm !important;
          }
          #print-invoice .pb-6 {
            padding-bottom: 3mm !important;
          }
          #print-invoice .gap-6 {
            gap: 3mm !important;
          }
          #print-invoice .mt-12 {
            margin-top: 4mm !important;
          }
        }
      `}</style>

      <div className="no-print p-6 max-w-7xl mx-auto">
        {/* Back and Page Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 text-sm font-medium hover:bg-gray-50 transition"
              style={{ cursor: 'pointer' }}
            >
              <ChevronLeft size={16} /> Admin Panel
            </button>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                <FileText className="text-brand-500" /> Admin Quotation Creator
              </h1>
              <p className="text-sm text-gray-500">Generate, customize, save and print Estimates/Proformas</p>
            </div>
          </div>
          
          {viewMode === 'builder' && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveQuotation}
                style={{
                  background: '#1f2937',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  borderRadius: '12px',
                  fontWeight: 'bold',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(31, 41, 55, 0.15)',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#111827'}
                onMouseLeave={e => e.currentTarget.style.background = '#1f2937'}
              >
                <Save size={16} /> Save to History
              </button>
              <button
                onClick={handlePrintQuotation}
                className="btn-primary"
                style={{
                  background: '#f7941d',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  borderRadius: '12px',
                  fontWeight: 'bold',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(247, 148, 29, 0.3)',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#e07800'}
                onMouseLeave={e => e.currentTarget.style.background = '#f7941d'}
              >
                <Printer size={16} /> Print / Save PDF
              </button>
            </div>
          )}
        </div>

        {/* Header Tabs: Builder vs History */}
        <div className="flex border-b border-gray-100 mb-6 gap-6">
          <button
            onClick={() => setViewMode('builder')}
            className={`pb-3 font-bold text-sm border-b-2 transition ${viewMode === 'builder' ? 'border-brand-500 text-brand-600 font-extrabold' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            style={{ background: 'transparent', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer' }}
          >
            Quotation Builder
          </button>
          <button
            onClick={() => setViewMode('history')}
            className={`pb-3 font-bold text-sm border-b-2 transition ${viewMode === 'history' ? 'border-brand-500 text-brand-600 font-extrabold' : 'border-transparent text-gray-500 hover:text-gray-700'} flex items-center gap-1.5`}
            style={{ background: 'transparent', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer' }}
          >
            <History size={15} /> Saved History ({history.length})
          </button>
        </div>

        {viewMode === 'builder' && (
          <>
            {/* ── Configuration Form (No Print) ── */}
            <div className="mb-8">
          
          {/* Customer Details Form */}
          <div className="w-full bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-50 pb-3">
              <h3 className="font-bold text-gray-800 text-base">Customer & Estimate Information</h3>
              
              {/* Three Category Selector */}
              <div style={{ display: 'flex', gap: 6, background: '#f3f4f6', padding: 4, borderRadius: 12, border: '1px solid #e2e8f0', minWidth: '320px' }}>
                {['rooftop', 'pump', 'chakki'].map(cat => {
                  const active = category === cat;
                  const label = cat === 'rooftop' ? 'Rooftop Solar' : cat === 'pump' ? 'Water Pump' : 'Chakki';
                  return (
                    <button
                      key={cat}
                      onClick={() => handleCategoryChange(cat)}
                      style={{
                        flex: 1,
                        padding: '6px 12px',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        fontSize: '0.72rem',
                        borderRadius: 8,
                        transition: 'all 0.15s',
                        border: 'none',
                        cursor: 'pointer',
                        background: active ? '#f7941d' : 'transparent',
                        color: active ? '#ffffff' : '#4b5563',
                        boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                      }}
                      onMouseEnter={e => { if(!active) e.currentTarget.style.background = '#e2e8f0'; }}
                      onMouseLeave={e => { if(!active) e.currentTarget.style.background = 'transparent'; }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Client Name *</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  placeholder="e.g John Doe"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Client Contact / Phone</label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  placeholder="e.g. 1234567890"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Installation Address</label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  placeholder="e.g. 123 Main Street, Anytown, USA"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Estimate / Performa No.</label>
                <input
                  type="text"
                  value={estimateNo}
                  onChange={(e) => setEstimateNo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Invoice Date</label>
                <input
                  type="text"
                  value={estimateDate}
                  onChange={(e) => setEstimateDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-500"
                  placeholder="DD-MM-YYYY"
                />
              </div>
            </div>
          </div>        </div>

        {/* ── Editable Item Table (No Print) ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm mb-8 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h3 className="font-bold text-gray-800 text-base">Quotation Components List</h3>
            <div className="flex flex-wrap items-center gap-2">
              {/* Search Inventory Dropdown */}
              <div className="relative">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 text-xs">
                  <Search size={14} className="text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search inventory..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                    className="border-none outline-none text-xs bg-transparent w-36 focus:ring-0 focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="text-gray-400 hover:text-gray-600 border-none bg-transparent cursor-pointer p-0"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {showDropdown && (
                  <div className="absolute right-0 mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                    {stockItems
                      .filter(item => 
                        item.name.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map(item => (
                        <button
                          key={item._id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault(); // Prevents input blur before click registers
                            addInventoryItem(item);
                            setSearchQuery('');
                            setShowDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-orange-50/50 flex flex-col gap-0.5 border-b border-gray-100 last:border-0 transition"
                          style={{ borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer' }}
                        >
                          <span className="font-bold text-xs text-gray-800">{item.name}</span>
                          <span className="text-[10px] text-gray-500 flex justify-between w-full">
                            <span>Price: ₹{item.sellPrice?.toLocaleString('en-IN')}</span>
                            <span>Stock: {item.quantity} {item.unit}</span>
                          </span>
                        </button>
                      ))}
                    {stockItems.filter(item => 
                      item.name.toLowerCase().includes(searchQuery.toLowerCase())
                    ).length === 0 && (
                      <div className="p-3 text-center text-xs text-gray-400 italic">
                        No matching items in inventory
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Clear all components from the quotation?')) {
                    setItems([]);
                  }
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50 transition"
                style={{ cursor: 'pointer', background: 'transparent' }}
              >
                <Trash2 size={12} /> Clear All
              </button>

              <button
                type="button"
                onClick={addRow}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  background: '#111827', // Dark Gray/Black
                  color: '#ffffff',
                  fontSize: '0.78rem',
                  fontWeight: 'bold',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#1f2937'}
                onMouseLeave={e => e.currentTarget.style.background = '#111827'}
              >
                <Plus size={14} /> Add Row
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 text-xs font-bold uppercase tracking-wider">
                  <th className="py-3 px-2 w-[5%]">S.No.</th>
                  <th className="py-3 px-2 w-[40%]">Item Name / Description</th>
                  <th className="py-3 px-2 w-[10%]">HSN/SAC</th>
                  <th className="py-3 px-2 w-[8%] text-center">Qty</th>
                  <th className="py-3 px-2 w-[8%]">Unit</th>
                  <th className="py-3 px-2 w-[12%]">Rate (₹)</th>
                  <th className="py-3 px-2 w-[8%]">GST %</th>
                  <th className="py-3 px-2 w-[12%] text-right">Amt (GST Incl)</th>
                  <th className="py-3 px-2 w-[5%] text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item, idx) => {
                  const base = item.qty * item.price;
                  const gstVal = base * (item.gst / 100);
                  const total = base + gstVal;
                  return (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="py-2.5 px-2 font-bold text-gray-400">{idx + 1}</td>
                      <td className="py-2.5 px-2">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-100 rounded focus:border-brand-500 focus:outline-none text-sm font-medium"
                          placeholder="Component Description"
                        />
                      </td>
                      <td className="py-2.5 px-2">
                        <input
                          type="text"
                          value={item.hsn}
                          onChange={(e) => handleItemChange(idx, 'hsn', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-100 rounded focus:border-brand-500 focus:outline-none text-sm"
                          placeholder="e.g. 8504"
                        />
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <input
                          type="number"
                          value={item.qty}
                          onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                          className="w-16 px-1.5 py-1 border border-gray-100 rounded focus:border-brand-500 focus:outline-none text-center text-sm font-semibold"
                          min="1"
                        />
                      </td>
                      <td className="py-2.5 px-2">
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                          className="w-16 px-1.5 py-1 border border-gray-100 rounded focus:border-brand-500 focus:outline-none text-sm"
                          placeholder="Nos / Sets"
                        />
                      </td>
                      <td className="py-2.5 px-2">
                        <input
                          type="number"
                          value={item.price}
                          onChange={(e) => handleItemChange(idx, 'price', e.target.value)}
                          className="w-24 px-2 py-1 border border-gray-100 rounded focus:border-brand-500 focus:outline-none text-sm font-semibold"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="py-2.5 px-2">
                        <select
                          value={item.gst}
                          onChange={(e) => handleItemChange(idx, 'gst', e.target.value)}
                          className="w-16 px-1 py-1 border border-gray-100 rounded focus:border-brand-500 focus:outline-none text-sm font-semibold"
                        >
                          <option value={0}>0%</option>
                          <option value={5}>5%</option>
                          <option value={12}>12%</option>
                          <option value={18}>18%</option>
                          <option value={28}>28%</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-2 text-right font-bold text-gray-800">
                        {fmt(total)}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <button
                          onClick={() => removeRow(idx)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded transition"
                          title="Delete Row"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {items.length === 0 && (
            <div className="py-12 text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-200 my-4 flex flex-col items-center justify-center">
              <FileText size={48} className="text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium mb-4">No components added to this quotation yet.</p>
              <button
                type="button"
                onClick={addRow}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 20px',
                  borderRadius: '12px',
                  background: '#f7941d', // Brand orange
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(247, 148, 29, 0.25)',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#e07800'}
                onMouseLeave={e => e.currentTarget.style.background = '#f7941d'}
              >
                <Plus size={16} /> Add First Component
              </button>
            </div>
          )}
        </div>
        </>
        )}

        {viewMode === 'history' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm mb-8 overflow-hidden">
            <h3 className="font-bold text-gray-800 text-base mb-4 border-b border-gray-50 pb-2">Saved Quotation Records</h3>
            {history.length === 0 ? (
              <div className="py-12 text-center">
                <FileText size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium mb-4">No quotations have been saved to history yet.</p>
                <button
                  type="button"
                  onClick={() => setViewMode('builder')}
                  className="btn-primary"
                  style={{ background: '#f7941d', color: '#fff', padding: '10px 20px', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
                >
                  Create Your First Quotation
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 text-xs font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Est No.</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Customer Details</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-right">Grand Total</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {history.map((q) => (
                      <tr key={q._id} className="hover:bg-gray-50/50">
                        <td className="py-3 px-4 font-bold text-gray-700">#{q.estimateNo}</td>
                        <td className="py-3 px-4 text-gray-500">{q.date}</td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-gray-900">{q.customerName}</div>
                          {q.customerPhone && <div className="text-xs text-gray-400">{q.customerPhone}</div>}
                          {q.customerAddress && <div className="text-xs text-gray-400 truncate max-w-[200px]" title={q.customerAddress}>{q.customerAddress}</div>}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                            q.category === 'rooftop' 
                              ? 'bg-amber-50 text-amber-600 border border-amber-100' 
                              : q.category === 'pump' 
                              ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                              : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                          }`}>
                            {q.category === 'rooftop' ? 'Solar' : q.category === 'pump' ? 'Pump' : 'Chakki'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-black text-gray-900">
                          ₹{q.grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => loadQuotation(q)}
                              className="px-2.5 py-1 rounded bg-brand-50 text-brand-600 hover:bg-brand-100 text-xs font-bold transition"
                              style={{ border: 'none', cursor: 'pointer' }}
                            >
                              Load & Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteQuotation(q._id)}
                              className="p-1 rounded text-red-500 hover:bg-red-50 hover:text-red-700 transition"
                              style={{ border: 'none', cursor: 'pointer' }}
                              title="Delete Record"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── High-Fidelity Printable Estimate Sheet ── */}
      {viewMode === 'builder' && (
        <div className="flex justify-center bg-gray-50 pb-16 print-invoice-wrapper">
          <div
          id="print-invoice"
          className="bg-white w-[210mm] min-h-[297mm] shadow-lg border border-gray-200/50 mx-auto text-black font-sans relative"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          {/* Header Graphic Section (Rising Solar Energy letterhead mockup) - full bleed */}
          <div className="relative pb-2">
            
            {/* Top red header banner */}
            <div className="print-header-bg text-white px-4 py-2 flex items-center justify-between" style={{ backgroundColor: ACCENT_COLOR, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '10px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                <span>📞 {'7233050533'}</span>
                <span>✉️ risingsolarenergyup@gmail.com</span>
              </div>
              <div style={{ fontSize: '10px', fontWeight: 'bold', textAlign: 'right', lineHeight: '1.3', maxWidth: '60%' }}>
                OFFICE ADD: 12 A Rajendra Nagar Naubasta Kanpur 208021
              </div>
            </div>

            {/* Main title block - merged with top banner (no mt-1 gap) */}
            <div className="print-dark-bg text-white px-4 py-3 flex items-center justify-between shadow-sm" style={{ backgroundColor: DARK_GRAY }}>
              <div className="flex items-center gap-3">
                <img
                  src={logo}
                  alt="Solarji"
                  className="w-14 h-14 rounded-lg object-contain bg-white p-1 border border-white/10"
                  onError={(e) => { e.target.src = 'https://placehold.co/56x56?text=RSE'; }}
                />
                <div>
                  <h2 className="text-lg md:text-xl font-black tracking-tight leading-none">RISING SOLAR ENERGY</h2>
                  <p className="text-[9px] text-gray-300 mt-1 uppercase font-bold tracking-wider">GSTIN: <span className="text-yellow-400">09CWZPS4610R1Z8</span> · State: 09-Uttar Pradesh</p>
                </div>
              </div>
              
              <div className="text-right">
                <h1 className="text-xl md:text-2xl font-black italic tracking-wider leading-none text-white/95">Estimate\Performa</h1>
                <p className="text-[11px] text-yellow-400 font-bold uppercase tracking-wider mt-1.5 font-sans">
                  Product: {category === 'rooftop' ? 'Rooftop Solar' : category === 'pump' ? 'Water Pump' : category === 'chakki' ? 'Chakki' : category}
                </p>
                <p className="text-[10px] text-gray-300 font-semibold mt-1">Estimate No. {estimateNo}</p>
              </div>
            </div>

          </div>

          {/* Elegant padded content wrapper for internal elements */}
          <div className="px-[12mm] pb-[12mm] mt-6 print-content-wrapper">
            <div className="flex justify-between items-end text-xs mb-6">
              <div>
                <p className="text-gray-500 font-bold uppercase tracking-wider text-[10px] mb-1">Estimate For:</p>
                <p className="font-extrabold text-base text-gray-900">{customerName || '—'}</p>
                <p className="text-gray-600 mt-0.5">{customerAddress || '—'}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-500 font-bold uppercase tracking-wider text-[10px] mb-0.5">Date:</p>
                <p className="font-bold text-gray-800">{estimateDate}</p>
              </div>
            </div>

          {/* Items Table */}
          <table className="w-full text-xs text-left border-collapse mb-6">
            <thead>
              <tr className="print-header-bg text-white text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: ACCENT_COLOR }}>
                <th className="py-2.5 px-3 text-center rounded-l-md w-[5%]">S.No.</th>
                <th className="py-2.5 px-3 w-[45%]">Item Name / Description</th>
                <th className="py-2.5 px-2 text-center w-[12%]">HSN/SAC</th>
                <th className="py-2.5 px-2 text-center w-[8%]">Qty</th>
                <th className="py-2.5 px-2 text-center w-[8%]">Unit</th>
                <th className="py-2.5 px-2 text-right w-[10%]">Price / Unit</th>
                <th className="py-2.5 px-2 text-center w-[10%]">GST</th>
                <th className="py-2.5 px-3 text-right rounded-r-md w-[12%]">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const baseAmount = item.qty * item.price;
                const gstAmount = baseAmount * (item.gst / 100);
                const itemTotal = baseAmount + gstAmount;
                return (
                  <tr key={idx} className="border-b border-gray-100 even:bg-gray-50/40 hover:bg-gray-50/20">
                    <td className="py-2.5 px-3 text-center font-bold text-gray-500">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-semibold text-gray-800 leading-tight">{item.name || '—'}</td>
                    <td className="py-2.5 px-2 text-center text-gray-600 font-mono">{item.hsn || '—'}</td>
                    <td className="py-2.5 px-2 text-center font-bold text-gray-800">{item.qty}</td>
                    <td className="py-2.5 px-2 text-center text-gray-600">{item.unit || '—'}</td>
                    <td className="py-2.5 px-2 text-right font-mono text-gray-700">{fmt(item.price)}</td>
                    <td className="py-2.5 px-2 text-center leading-tight">
                      <span className="font-mono text-gray-700">{fmt(gstAmount)}</span>
                      <span className="block text-[8px] text-gray-500 font-bold">({item.gst}%)</span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-black font-mono text-gray-900">{fmt(itemTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-brand-500 font-bold bg-gray-50/50 text-gray-800">
                <td colSpan="3" className="py-3 px-3 uppercase tracking-wider text-[10px] text-gray-500">Total Summary</td>
                <td className="py-3 px-2 text-center font-black text-gray-900">
                  {items.reduce((sum, item) => sum + item.qty, 0)}
                </td>
                <td colSpan="3" className="py-3 px-2"></td>
                <td className="py-3 px-3 text-right font-black font-mono text-gray-900 text-sm">
                  {fmt(totals.grandTotal)}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Amount In Words */}
          <div className="border border-gray-300 rounded-lg p-2.5 mb-6 text-xs bg-gray-50/50">
            <span className="font-bold text-gray-700">Amount in Words:</span>{' '}
            <span className="font-extrabold italic text-gray-900">{numWords(totals.grandTotal)}</span>
          </div>

          {/* Tax Breakdown & Final Summary Side-by-Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            
            {/* GST Splits */}
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <div className="bg-gray-100 py-1.5 px-3 border-b border-gray-300 text-[10px] font-bold uppercase tracking-wider text-gray-700">
                GST Rate Breakdown
              </div>
              <table className="w-full text-[10px] border-collapse">
                <thead>
                  <tr className="border-b border-gray-300 text-gray-500 font-semibold bg-gray-50">
                    <th className="py-1 px-3 text-left">GST Rate</th>
                    <th className="py-1 px-2 text-right">Taxable Value</th>
                    <th className="py-1 px-2 text-right">CGST</th>
                    <th className="py-1 px-3 text-right">SGST</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {Object.keys(totals.gstGroups).map((rateStr) => {
                    const rate = parseFloat(rateStr);
                    const baseAmt = totals.gstGroups[rateStr];
                    const halfRate = rate / 2;
                    const halfTax = baseAmt * (halfRate / 100);
                    return (
                      <tr key={rateStr} className="font-mono">
                        <td className="py-1.5 px-3 font-sans font-bold text-gray-700">{rate}%</td>
                        <td className="py-1.5 px-2 text-right">{fmt(baseAmt)}</td>
                        <td className="py-1.5 px-2 text-right">{fmt(halfTax)} <span className="text-[7px] text-gray-400 block font-sans font-semibold">({halfRate.toFixed(1)}%)</span></td>
                        <td className="py-1.5 px-3 text-right">{fmt(halfTax)} <span className="text-[7px] text-gray-400 block font-sans font-semibold">({halfRate.toFixed(1)}%)</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Final Subtotal Blocks */}
            <div className="border border-gray-300 rounded-lg overflow-hidden flex flex-col font-mono text-xs">
              <div className="flex justify-between py-2 px-3 border-b border-gray-200 bg-gray-50/50">
                <span className="font-bold text-gray-600 font-sans">Sub Total:</span>
                <span className="font-bold text-gray-900">{fmt(totals.subTotal)}</span>
              </div>
              
              {/* Output individual taxes in summary */}
              {Object.keys(totals.gstGroups).map((rateStr) => {
                const rate = parseFloat(rateStr);
                if (rate === 0) return null;
                const baseAmt = totals.gstGroups[rateStr];
                const halfRate = rate / 2;
                const halfTax = baseAmt * (halfRate / 100);
                return (
                  <div key={rateStr} className="flex flex-col border-b border-gray-100">
                    <div className="flex justify-between py-1.5 px-3 text-[10px]">
                      <span className="text-gray-500 font-sans">SGST@{halfRate.toFixed(1)}% on {fmt(baseAmt)}:</span>
                      <span className="text-gray-700">{fmt(halfTax)}</span>
                    </div>
                    <div className="flex justify-between py-1.5 px-3 text-[10px]">
                      <span className="text-gray-500 font-sans">CGST@{halfRate.toFixed(1)}% on {fmt(baseAmt)}:</span>
                      <span className="text-gray-700">{fmt(halfTax)}</span>
                    </div>
                  </div>
                );
              })}

              <div className="flex justify-between py-2.5 px-3 bg-red-50/30 print-header-bg text-white" style={{ backgroundColor: ACCENT_COLOR }}>
                <span className="font-black uppercase tracking-wider font-sans">Grand Total:</span>
                <span className="font-black text-sm">{fmt(totals.grandTotal)}</span>
              </div>
            </div>

          </div>

          {/* Bank Details & Terms & Signature */}
          <div className="mt-8 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-6 text-[10px] text-gray-500">
            
            {/* Left Section: Bank details and Terms */}
            <div className="space-y-4">
              {/* Bank Details Card */}
              <div className="border border-gray-200 rounded-lg p-3 bg-gray-50/30">
                <p className="font-bold text-gray-800 text-[11px] mb-1.5 uppercase tracking-wider flex items-center gap-1">
                  🏦 Bank Account Details
                </p>
                <div className="space-y-1 text-gray-600">
                  <div className="flex" style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ width: '85px', minWidth: '85px', fontWeight: '500', color: '#6b7280' }}>Beneficiary:</span>
                    <span style={{ fontWeight: 'bold', color: '#1f2937' }}>Rising Solar Energy</span>
                  </div>
                  <div className="flex" style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ width: '85px', minWidth: '85px', fontWeight: '500', color: '#6b7280' }}>Bank Name:</span>
                    <span style={{ fontWeight: 'bold', color: '#1f2937' }}>Bank of India</span>
                  </div>
                  <div className="flex" style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ width: '85px', minWidth: '85px', fontWeight: '500', color: '#6b7280' }}>Account No.:</span>
                    <span style={{ fontWeight: 'bold', color: '#111827', fontFamily: 'monospace' }}>733020110000286</span>
                  </div>
                  <div className="flex" style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ width: '85px', minWidth: '85px', fontWeight: '500', color: '#6b7280' }}>IFSC Code:</span>
                    <span style={{ fontWeight: 'bold', color: '#111827', fontFamily: 'monospace' }}>BKID0007330</span>
                  </div>
                </div>
              </div>

              {/* Terms & Conditions */}
              <div>
                <p className="font-bold text-gray-700 mb-1 uppercase tracking-wider text-[9px]">Terms & Conditions:</p>
                <ul className="list-disc pl-4 space-y-0.5 text-gray-500">
                  <li>GST rates are subject to change as per government norms.</li>
                  <li>Validity of this estimate is 15 days from the date of issue.</li>
                  <li>Delivery within 2-3 weeks after receipt of advance payment.</li>
                </ul>
              </div>
            </div>

            {/* Right Section: Signature block */}
            <div className="text-right flex flex-col justify-end items-end h-full pb-2">
              <img
                src={signature}
                alt="Signature Stamp"
                className="h-16 object-contain mb-1"
                style={{ mixBlendMode: 'multiply' }}
              />
              {/* <p className="font-bold text-gray-800 text-[11px]">For Rising Solar Energy</p> */}
              {/* <p className="text-[9px] text-gray-400 mt-0.5">Authorized Signatory</p> */}
            </div>
          </div>
        </div>
        </div>
      </div>
      )}
    </Layout>
  );
}
