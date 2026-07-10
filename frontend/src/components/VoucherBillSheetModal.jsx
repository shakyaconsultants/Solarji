import { useEffect, useState } from 'react';
import { Plus, Trash2, X, FileSpreadsheet, Eye, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import VoucherBillDocument from './VoucherBillDocument';
import {
  BILL_PAD_ROWS,
  COMPANY,
  buildDraftVoucher,
  createBillPadRows,
  emptyVoucherRow,
  formatBillDate,
} from '../constants/voucherBill';

const ORANGE = '#f7941d';

function recalcRow(row) {
  const qty = parseFloat(row.quantity) || 0;
  const price = parseFloat(row.price) || 0;
  return { ...row, total: qty * price };
}

function filledRows(rows) {
  return rows.filter((r) => r.item && Number(r.quantity) > 0);
}

export function rowsToBillSheet(rows) {
  const filled = filledRows(rows);
  const sheet = [...filled, ...createBillPadRows().slice(filled.length)];
  return sheet.slice(0, BILL_PAD_ROWS);
}

export function billSheetToFormRows(sheetRows) {
  const filled = filledRows(sheetRows).map(recalcRow);
  if (filled.length === 0) return [emptyVoucherRow()];
  return filled;
}

function StepPill({ label, step, current, done }) {
  const active = current === step;
  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-colors"
      style={{
        background: active ? ORANGE : done ? 'rgba(247,148,29,.12)' : '#f0f0f0',
        color: active ? '#fff' : done ? ORANGE : '#9ca3af',
      }}
    >
      <span>{step}</span>
      <span>{label}</span>
    </div>
  );
}

