import { useState, useEffect, useCallback } from 'react';
import {
  Layers, Plus, Trash2, Edit3, Copy, Printer, Package, Sun, Zap,
  CheckCircle2, Search, X, Loader2, IndianRupee, Eye, Wrench, ShieldAlert
} from 'lucide-react';
import api from '../../api/axios';
import Layout from '../../components/Layout';
import toast from 'react-hot-toast';
import { showApiError } from '../../utils/apiError';
import { useAuth } from '../../context/AuthContext';
import { formatQty } from '../../constants/voucherBill';

const ORANGE = '#f7941d';

const CATEGORIES = [
  'Solar Panel',
  'Inverter',
  'Structure',
  'Wire/Cable',
  'ACDB/DCDB',
  'Earthing & Lightning',
  'Accessories',
  'BOS',
  'Battery',
  'General',
];

const categoryColors = {
  'Solar Panel': 'bg-amber-100 text-amber-800 border-amber-200',
  'Inverter': 'bg-blue-100 text-blue-800 border-blue-200',
  'Structure': 'bg-orange-100 text-orange-800 border-orange-200',
  'Wire/Cable': 'bg-purple-100 text-purple-800 border-purple-200',
  'ACDB/DCDB': 'bg-teal-100 text-teal-800 border-teal-200',
  'Earthing & Lightning': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Accessories': 'bg-slate-100 text-slate-800 border-slate-200',
  'BOS': 'bg-zinc-100 text-zinc-800 border-zinc-200',
  'Battery': 'bg-red-100 text-red-800 border-red-200',
  'General': 'bg-gray-100 text-gray-800 border-gray-200',
};

function emptyGroupItem() {
  return {
    item: '',
    itemName: '',
    category: 'General',
    quantity: 1,
    unit: 'piece',
    price: 0,
    notes: '',
  };
}

