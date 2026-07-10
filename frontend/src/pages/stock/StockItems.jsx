import { useState, useEffect, useCallback } from 'react';
import { Package, Plus, Edit2, Trash2, X, Search, Printer } from 'lucide-react';
import api from '../../api/axios';
import Layout from '../../components/Layout';
import PaginationBar from '../../components/PaginationBar';
import toast from 'react-hot-toast';
import { showApiError } from '../../utils/apiError';
import { useAuth } from '../../context/AuthContext';
import { useDataCache } from '../../context/DataCacheContext';

const ORANGE = '#f7941d';
const PAGE_SIZE = 20;

function buildPrintHtml(items, now) {
  const lowStock = items.filter(i => i.minQuantity > 0 && i.quantity <= i.minQuantity);
  const rows = items.map((item, i) => {
    const isLow = item.minQuantity > 0 && item.quantity <= item.minQuantity;
    return `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${item.name}</strong>${item.description ? `<br /><span style="font-size: 10px; color: #888">${item.description}</span>` : ''}</td>
        <td><span class="cat">${item.category}</span></td>
        <td>${item.unit}</td>
        <td>₹${item.purchasePrice?.toLocaleString('en-IN')}</td>
        <td>₹${item.sellPrice?.toLocaleString('en-IN')}</td>
        <td class="${isLow ? 'low' : 'ok'}">${item.quantity}</td>
        <td>${item.minQuantity}</td>
        <td class="${isLow ? 'low' : 'ok'}">${isLow ? '⚠ Low Stock' : '✓ OK'}</td>
      </tr>`;
  }).join('');

  return `
    <div class="header">
      <div>
        <div class="brand">SolarJi</div>
        <div style="font-size: 11px; color: #666; margin-top: 2px">Stock Inventory Report</div>
      </div>
      <div style="text-align: right">
        <div style="font-size: 11px; color: #666">Generated: ${now}</div>
        <div style="font-size: 11px; color: #666">Total Items: ${items.length}</div>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>#</th><th>Item Name</th><th>Category</th><th>Unit</th>
          <th>Purchase Price</th><th>Sell Price</th><th>Qty In Stock</th><th>Min Qty</th><th>Status</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr>
          <td colspan="6" style="text-align: right">TOTAL ITEMS IN REPORT:</td>
          <td colspan="3">${items.length} items &nbsp;|&nbsp; ${lowStock.length} low stock</td>
        </tr>
      </tfoot>
    </table>`;
}

