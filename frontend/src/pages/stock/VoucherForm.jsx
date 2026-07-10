import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, ShoppingCart, Package, Calendar, FileSpreadsheet, Eye } from 'lucide-react';
import api from '../../api/axios';
import Layout from '../../components/Layout';
import VoucherBillSheetModal from '../../components/VoucherBillSheetModal';
import VoucherBillPreviewModal from '../../components/VoucherBillPreviewModal';
import toast from 'react-hot-toast';
import { showApiError } from '../../utils/apiError';
import { useDataCache } from '../../context/DataCacheContext';
import { useAuth } from '../../context/AuthContext';
import { buildDraftVoucher, emptyVoucherRow } from '../../constants/voucherBill';
const todayISO = () => new Date().toISOString().split('T')[0];

export default function VoucherForm({ type }) {
  const navigate = useNavigate();
  const { addStockVoucher } = useDataCache();
  const { user } = useAuth();
  const [stockItems, setStockItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [party, setParty] = useState('');
  const [partyAddress, setPartyAddress] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);
  const [showBillSheet, setShowBillSheet] = useState(false);
  const [showFormPreview, setShowFormPreview] = useState(false);
  const [rows, setRows] = useState([emptyVoucherRow()]);

  const isSell = type === 'SELL';
  const title = isSell ? 'Sales Voucher' : 'Purchase Voucher';
  const partyLabel = isSell ? 'Customer Name' : 'Supplier Name';
  const addressLabel = isSell ? 'Customer Address' : 'Supplier Address';

  useEffect(() => {
    api.get('/stock/items', { params: { picker: 1, limit: 100 } })
      .then((res) => setStockItems(res.data.items || []))
      .catch((err) => showApiError(err, 'Could not load stock items for voucher.'))
      .finally(() => setItemsLoading(false));
  }, []);

  const handleItemChange = (idx, itemId) => {
    const stockItem = stockItems.find((i) => i._id === itemId);
    const newRows = [...rows];
    newRows[idx] = {
      ...newRows[idx],
      item: itemId,
      itemName: stockItem?.name || '',
      unit: stockItem?.unit || '',
      price: isSell ? (stockItem?.sellPrice ?? '') : (stockItem?.purchasePrice ?? ''),
    };
    const qty = parseFloat(newRows[idx].quantity) || 0;
    const price = parseFloat(newRows[idx].price) || 0;
    newRows[idx].total = qty * price;
    setRows(newRows);
  };

  const handleRowChange = (idx, field, val) => {
    const newRows = [...rows];
    newRows[idx] = { ...newRows[idx], [field]: val };
    const qty = parseFloat(newRows[idx].quantity) || 0;
    const price = parseFloat(newRows[idx].price) || 0;
    newRows[idx].total = qty * price;
    setRows(newRows);
  };

  const addRow = () => setRows([...rows, emptyVoucherRow()]);
  const removeRow = (idx) => rows.length > 1 && setRows(rows.filter((_, i) => i !== idx));

  const handleBillSheetApply = ({ rows: appliedRows, party: p, partyAddress: addr }) => {
    setRows(appliedRows);
    if (p != null) setParty(p);
    if (addr != null) setPartyAddress(addr);
  };

  const totalAmount = rows.reduce((s, r) => s + (r.total || 0), 0);

  const formDraft = buildDraftVoucher({
    type,
    party,
    partyAddress,
    note,
    date,
    rows,
    preparedBy: user?.name,
  });

  const saveVoucher = useCallback(async () => {
    const validRows = rows.filter((r) => r.item && Number(r.quantity) > 0);
    if (validRows.length === 0) {
      toast.error('Add at least one item');
      return false;
    }
    setSaving(true);
    try {
      const payload = {
        type,
        party,
        partyAddress,
        note,
        date,
        items: validRows.map((r) => ({
          item: r.item,
          quantity: Number(r.quantity),
          price: Number(r.price),
        })),
      };
      const res = await api.post('/stock/vouchers', payload);
      addStockVoucher(res.data);
      toast.success(`${title} ${res.data.voucherNumber} saved`);
      navigate(`/stock/vouchers/${res.data._id}/preview`);
      return true;
    } catch (err) {
      showApiError(err, 'Could not create voucher.');
      return false;
    } finally {
      setSaving(false);
    }
  }, [rows, type, party, partyAddress, note, date, addStockVoucher, navigate, title]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await saveVoucher();
  };

  const handleOpenPreview = () => {
    const validRows = rows.filter((r) => r.item && Number(r.quantity) > 0);
    if (validRows.length === 0) return toast.error('Add at least one item before preview');
    setShowFormPreview(true);
  };

  const handlePreviewSave = async () => {
    const ok = await saveVoucher();
    if (ok) setShowFormPreview(false);
  };

  return (
    <Layout module="stock">
      <div className="p-4 sm:p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button type="button" onClick={() => navigate('/stock')} className="btn-secondary p-2">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            {isSell ? <ShoppingCart className="w-6 h-6 text-red-500" /> : <Package className="w-6 h-6 text-green-600" />}
            <div>
              <h1 className="text-xl font-bold text-gray-900">Create {title}</h1>
              <p className="text-gray-500 text-sm">{isSell ? 'Record a stock sale' : 'Record a stock purchase'}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="card">
            <h3 className="font-semibold text-gray-700 mb-4">{isSell ? 'Customer' : 'Supplier'} Details</h3>
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="label">{partyLabel}</label>
                <input
                  className="input"
                  value={party}
                  onChange={(e) => setParty(e.target.value)}
                  placeholder={isSell ? 'Customer name' : 'Supplier / party name'}
                />
              </div>
              <div>
                <label className="label flex items-center gap-1"><Calendar size={11} /> Transaction Date</label>
                <input
                  type="date"
                  className="input"
                  value={date}
                  max={todayISO()}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">Note / Remarks</label>
                <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note..." />
              </div>
            </div>
            <div>
              <label className="label">{addressLabel}</label>
              <textarea
                className="input min-h-[64px]"
                value={partyAddress}
                onChange={(e) => setPartyAddress(e.target.value)}
                placeholder="Full address..."
                rows={2}
              />
            </div>
          </div>

          <div className="card">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h3 className="font-semibold text-gray-700">Items</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowBillSheet(true)}
                  className="btn-secondary text-xs gap-1.5"
                  disabled={itemsLoading}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Open Bill Sheet
                </button>
                <button type="button" onClick={addRow} className="btn-secondary text-xs gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add Row
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-100">
                    <th className="text-left py-2 px-2 font-semibold text-gray-600 w-8">#</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-600">Item</th>
                    <th className="text-right py-2 px-2 font-semibold text-gray-600 w-28">Quantity</th>
                    <th className="text-right py-2 px-2 font-semibold text-gray-600 w-36">
                      {isSell ? 'Sell Price (₹)' : 'Purchase Price (₹)'}
                    </th>
                    <th className="text-right py-2 px-2 font-semibold text-gray-600 w-32">Total (₹)</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={idx} className="border-b border-gray-50">
                      <td className="py-2 px-2 text-gray-400">{idx + 1}</td>
                      <td className="py-2 px-2">
                        <select
                          className="input"
                          value={row.item}
                          onChange={(e) => handleItemChange(idx, e.target.value)}
                          required={idx === 0}
                        >
                          <option value="">Select item...</option>
                          {stockItems.map((i) => (
                            <option key={i._id} value={i._id}>
                              {i.name} (Stock: {i.quantity} {i.unit})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          className="input text-right"
                          min="1"
                          value={row.quantity}
                          onChange={(e) => handleRowChange(idx, 'quantity', e.target.value)}
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          className="input text-right"
                          value={row.price}
                          onChange={(e) => handleRowChange(idx, 'price', e.target.value)}
                          placeholder="0"
                        />
                      </td>
                      <td className="py-2 px-2 text-right font-medium text-gray-700">
                        ₹{(row.total || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-2">
                        <button type="button" onClick={() => removeRow(idx)} className="text-red-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50">
                    <td colSpan={4} className="py-3 px-2 text-right font-semibold text-gray-700">Total Amount:</td>
                    <td className="py-3 px-2 text-right font-bold text-lg text-solar-700">
                      ₹{totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Use <strong>Open Bill Sheet</strong> for 40-line entry, preview there, then apply. Or preview &amp; save from this form.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => navigate('/stock')} className="btn-secondary flex-1 min-w-[100px] justify-center">Cancel</button>
            <button
              type="button"
              onClick={handleOpenPreview}
              className="btn-secondary flex-1 min-w-[120px] justify-center gap-2"
              disabled={itemsLoading || saving}
            >
              <Eye className="w-4 h-4" /> Preview Bill
            </button>
            <button
              type="submit"
              className={`flex-1 min-w-[120px] justify-center ${isSell ? 'btn-primary' : 'btn-success'}`}
              disabled={saving || itemsLoading}
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving…' : `Save ${title}`}
            </button>
          </div>
        </form>
      </div>

      <VoucherBillSheetModal
        open={showBillSheet}
        onClose={() => setShowBillSheet(false)}
        onApply={handleBillSheetApply}
        stockItems={stockItems}
        isSell={isSell}
        initialRows={rows}
        party={party}
        partyAddress={partyAddress}
        date={date}
        note={note}
        preparedBy={user?.name}
        onPartyChange={setParty}
        onPartyAddressChange={setPartyAddress}
      />

      <VoucherBillPreviewModal
        open={showFormPreview}
        onClose={() => setShowFormPreview(false)}
        draftVoucher={formDraft}
        title={`${title} — Preview`}
        subtitle="Review the bill layout, then save or go back to edit"
        onConfirm={handlePreviewSave}
        confirmLabel={saving ? 'Saving…' : `Save ${title}`}
        confirmDisabled={saving}
      />
    </Layout>
  );
}