function buildBomPrintHtml(group, now) {
  const totalQty = (group.items || []).reduce((acc, i) => acc + (Number(i.quantity) || 0), 0);
  const totalCost = (group.items || []).reduce((acc, i) => acc + ((Number(i.quantity) || 0) * (Number(i.price) || 0)), 0);

  const rows = (group.items || []).map((it, idx) => `
    <tr>
      <td style="text-align: center; vertical-align: top;">${idx + 1}</td>
      <td style="vertical-align: top;">
        <strong>${it.itemName}</strong>
        ${it.notes ? `<div style="font-size: 10px; color: #6b7280; margin-top: 2px;">${it.notes}</div>` : ''}
      </td>
      <td style="vertical-align: top; white-space: nowrap;">
        <span style="display: inline-block; padding: 2px 7px; border-radius: 4px; font-size: 10px; font-weight: 700; background: #f3f4f6; color: #374151;">
          ${it.category || 'General'}
        </span>
      </td>
      <td style="text-align: center; vertical-align: top; font-weight: 700;">${formatQty(it.quantity)}</td>
      <td style="text-align: center; vertical-align: top; color: #555;">${it.unit || 'piece'}</td>
      <td style="text-align: right; vertical-align: top;">₹${(Number(it.price) || 0).toLocaleString('en-IN')}</td>
      <td style="text-align: right; vertical-align: top; font-weight: 700; color: #ea580c;">
        ₹${((Number(it.quantity) || 0) * (Number(it.price) || 0)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
      </td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>BOM — ${group.name} (${group.load}) — SolarJi</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 12px; color: #111; padding: 24px; background: #fff; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; border-bottom: 2px solid #f7941d; padding-bottom: 14px; }
          .brand { font-size: 24px; font-weight: 900; color: #111; }
          .brand span { color: #f7941d; }
          .title { font-size: 16px; font-weight: 800; text-transform: uppercase; color: #111; margin-top: 2px; }
          .meta-box { display: flex; flex-wrap: wrap; gap: 20px; background: #fff7ed; border: 1.5px solid #fed7aa; border-radius: 8px; padding: 12px 18px; margin-bottom: 16px; font-size: 12px; }
          .meta-box div { display: flex; gap: 6px; align-items: center; }
          .meta-box strong { color: #9a3412; }
          table { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 11.5px; }
          th { background: #f3f4f6; color: #374151; font-weight: 700; text-align: left; padding: 8px 10px; border: 1px solid #e5e7eb; font-size: 11px; text-transform: uppercase; }
          td { padding: 8px 10px; border: 1px solid #e5e7eb; }
          tr:nth-child(even) td { background: #fafafa; }
          tfoot td { background: #fff7ed; font-weight: 800; border-top: 2px solid #f7941d; padding: 10px; }
          .no-print { text-align: right; margin-bottom: 12px; }
          .btn-print { background: #f7941d; color: #fff; border: none; padding: 8px 18px; border-radius: 6px; font-weight: 700; font-size: 12px; cursor: pointer; }
          @page { size: A4 portrait; margin: 12mm 14mm 12mm 14mm; }
          @media print {
            .no-print { display: none !important; }
            body { padding: 0 !important; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="no-print">
          <button class="btn-print" onclick="window.print()">🖨️ Print / Save BOM as PDF</button>
        </div>
        <div class="header">
          <div>
            <div class="brand">Solar<span>Ji</span></div>
            <div class="title">Bill of Materials (BOM) — ${group.load}</div>
            <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">Solar Installation & Energy Solutions</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 11px; color: #4b5563;">Generated: ${now}</div>
            <div style="font-size: 12px; font-weight: 700; color: #ea580c; margin-top: 2px;">System Load: ${group.load} (${group.systemType || 'On-Grid'})</div>
          </div>
        </div>

        <div class="meta-box">
          <div><strong>Kit / Group Name:</strong> <span>${group.name}</span></div>
          <div><strong>Total Components:</strong> <span>${(group.items || []).length} items</span></div>
          <div><strong>Total Estimated Value:</strong> <span style="font-weight: 900; color: #ea580c;">₹${totalCost.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>
        </div>

        ${group.description ? `<p style="font-size: 11px; color: #555; margin-bottom: 12px; font-style: italic;">${group.description}</p>` : ''}

        <table>
          <thead>
            <tr>
              <th style="width: 35px; text-align: center;">#</th>
              <th>Component & Specification</th>
              <th style="width: 110px;">Category</th>
              <th style="width: 60px; text-align: center;">Qty</th>
              <th style="width: 60px; text-align: center;">Unit</th>
              <th style="width: 85px; text-align: right;">Rate (₹)</th>
              <th style="width: 100px; text-align: right;">Total (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="text-align: right; text-transform: uppercase;">GRAND TOTAL:</td>
              <td style="text-align: center;"><strong>${formatQty(totalQty)}</strong></td>
              <td></td>
              <td></td>
              <td style="text-align: right; color: #ea580c; font-size: 13px;">
                ₹${totalCost.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </td>
            </tr>
          </tfoot>
        </table>

        <div style="margin-top: 24px; padding-top: 14px; border-top: 1px dashed #d1d5db; font-size: 10.5px; color: #6b7280; display: flex; justify-content: space-between;">
          <span>SolarJi Inventory & Engineering Department</span>
          <span>Verified Component Specification Sheet</span>
        </div>

        <script>
          window.addEventListener('load', function() {
            setTimeout(function() { window.focus(); window.print(); }, 350);
          });
        </script>
      </body>
    </html>
  `;
}

export default function LoadGroups() {
  const { canManageStockItems } = useAuth();
  const [groups, setGroups] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedLoad, setSelectedLoad] = useState('ALL');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    load: '',
    systemType: 'On-Grid',
    description: '',
    items: [emptyGroupItem()],
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [groupsRes, itemsRes] = await Promise.all([
        api.get('/stock/groups'),
        api.get('/stock/items', { params: { picker: 1, limit: 1000 } }).catch(() => ({ data: { items: [] } })),
      ]);
      setGroups(groupsRes.data.groups || []);
      setStockItems(itemsRes.data.items || []);
    } catch (err) {
      showApiError(err, 'Could not load load groups.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreateModal = () => {
    setEditingId(null);
    setForm({
      name: '',
      load: '',
      systemType: 'On-Grid',
      description: '',
      items: [emptyGroupItem()],
    });
    setShowModal(true);
  };

  const openEditModal = (group) => {
    setEditingId(group._id);
    setForm({
      name: group.name,
      load: group.load,
      systemType: group.systemType || 'On-Grid',
      description: group.description || '',
      items: (group.items || []).length > 0
        ? group.items.map(i => ({
            item: i.item?._id || i.item || '',
            itemName: i.itemName,
            category: i.category || 'General',
            quantity: i.quantity,
            unit: i.unit || 'piece',
            price: i.price || 0,
            notes: i.notes || '',
          }))
        : [emptyGroupItem()],
    });
    setShowModal(true);
  };

  const handleDuplicate = (group) => {
    setEditingId(null);
    setForm({
      name: `${group.name} (Copy)`,
      load: group.load,
      systemType: group.systemType || 'On-Grid',
      description: group.description || '',
      items: (group.items || []).map(i => ({
        item: i.item?._id || i.item || '',
        itemName: i.itemName,
        category: i.category || 'General',
        quantity: i.quantity,
        unit: i.unit || 'piece',
        price: i.price || 0,
        notes: i.notes || '',
      })),
    });
    setShowModal(true);
    toast.success(`Duplicated ${group.name} into form`);
  };

  const handleDelete = async (group) => {
    if (!window.confirm(`Delete load grouping "${group.name}" (${group.load})?`)) return;
    try {
      await api.delete(`/stock/groups/${group._id}`);
      toast.success('Load grouping removed');
      loadData();
    } catch (err) {
      showApiError(err, 'Could not delete load group.');
    }
  };

  const handlePrintBom = (group) => {
    const now = new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' });
    const html = buildBomPrintHtml(group, now);
    const win = window.open('', '_blank', 'width=950,height=800');
    if (!win) {
      toast.error('Pop-up blocked. Please allow pop-ups to print BOM.');
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  // Form row helpers
  const handleItemSelect = (idx, stockItemId) => {
    const selectedItem = stockItems.find(i => i._id === stockItemId);
    const updated = [...form.items];
    if (selectedItem) {
      updated[idx] = {
        ...updated[idx],
        item: selectedItem._id,
        itemName: selectedItem.name,
        category: selectedItem.category || 'General',
        unit: selectedItem.unit || 'piece',
        price: selectedItem.sellPrice || selectedItem.purchasePrice || 0,
      };
    } else {
      updated[idx] = {
        ...updated[idx],
        item: '',
      };
    }
    setForm(p => ({ ...p, items: updated }));
  };

  const handleRowChange = (idx, field, val) => {
    const updated = [...form.items];
    updated[idx] = { ...updated[idx], [field]: val };
    setForm(p => ({ ...p, items: updated }));
  };

  const addRow = () => {
    setForm(p => ({ ...p, items: [...p.items, emptyGroupItem()] }));
  };

  const removeRow = (idx) => {
    if (form.items.length <= 1) {
      setForm(p => ({ ...p, items: [emptyGroupItem()] }));
      return;
    }
    setForm(p => ({ ...p, items: form.items.filter((_, i) => i !== idx) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.load.trim()) {
      return toast.error('Group Name and System Load (e.g. 3 kW) are required');
    }

    const validItems = form.items.filter(i => i.itemName.trim());
    if (validItems.length === 0) {
      return toast.error('Please add at least one component with a name');
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        load: form.load.trim(),
        systemType: form.systemType,
        description: form.description.trim(),
        items: validItems,
      };

      if (editingId) {
        await api.put(`/stock/groups/${editingId}`, payload);
        toast.success('Load grouping updated');
      } else {
        await api.post('/stock/groups', payload);
        toast.success('New load grouping created');
      }

      setShowModal(false);
      loadData();
    } catch (err) {
      showApiError(err, 'Could not save load group.');
    } finally {
      setSaving(false);
    }
  };

  // Filter groups
  const filteredGroups = groups.filter(g => {
    const matchesSearch =
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.load.toLowerCase().includes(search.toLowerCase()) ||
      (g.items || []).some(it => it.itemName.toLowerCase().includes(search.toLowerCase()));

    const matchesLoad = selectedLoad === 'ALL' || g.load.toUpperCase() === selectedLoad.toUpperCase();
    return matchesSearch && matchesLoad;
  });

  const uniqueLoads = Array.from(new Set(groups.map(g => g.load))).sort();

  return (
    <Layout module="stock">
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-orange-100 text-orange-600">
                <Layers className="w-5 h-5" />
              </div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Load Item Groupings (BOM Kits)</h1>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Pre-decided components & materials configured per load (e.g. 3 kW, 5 kW). Admin can manually customize kits for any load.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {canManageStockItems && (
              <button
                type="button"
                onClick={openCreateModal}
                className="btn-primary gap-2"
              >
                <Plus className="w-4 h-4" /> Create Load Group
              </button>
            )}
          </div>
        </div>

        {/* Informational banner */}
        <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-white border border-orange-200/80 rounded-2xl p-4 mb-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl mt-0.5">⚙️</span>
            <div>
              <h4 className="font-bold text-gray-900 text-sm">How Load Grouping Works:</h4>
              <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                Define the standard package of components (Panels, Inverter, Structure, Cables, ACDB, Earthing) for any load like <strong>3 kW, 5 kW, 2 kW</strong>.
                When adding leads, quotations, or sales vouchers, these decided components auto-fill with a single click!
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="badge bg-white text-orange-700 border border-orange-200 font-bold px-3 py-1 shadow-2xs">
              {groups.length} Configured Load Kits
            </span>
          </div>
        </div>

        {/* Filter bar */}
        <div className="card mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-1">Load Filter:</span>
            <button
              type="button"
              onClick={() => setSelectedLoad('ALL')}
              className={`btn text-xs font-bold ${selectedLoad === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
            >
              All Loads ({groups.length})
            </button>
            {uniqueLoads.map(ld => (
              <button
                key={ld}
                type="button"
                onClick={() => setSelectedLoad(ld)}
                className={`btn text-xs font-bold ${selectedLoad === ld ? 'btn-primary' : 'btn-secondary'}`}
              >
                {ld}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search components or load..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-9 text-xs"
            />
          </div>
        </div>

        {/* Group list */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-solar-500" />
            <p className="text-sm">Loading load component groupings…</p>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="card text-center py-16">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="font-bold text-gray-700 text-base">No load groupings found</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto mt-1 mb-4">
              {search ? 'No groups match your search criteria.' : 'Create your first load group (e.g. 3 kW Load) to define standard installation materials.'}
            </p>
            {canManageStockItems && (
              <button type="button" onClick={openCreateModal} className="btn-primary gap-2 inline-flex">
                <Plus className="w-4 h-4" /> Create Load Group
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredGroups.map(group => {
              const totalItemsQty = (group.items || []).reduce((acc, i) => acc + (Number(i.quantity) || 0), 0);
              const totalVal = (group.items || []).reduce((acc, i) => acc + ((Number(i.quantity) || 0) * (Number(i.price) || 0)), 0);

              return (
                <div key={group._id} className="card border border-gray-200/90 hover:border-orange-300 transition-all shadow-sm overflow-hidden">
                  {/* Group header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
                    <div className="flex items-start gap-3">
                      <span className="w-10 h-10 rounded-xl bg-orange-500 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-sm">
                        {group.load}
                      </span>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-black text-gray-900 text-lg">{group.name}</h3>
                          <span className="badge bg-orange-100 text-orange-800 font-bold border border-orange-200">
                            {group.systemType || 'On-Grid'}
                          </span>
                          <span className="badge bg-gray-100 text-gray-700">
                            {(group.items || []).length} Components
                          </span>
                        </div>
                        {group.description && (
                          <p className="text-xs text-gray-500 mt-1">{group.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
                      <div className="text-right mr-2 hidden md:block">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Estimated Kit Cost</span>
                        <span className="font-black text-orange-600 text-base">₹{totalVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handlePrintBom(group)}
                        className="btn-secondary text-xs gap-1.5"
                        title="Print Bill of Materials document"
                      >
                        <Printer className="w-3.5 h-3.5 text-gray-600" /> Print BOM
                      </button>
                      {canManageStockItems && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleDuplicate(group)}
                            className="btn-secondary text-xs gap-1.5"
                            title="Duplicate to create another load"
                          >
                            <Copy className="w-3.5 h-3.5 text-gray-600" /> Copy
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(group)}
                            className="btn-secondary text-xs gap-1.5"
                            title="Edit components"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-blue-600" /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(group)}
                            className="btn-danger p-2 text-xs"
                            title="Delete load grouping"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Components table */}
                  <div className="overflow-x-auto mt-4">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-100 text-gray-500 uppercase tracking-wider text-[11px]">
                          <th className="text-left py-2 px-3 font-bold w-10">#</th>
                          <th className="text-left py-2 px-3 font-bold">Component Name</th>
                          <th className="text-left py-2 px-3 font-bold">Category</th>
                          <th className="text-center py-2 px-3 font-bold">Decided Qty</th>
                          <th className="text-center py-2 px-3 font-bold">Unit</th>
                          <th className="text-right py-2 px-3 font-bold">Unit Price</th>
                          <th className="text-right py-2 px-3 font-bold">Total Amount</th>
                          <th className="text-left py-2 px-3 font-bold">Notes / Specs</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {(group.items || []).map((it, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/70 transition-colors">
                            <td className="py-2.5 px-3 text-gray-400 font-mono">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-bold text-gray-900 flex items-center gap-1.5">
                              {it.category === 'Solar Panel' ? <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" /> :
                               it.category === 'Inverter' ? <Zap className="w-3.5 h-3.5 text-blue-500 shrink-0" /> :
                               it.category === 'Structure' ? <Wrench className="w-3.5 h-3.5 text-orange-500 shrink-0" /> :
                               <Package className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                              <span>{it.itemName}</span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className={`badge text-[10px] font-bold border ${categoryColors[it.category] || categoryColors.General}`}>
                                {it.category}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-gray-800">
                              {formatQty(it.quantity)}
                            </td>
                            <td className="py-2.5 px-3 text-center text-gray-500">{it.unit || 'piece'}</td>
                            <td className="py-2.5 px-3 text-right text-gray-600 font-mono">
                              ₹{(Number(it.price) || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-gray-800 font-mono">
                              ₹{((Number(it.quantity) || 0) * (Number(it.price) || 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </td>
                            <td className="py-2.5 px-3 text-gray-400 italic text-[11px] max-w-xs truncate">
                              {it.notes || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-gray-200 bg-orange-50/40 font-bold">
                          <td colSpan={3} className="py-2.5 px-3 text-right uppercase text-gray-600">Total Decided Components:</td>
                          <td className="py-2.5 px-3 text-center text-orange-700">{formatQty(totalItemsQty)}</td>
                          <td colSpan={2} className="py-2.5 px-3 text-right uppercase text-gray-600">Total Estimated Kit:</td>
                          <td className="py-2.5 px-3 text-right text-orange-700 font-mono text-sm">
                            ₹{totalVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Create or Edit Load Group */}
        {showModal && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-3 sm:p-6"
            role="dialog"
            aria-modal="true"
            onClick={() => setShowModal(false)}
          >
            <div
              className="bg-white w-full max-w-4xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/80">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-orange-100 text-orange-600">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">
                      {editingId ? 'Edit Load Grouping' : 'Create Load Grouping'}
                    </h3>
                    <p className="text-xs text-gray-500">
                      Configure standard components for this load size (e.g. 3 kW, 5 kW, 2 kW)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal body */}
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="label">Group Name *</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. 3 kW On-Grid Standard Load"
                      value={form.name}
                      onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <label className="label">System Load / Capacity *</label>
                    <input
                      type="text"
                      className="input font-bold text-orange-600"
                      placeholder="e.g. 3 kW, 3 kWh, 5 kW"
                      value={form.load}
                      onChange={e => setForm(p => ({ ...p, load: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <label className="label">System Type</label>
                    <select
                      className="input"
                      value={form.systemType}
                      onChange={e => setForm(p => ({ ...p, systemType: e.target.value }))}
                    >
                      <option value="On-Grid">On-Grid</option>
                      <option value="Off-Grid">Off-Grid</option>
                      <option value="Hybrid">Hybrid</option>
                      <option value="Commercial">Commercial</option>
                      <option value="Custom">Custom</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="label">Description / Site Notes</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. Standard rooftop package with elevated GI structure"
                      value={form.description}
                      onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Items Builder */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                        <span>Decided Components & Materials List</span>
                        <span className="badge bg-orange-100 text-orange-800 text-xs">
                          {form.items.length} Component{form.items.length > 1 ? 's' : ''}
                        </span>
                      </h4>
                      <p className="text-xs text-gray-500">
                        Pick items from inventory or type custom components, set quantities, units, and rates.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={addRow}
                      className="btn-secondary text-xs gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5 text-green-600" /> Add Component
                    </button>
                  </div>

                  <div className="border border-gray-200 rounded-xl overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase text-[10.5px]">
                        <tr>
                          <th className="py-2.5 px-2 text-center w-8">#</th>
                          <th className="py-2.5 px-3 text-left w-56">Quick Inventory Pick</th>
                          <th className="py-2.5 px-3 text-left w-56">Item Name *</th>
                          <th className="py-2.5 px-2 text-left w-36">Category</th>
                          <th className="py-2.5 px-2 text-center w-24">Quantity *</th>
                          <th className="py-2.5 px-2 text-center w-20">Unit</th>
                          <th className="py-2.5 px-2 text-right w-24">Rate (₹)</th>
                          <th className="py-2.5 px-2 text-left w-36">Notes</th>
                          <th className="py-2.5 px-2 text-center w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {form.items.map((row, idx) => (
                          <tr key={idx} className="hover:bg-orange-50/20">
                            <td className="py-2 px-2 text-center text-gray-400 font-mono">{idx + 1}</td>
                            <td className="py-2 px-3">
                              <select
                                className="input text-xs py-1 px-2"
                                value={row.item || ''}
                                onChange={e => handleItemSelect(idx, e.target.value)}
                              >
                                <option value="">-- Or Select from Stock --</option>
                                {stockItems.map(si => (
                                  <option key={si._id} value={si._id}>
                                    {si.name} ({si.category})
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                className="input text-xs py-1 px-2 font-semibold"
                                placeholder="e.g. 550W Mono PERC"
                                value={row.itemName}
                                onChange={e => handleRowChange(idx, 'itemName', e.target.value)}
                                required
                              />
                            </td>
                            <td className="py-2 px-2">
                              <select
                                className="input text-xs py-1 px-1.5"
                                value={row.category}
                                onChange={e => handleRowChange(idx, 'category', e.target.value)}
                              >
                                {CATEGORIES.map(c => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 px-2">
                              <input
                                type="number"
                                step="any"
                                min="0"
                                className="input text-xs py-1 px-2 text-center font-bold"
                                value={row.quantity}
                                onChange={e => handleRowChange(idx, 'quantity', e.target.value)}
                                required
                              />
                            </td>
                            <td className="py-2 px-2">
                              <input
                                type="text"
                                className="input text-xs py-1 px-1.5 text-center"
                                placeholder="piece"
                                value={row.unit}
                                onChange={e => handleRowChange(idx, 'unit', e.target.value)}
                              />
                            </td>
                            <td className="py-2 px-2">
                              <input
                                type="number"
                                min="0"
                                className="input text-xs py-1 px-2 text-right font-mono"
                                placeholder="0"
                                value={row.price}
                                onChange={e => handleRowChange(idx, 'price', e.target.value)}
                              />
                            </td>
                            <td className="py-2 px-2">
                              <input
                                type="text"
                                className="input text-xs py-1 px-2"
                                placeholder="e.g. 3.3 kW array"
                                value={row.notes}
                                onChange={e => handleRowChange(idx, 'notes', e.target.value)}
                              />
                            </td>
                            <td className="py-2 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => removeRow(idx)}
                                className="text-gray-400 hover:text-red-600 p-1 rounded"
                                title="Remove row"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 mt-3 px-1">
                    <button
                      type="button"
                      onClick={addRow}
                      className="btn-secondary text-xs gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5 text-green-600" /> Add Another Row
                    </button>

                    <div className="flex items-center gap-4 text-xs font-bold">
                      <span className="text-gray-500">
                        Total Items: <strong className="text-gray-900">{form.items.length}</strong>
                      </span>
                      <span className="text-gray-500">
                        Est. Cost: <strong className="text-orange-600 font-mono text-sm">
                          ₹{form.items.reduce((acc, i) => acc + ((Number(i.quantity) || 0) * (Number(i.price) || 0)), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Modal footer */}
                <div className="shrink-0 flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="btn-secondary"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary gap-2"
                    disabled={saving}
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {editingId ? 'Save Changes' : 'Create Grouping'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