export default function StockItems() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [lowStock, setLowStock] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const { canManageStockItems } = useAuth();
  const { fetchDashboardStock, invalidateDashboardStock } = useDataCache();

  const emptyForm = { name: '', description: '', category: 'Solar Panel', unit: 'piece', purchasePrice: '', sellPrice: '', quantity: '', minQuantity: 0 };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const refreshLowStock = useCallback(async () => {
    const data = await fetchDashboardStock({ force: true });
    if (data?.lowStock) setLowStock(data.lowStock);
  }, [fetchDashboardStock]);

  useEffect(() => {
    refreshLowStock();
  }, [refreshLowStock]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/stock/items', {
        params: { page, limit: PAGE_SIZE, search: debouncedSearch || undefined },
      });
      setItems(res.data.items);
      setPagination(res.data.pagination);
    } catch (err) {
      showApiError(err, 'Could not load stock items.');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (item) => {
    setEditing(item);
    setForm({ name: item.name, description: item.description || '', category: item.category, unit: item.unit, purchasePrice: item.purchasePrice, sellPrice: item.sellPrice, quantity: item.quantity, minQuantity: item.minQuantity });
    setShowModal(true);
  };

  const afterMutation = () => {
    invalidateDashboardStock();
    loadItems();
    refreshLowStock();
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name) return toast.error('Item name required');
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/stock/items/${editing._id}`, form);
        toast.success('Item updated');
      } else {
        const res = await api.post('/stock/items', form);
        toast.success(res.status === 201 ? 'Item added' : 'Item reactivated');
      }
      setShowModal(false);
      afterMutation();
    } catch (err) { showApiError(err, 'Could not save stock item.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Deactivate "${name}"?`)) return;
    try {
      await api.delete(`/stock/items/${id}`);
      toast.success('Item deactivated');
      afterMutation();
    } catch (err) { showApiError(err, 'Could not deactivate stock item.'); }
  };

  const handlePrint = async () => {
    setPrinting(true);
    try {
      const res = await api.get('/stock/items', {
        params: { page: 1, limit: 500, search: debouncedSearch || undefined },
      });
      const printItems = res.data.items || [];
      const now = new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' });
      const printContent = buildPrintHtml(printItems, now);
      const win = window.open('', '_blank', 'width=900,height=700');
      win.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Stock Report — SolarJi</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 24px; }
              .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid ${ORANGE}; padding-bottom: 12px; }
              .brand { font-size: 22px; font-weight: 900; color: ${ORANGE}; }
              table { width: 100%; border-collapse: collapse; }
              thead tr { background: #111; color: #fff; }
              th { padding: 8px 10px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; }
              td { padding: 7px 10px; border-bottom: 1px solid #eee; font-size: 11.5px; }
              tr:nth-child(even) td { background: #fafafa; }
              .low { color: #d97706; font-weight: 700; }
              .ok { color: #059669; font-weight: 700; }
              .cat { background: #f3f4f6; padding: 2px 7px; border-radius: 10px; font-size: 10px; }
              tfoot td { font-weight: 700; border-top: 2px solid #111; padding-top: 10px; font-size: 12px; }
              @page { margin: 15mm; }
            </style>
          </head>
          <body>${printContent}</body>
        </html>
      `);
      win.document.close();
      setTimeout(() => { win.focus(); win.print(); win.close(); }, 300);
    } catch (err) {
      showApiError(err, 'Could not open print report.');
    } finally {
      setPrinting(false);
    }
  };

  const f = (field, val) => setForm(p => ({ ...p, [field]: val }));

  return (
    <Layout module="stock">
      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Stock Items</h1>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              disabled={printing}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:10, border:'1.5px solid #e5e7eb', background:'#fff', color:'#374151', fontWeight:600, fontSize:13, cursor:'pointer' }}
            >
              <Printer size={15} /> {printing ? 'Preparing…' : 'Print Stock'}
            </button>
            {canManageStockItems && (
              <button onClick={openCreate} className="btn-primary">
                <Plus className="w-4 h-4" /> Add Item
              </button>
            )}
          </div>
        </div>

        {lowStock.length > 0 && (
          <div style={{ background:'#fff7ed', border:'1.5px solid #fed7aa', borderRadius:12, padding:'10px 14px', marginBottom:16, display:'flex', alignItems:'center', gap:8, fontSize:13 }}>
            <span style={{ fontSize:16 }}>⚠️</span>
            <span style={{ color:'#92400e', fontWeight:600 }}>
              {lowStock.length} item{lowStock.length > 1 ? 's' : ''} below minimum stock:&nbsp;
              {lowStock.map(i => i.name).join(', ')}
            </span>
          </div>
        )}

        <div className="card mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="input pl-9" placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="card">
          {loading ? <div className="text-center py-12 text-gray-400">Loading...</div> : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-100">
                      {['Item Name', 'Category', 'Purchase Price', 'Sell Price', 'Quantity', 'Min Qty', ...(canManageStockItems ? ['Actions'] : [])].map(h => (
                        <th key={h} className="text-left py-3 px-3 font-semibold text-gray-600">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => {
                      const isLow = item.minQuantity > 0 && item.quantity <= item.minQuantity;
                      return (
                        <tr key={item._id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4 text-solar-400" />
                              <div>
                                <p className="font-medium text-gray-800">{item.name}</p>
                                {item.description && <p className="text-xs text-gray-400">{item.description}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3"><span className="badge bg-gray-100 text-gray-600">{item.category}</span></td>
                          <td className="py-3 px-3 text-gray-700">₹{item.purchasePrice?.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-3 text-gray-700 font-medium">₹{item.sellPrice?.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-3">
                            <span className={`font-semibold ${isLow ? 'text-orange-600' : 'text-gray-700'}`}>
                              {item.quantity} {item.unit}
                              {isLow && <span className="ml-1 text-xs">⚠</span>}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-gray-500">{item.minQuantity}</td>
                          {canManageStockItems && (
                            <td className="py-3 px-3">
                              <div className="flex gap-2">
                                <button onClick={() => openEdit(item)} className="btn-secondary p-1.5"><Edit2 className="w-3.5 h-3.5" /></button>
                                <button onClick={() => handleDelete(item._id, item.name)} className="btn-danger p-1.5"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                    {items.length === 0 && (
                      <tr><td colSpan={7} className="text-center py-12 text-gray-400">No items found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <PaginationBar
                pagination={pagination}
                page={page}
                onPageChange={setPage}
                loading={loading}
                label="items"
              />
            </>
          )}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-gray-900 text-lg">{editing ? 'Edit Item' : 'Add Stock Item'}</h3>
                <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="label">Item Name *</label>
                    <input className="input" required value={form.name} onChange={e => f('name', e.target.value)} placeholder="e.g. Solar Panel 400W" />
                  </div>
                  <div>
                    <label className="label">Category</label>
                    <select className="input" value={form.category} onChange={e => f('category', e.target.value)}>
                      {['Solar Panel', 'Inverter', 'Battery', 'Wire', 'Structure', 'ACDB/DCDB', 'Accessories', 'General'].map(c =>
                        <option key={c} value={c}>{c}</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="label">Unit</label>
                    <select className="input" value={form.unit} onChange={e => f('unit', e.target.value)}>
                      {['piece', 'meter', 'kg', 'set', 'pair', 'roll', 'box', 'packet'].map(u =>
                        <option key={u} value={u}>{u}</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="label">Purchase Price (₹)</label>
                    <input className="input" type="number" value={form.purchasePrice} onChange={e => f('purchasePrice', e.target.value)} placeholder="0" />
                  </div>
                  <div>
                    <label className="label">Sell Price (₹)</label>
                    <input className="input" type="number" value={form.sellPrice} onChange={e => f('sellPrice', e.target.value)} placeholder="0" />
                  </div>
                  <div>
                    <label className="label">Opening Quantity</label>
                    <input className="input" type="number" value={form.quantity} onChange={e => f('quantity', e.target.value)} placeholder="0" />
                  </div>
                  <div>
                    <label className="label">Min Quantity Alert</label>
                    <input className="input" type="number" value={form.minQuantity} onChange={e => f('minQuantity', e.target.value)} placeholder="0" />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Description</label>
                    <input className="input" value={form.description} onChange={e => f('description', e.target.value)} placeholder="Optional description" />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                  <button type="submit" className="btn-primary flex-1 justify-center" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Add Item'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