export default function VoucherBillSheetModal({
  open,
  onClose,
  onApply,
  stockItems,
  isSell,
  initialRows,
  party,
  partyAddress,
  date,
  note,
  preparedBy,
  onPartyChange,
  onPartyAddressChange,
}) {
  const [mode, setMode] = useState('edit');
  const [sheetRows, setSheetRows] = useState(() => createBillPadRows());
  const [localParty, setLocalParty] = useState(party);
  const [localAddress, setLocalAddress] = useState(partyAddress);

  useEffect(() => {
    if (!open) return;
    setMode('edit');
    setSheetRows(rowsToBillSheet(initialRows));
    setLocalParty(party);
    setLocalAddress(partyAddress);
  }, [open, initialRows, party, partyAddress]);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  const partyLabel = isSell ? 'Customer Name' : 'Supplier Name';
  const addressLabel = isSell ? 'Customer Address' : 'Supplier Address';
  const billTitle = isSell ? 'Sales Bill Sheet' : 'Purchase Bill Sheet';
  const filledCount = filledRows(sheetRows).length;
  const sheetTotal = filledRows(sheetRows).reduce((s, r) => s + (r.total || 0), 0);

  const draftVoucher = buildDraftVoucher({
    type: isSell ? 'SELL' : 'ADD',
    party: localParty,
    partyAddress: localAddress,
    note,
    date,
    rows: sheetRows,
    preparedBy,
  });

  const handleItemChange = (idx, itemId) => {
    const stockItem = stockItems.find((i) => i._id === itemId);
    setSheetRows((prev) => {
      const next = [...prev];
      next[idx] = recalcRow({
        ...next[idx],
        item: itemId,
        itemName: stockItem?.name || '',
        unit: stockItem?.unit || '',
        price: isSell ? (stockItem?.sellPrice ?? '') : (stockItem?.purchasePrice ?? ''),
      });
      return next;
    });
  };

  const handleRowChange = (idx, field, val) => {
    setSheetRows((prev) => {
      const next = [...prev];
      next[idx] = recalcRow({ ...next[idx], [field]: val });
      return next;
    });
  };

  const addSheetRow = () => {
    setSheetRows((prev) => {
      if (prev.length >= BILL_PAD_ROWS) {
        toast.error(`Bill sheet supports up to ${BILL_PAD_ROWS} lines`);
        return prev;
      }
      return [...prev, emptyVoucherRow()];
    });
  };

  const removeSheetRow = (idx) => {
    setSheetRows((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((_, i) => i !== idx);
      while (next.length < BILL_PAD_ROWS) next.push(emptyVoucherRow());
      return next.slice(0, BILL_PAD_ROWS);
    });
  };

  const handlePreview = () => {
    if (filledRows(sheetRows).length === 0) {
      toast.error('Fill at least one item line before preview');
      return;
    }
    setMode('preview');
  };

  const handleApply = () => {
    const items = filledRows(sheetRows);
    if (items.length === 0) {
      toast.error('Fill at least one item line on the bill sheet');
      return;
    }
    onApply({
      rows: billSheetToFormRows(sheetRows),
      party: localParty,
      partyAddress: localAddress,
    });
    onPartyChange?.(localParty);
    onPartyAddressChange?.(localAddress);
    toast.success(`${items.length} item(s) added to voucher form`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-stretch justify-center bg-black/60 p-0 sm:p-3">
      <div className="bg-[#f5f6f8] w-full max-w-6xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden sm:my-auto sm:max-h-[96vh] h-full sm:h-auto">
        {/* Header */}
        <div className="shrink-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <FileSpreadsheet className="w-5 h-5 text-solar-600 shrink-0" />
              <div className="min-w-0">
                <h2 className="font-bold text-gray-900 truncate">{billTitle}</h2>
                <p className="text-xs text-gray-500">
                  {mode === 'edit'
                    ? `Fill details · ${BILL_PAD_ROWS} lines · then preview`
                    : 'Review bill layout before applying to form'}
                </p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <StepPill label="Fill" step={1} current={mode === 'edit' ? 1 : 2} done={mode === 'preview'} />
            <div className="w-5 h-0.5 rounded" style={{ background: mode === 'preview' ? ORANGE : '#e5e7eb' }} />
            <StepPill label="Preview" step={2} current={mode === 'preview' ? 2 : 1} done={false} />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {mode === 'edit' ? (
            <div className="p-4 sm:p-6 space-y-4">
              <div className="bg-white border-2 border-gray-800 rounded-xl p-4 shadow-sm">
                <div className="flex flex-wrap justify-between gap-4 border-b-2 border-gray-800 pb-3 mb-4">
                  <div className="min-w-0">
                    <p className="text-xl font-black text-gray-900">{COMPANY.name}</p>
                    <p className="text-xs font-bold uppercase tracking-wide text-solar-600 mt-0.5">{COMPANY.tagline}</p>
                    <p className="text-xs text-gray-500 mt-1">{COMPANY.address}</p>
                    <p className="text-xs text-gray-500">{COMPANY.phones.join(' · ')}</p>
                  </div>
                  <div className="text-right text-xs text-gray-700 shrink-0">
                    <p className="font-bold uppercase text-sm">{isSell ? 'Sales Invoice' : 'Purchase Bill'}</p>
                    <p className="mt-1">Date: {formatBillDate(date)}</p>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label text-xs">{partyLabel}</label>
                    <input
                      className="input py-2 text-sm"
                      value={localParty}
                      onChange={(e) => setLocalParty(e.target.value)}
                      placeholder={isSell ? 'Customer name' : 'Supplier name'}
                    />
                  </div>
                  <div>
                    <label className="label text-xs">{addressLabel}</label>
                    <textarea
                      className="input py-2 text-sm min-h-[60px]"
                      value={localAddress}
                      onChange={(e) => setLocalAddress(e.target.value)}
                      placeholder="Full address..."
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">Item lines ({filledCount} filled)</span>
              </div>

              <div className="bg-white border-2 border-gray-800 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto max-h-[min(50vh,480px)] overflow-y-auto">
                  <table className="w-full text-xs min-w-[640px]">
                    <thead className="sticky top-0 bg-gray-100 z-10">
                      <tr className="border-b border-gray-800">
                        <th className="py-2.5 px-2 font-bold w-12 text-center border-r border-gray-300">S.No.</th>
                        <th className="py-2.5 px-2 font-bold text-left border-r border-gray-300 min-w-[200px]">Part Name / Item</th>
                        <th className="py-2.5 px-2 font-bold w-20 text-center border-r border-gray-300">Qty</th>
                        <th className="py-2.5 px-2 font-bold w-16 text-center border-r border-gray-300">Unit</th>
                        <th className="py-2.5 px-2 font-bold w-28 text-right border-r border-gray-300">Rate (₹)</th>
                        <th className="py-2.5 px-2 font-bold w-28 text-right border-r border-gray-300">Amount (₹)</th>
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {sheetRows.map((row, idx) => (
                        <tr key={idx} className="border-b border-gray-200">
                          <td className="py-1 px-2 text-center text-gray-500 font-mono border-r border-gray-100">{idx + 1}</td>
                          <td className="py-1 px-1 border-r border-gray-100">
                            <select
                              className="input py-1.5 text-xs w-full min-w-[180px]"
                              value={row.item}
                              onChange={(e) => handleItemChange(idx, e.target.value)}
                            >
                              <option value="">Select item...</option>
                              {stockItems.map((i) => (
                                <option key={i._id} value={i._id}>{i.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-1 px-1 border-r border-gray-100">
                            <input
                              type="number"
                              min="0"
                              className="input py-1.5 text-xs text-center w-full"
                              value={row.quantity}
                              onChange={(e) => handleRowChange(idx, 'quantity', e.target.value)}
                            />
                          </td>
                          <td className="py-1 px-2 text-center text-gray-600 border-r border-gray-100">{row.unit || '—'}</td>
                          <td className="py-1 px-1 border-r border-gray-100">
                            <input
                              type="number"
                              className="input py-1.5 text-xs text-right w-full"
                              value={row.price}
                              onChange={(e) => handleRowChange(idx, 'price', e.target.value)}
                            />
                          </td>
                          <td className="py-1 px-2 text-right font-medium border-r border-gray-100 whitespace-nowrap">
                            {row.total ? `₹${Number(row.total).toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—'}
                          </td>
                          <td className="py-1 px-1 text-center">
                            <button type="button" onClick={() => removeSheetRow(idx)} className="text-red-400 hover:text-red-600 p-1">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-gray-200 bg-gray-50">
                  <button type="button" onClick={addSheetRow} className="btn-secondary text-sm gap-1.5">
                    <Plus className="w-4 h-4" /> Add Row
                  </button>
                  <p className="text-sm font-bold text-gray-800">
                    Sheet Total: ₹{sheetTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 sm:p-6">
              <VoucherBillDocument voucher={draftVoucher} styled isDraft />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 flex flex-wrap gap-2 px-4 sm:px-6 py-4 border-t border-gray-200 bg-white">
          {mode === 'edit' ? (
            <>
              <button type="button" onClick={onClose} className="btn-secondary flex-1 min-w-[120px] justify-center">
                Cancel
              </button>
              <button type="button" onClick={handlePreview} className="btn-primary flex-1 min-w-[140px] justify-center gap-2">
                <Eye className="w-4 h-4" /> Preview Bill
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setMode('edit')} className="btn-secondary flex-1 min-w-[120px] justify-center gap-1.5">
                <ArrowLeft className="w-4 h-4" /> Back to Edit
              </button>
              <button type="button" onClick={() => window.print()} className="btn-secondary flex-1 min-w-[100px] justify-center">
                Print
              </button>
              <button type="button" onClick={handleApply} className="btn-primary flex-1 min-w-[160px] justify-center gap-2">
                Apply to Form
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
