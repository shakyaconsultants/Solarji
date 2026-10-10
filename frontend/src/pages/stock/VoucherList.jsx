import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, ShoppingCart, Package, Trash2, Printer, X, Loader2 } from 'lucide-react';
import api from '../../api/axios';
import Layout from '../../components/Layout';
import PaginationBar from '../../components/PaginationBar';
import VoucherBillDocument from '../../components/VoucherBillDocument';
import toast from 'react-hot-toast';
import { showApiError } from '../../utils/apiError';
import { useAuth } from '../../context/AuthContext';
import { useDataCache } from '../../context/DataCacheContext';
import { formatQty } from '../../constants/voucherBill';

const PAGE_SIZE = 20;

function buildVoucherListPrintHtml(vouchers, now, type) {
  const isPurchase = type === 'ADD';
  const isSales = type === 'SELL';
  const isExpense = type === 'EXPENSE';

  const title = isPurchase
    ? 'Purchase Vouchers Register'
    : isSales
    ? 'Sales Invoices & Vouchers Register'
    : isExpense
    ? 'Expense Vouchers Register'
    : 'Stock Vouchers Register';

  const themeColor = isPurchase ? '#059669' : isSales ? '#ea580c' : isExpense ? '#7c3aed' : '#f7941d';

  let totalQty = 0;
  let totalAmount = 0;

  const rows = vouchers.map((v, i) => {
    const dateStr = new Date(v.date || v.createdAt).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const voucherAmount = Number(v.totalAmount) || 0;
    totalAmount += voucherAmount;

    const itemsHtml = (v.items || []).map((item) => {
      const q = Number(item.quantity) || 0;
      totalQty += q;
      const rate = Number(item.price) || 0;
      const total = Number(item.total) || (q * rate);
      const gstStr = item.gst ? ` (+${item.gst}% GST)` : '';
      return `
        <div class="item-row">
          <span class="item-name"><strong>${item.itemName || item.item?.name || 'Item'}</strong> (${formatQty(item.quantity)} ${item.unit || ''})</span>
          <span class="item-val">@ ₹${rate.toLocaleString('en-IN')}${gstStr} = ₹${total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
        </div>
      `;
    }).join('');

    return `
      <tr>
        <td style="text-align: center; vertical-align: top;">${i + 1}</td>
        <td style="vertical-align: top; font-family: monospace; font-weight: 700; color: #1f2937;">${v.voucherNumber}</td>
        <td style="vertical-align: top; white-space: nowrap;">${dateStr}</td>
        <td style="vertical-align: top;">
          <strong>${v.party || '—'}</strong>
          ${v.partyAddress ? `<div style="font-size: 10px; color: #6b7280; margin-top: 1px;">${v.partyAddress}</div>` : ''}
          ${v.note ? `<div style="font-size: 10px; color: #9ca3af; font-style: italic; margin-top: 2px;">Note: ${v.note}</div>` : ''}
        </td>
        <td style="vertical-align: top;">
          ${itemsHtml || '<span style="color:#9ca3af;">—</span>'}
        </td>
        <td style="text-align: right; vertical-align: top; font-weight: 700; color: ${themeColor};">
          ₹${voucherAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
        </td>
        <td style="vertical-align: top; font-size: 11px; color: #4b5563;">${v.createdBy?.name || '—'}</td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title} — SolarJi</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 12px; color: #111; padding: 20px; background: #fff; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; border-bottom: 2px solid ${themeColor}; padding-bottom: 12px; }
          .brand { font-size: 22px; font-weight: 900; color: #111; }
          .brand span { color: #f7941d; }
          .title { font-size: 15px; font-weight: 800; text-transform: uppercase; color: ${themeColor}; margin-top: 2px; }
          .stats-bar { display: flex; flex-wrap: wrap; gap: 20px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 16px; margin-bottom: 16px; font-size: 12px; }
          .stats-bar div { display: flex; gap: 6px; align-items: center; }
          .stats-bar strong { color: #374151; }
          .stats-val { font-weight: 800; color: ${themeColor}; }
          table { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 11.5px; }
          th { background: #f3f4f6; color: #374151; font-weight: 700; text-align: left; padding: 8px 10px; border: 1px solid #e5e7eb; font-size: 11px; text-transform: uppercase; }
          td { padding: 8px 10px; border: 1px solid #e5e7eb; }
          tr:nth-child(even) td { background: #fafafa; }
          .item-row { display: flex; justify-content: space-between; gap: 8px; font-size: 11px; margin-bottom: 3px; }
          .item-name { color: #111; }
          .item-val { color: #4b5563; white-space: nowrap; font-size: 10.5px; }
          tfoot td { background: #f9fafb; font-weight: 800; border-top: 2px solid ${themeColor}; padding: 10px; }
          .no-print { text-align: right; margin-bottom: 12px; }
          .btn-print { background: ${themeColor}; color: #fff; border: none; padding: 7px 16px; border-radius: 6px; font-weight: 700; font-size: 12px; cursor: pointer; }
          @page { size: A4 landscape; margin: 12mm 14mm 12mm 14mm; }
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
          <button class="btn-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
        </div>
        <div class="header">
          <div>
            <div class="brand">Solar<span>Ji</span></div>
            <div class="title">${title}</div>
            <div style="font-size: 10.5px; color: #6b7280; margin-top: 2px;">Solar Installation & Energy Solutions</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 11px; color: #4b5563;">Generated: ${now}</div>
            <div style="font-size: 11px; color: #4b5563; margin-top: 2px;">Total Records: <strong>${vouchers.length}</strong></div>
          </div>
        </div>

        <div class="stats-bar">
          <div><strong>Total Vouchers:</strong> <span class="stats-val">${vouchers.length}</span></div>
          <div><strong>Total Quantity Transacted:</strong> <span class="stats-val">${formatQty(totalQty)}</span></div>
          <div><strong>Total Transaction Value:</strong> <span class="stats-val" style="font-size: 13px;">₹${totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 35px; text-align: center;">#</th>
              <th style="width: 95px;">Voucher No.</th>
              <th style="width: 95px;">Date</th>
              <th style="width: 170px;">${isPurchase ? 'Supplier / Party' : isSales ? 'Customer / Party' : 'Party / Recipient'}</th>
              <th>Items & Breakdown</th>
              <th style="width: 115px; text-align: right;">Total Amount</th>
              <th style="width: 110px;">Created By</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="4" style="text-align: right; text-transform: uppercase;">
                GRAND TOTAL (${vouchers.length} ${vouchers.length === 1 ? 'Voucher' : 'Vouchers'}):
              </td>
              <td><strong>${formatQty(totalQty)} units</strong></td>
              <td style="text-align: right; color: ${themeColor}; font-size: 13px;">
                ₹${totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        <script>
          window.addEventListener('load', function() {
            setTimeout(function() { window.focus(); window.print(); }, 350);
          });
        </script>
      </body>
    </html>
  `;
}

export default function VoucherList() {
  const [typeFilter, setTypeFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [printingReport, setPrintingReport] = useState(null);
  const [page, setPage] = useState(1);
  const [vouchers, setVouchers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [summary, setSummary] = useState({ purchase: 0, sales: 0 });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { canTransactStock, isAdmin } = useAuth();
  const { invalidateDashboardStock } = useDataCache();

  useEffect(() => {
    setPage(1);
  }, [typeFilter]);

  const loadVouchers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/stock/vouchers', {
        params: { page, limit: PAGE_SIZE, type: typeFilter || undefined },
      });
      setVouchers(res.data.vouchers);
      setPagination(res.data.pagination);
      if (res.data.summary) setSummary(res.data.summary);
    } catch (err) {
      showApiError(err, 'Could not load vouchers.');
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter]);

  useEffect(() => {
    loadVouchers();
  }, [loadVouchers]);

  useEffect(() => {
    if (!selected) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [selected]);

  const openVoucherPreview = async (voucher) => {
    setDetailLoading(true);
    setSelected({ _loading: true, voucherNumber: voucher.voucherNumber });
    try {
      const res = await api.get(`/stock/vouchers/${voucher._id}`);
      setSelected(res.data);
    } catch (err) {
      showApiError(err, 'Could not load voucher details.');
      setSelected(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const closePreview = () => setSelected(null);

  const handleDelete = async (voucher) => {
    if (!window.confirm(
      `Delete ${voucher.type === 'ADD' ? 'Purchase' : 'Sales'} Voucher ${voucher.voucherNumber}?\n\nThis will REVERSE the stock quantities. This cannot be undone.`
    )) return;
    setDeleting(voucher._id);
    try {
      await api.delete(`/stock/vouchers/${voucher._id}`);
      invalidateDashboardStock();
      toast.success('Voucher deleted & stock reversed');
      setSelected(null);
      loadVouchers();
    } catch (err) {
      showApiError(err, 'Could not delete voucher.');
    } finally {
      setDeleting(null);
    }
  };

  const handlePrintVouchers = async (type = 'SELL') => {
    setPrintingReport(type || 'ALL');
    try {
      const res = await api.get('/stock/vouchers', {
        params: { page: 1, limit: 1000, type: type || undefined },
      });
      const printVouchers = res.data.vouchers || [];
      if (printVouchers.length === 0) {
        toast.error(`No ${type === 'ADD' ? 'purchase' : type === 'SELL' ? 'sales' : 'matching'} vouchers found to print.`);
        return;
      }
      const now = new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' });
      const printHtml = buildVoucherListPrintHtml(printVouchers, now, type);
      const win = window.open('', '_blank', 'width=1100,height=800');
      if (!win) {
        toast.error('Pop-up blocked. Please allow pop-ups to print reports.');
        return;
      }
      win.document.open();
      win.document.write(printHtml);
      win.document.close();
    } catch (err) {
      showApiError(err, 'Could not generate vouchers report.');
    } finally {
      setPrintingReport(null);
    }
  };

  return (
    <Layout module="stock">
      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Voucher History</h1>
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <button
                type="button"
                onClick={() => handlePrintVouchers('ADD')}
                disabled={Boolean(printingReport)}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:10, border:'1.5px solid #bbf7d0', background:'#f0fdf4', color:'#166534', fontWeight:700, fontSize:13, cursor:'pointer' }}
                title="Print Purchases Register (all purchase vouchers)"
              >
                <Printer size={15} className="text-green-600" /> {printingReport === 'ADD' ? 'Preparing…' : 'Print Purchases'}
              </button>
            )}
            <button
              type="button"
              onClick={() => handlePrintVouchers('SELL')}
              disabled={Boolean(printingReport)}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:10, border:'1.5px solid #fed7aa', background:'#fff7ed', color:'#9a3412', fontWeight:700, fontSize:13, cursor:'pointer' }}
              title="Print Sales Register (all sales invoices)"
            >
              <Printer size={15} className="text-orange-500" /> {printingReport === 'SELL' ? 'Preparing…' : 'Print Sales'}
            </button>
            <div className="h-6 w-px bg-gray-200 hidden sm:block mx-1" />
            {isAdmin && (
              <>
                <button onClick={() => navigate('/stock/voucher/add')} className="btn-success gap-2">
                  <Package className="w-4 h-4" /> Purchase
                </button>
                <button onClick={() => navigate('/stock/voucher/expense')} className="btn-danger gap-2">
                  <span className="w-4 h-4 flex items-center justify-center font-bold text-xs">−</span> Expense
                </button>
              </>
            )}
            <button onClick={() => navigate('/stock/voucher/sell')} className="btn-primary gap-2">
              <ShoppingCart className="w-4 h-4" /> Sell
            </button>
          </div>
        </div>

        <div className={`grid ${isAdmin ? 'grid-cols-3' : 'grid-cols-1'} gap-4 mb-6 max-[480px]:grid-cols-1`}>
          {isAdmin && (
            <div className="card border-l-4 border-green-500">
              <p className="text-sm text-gray-500 font-bold uppercase tracking-wide">Total Purchases</p>
              <p className="text-2xl font-black text-green-600 mt-1">₹{summary.purchase.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
            </div>
          )}
          <div className="card border-l-4 border-solar-500">
            <p className="text-sm text-gray-500 font-bold uppercase tracking-wide">Total Sales</p>
            <p className="text-2xl font-black text-solar-600 mt-1">₹{summary.sales.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
          </div>
          {isAdmin && (
            <div className="card border-l-4 border-red-500">
              <p className="text-sm text-gray-500 font-bold uppercase tracking-wide">Total Expenses</p>
              <p className="text-2xl font-black text-red-600 mt-1">₹{(summary.expense || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
            </div>
          )}
        </div>

        {isAdmin && (
          <div className="card mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {['', 'ADD', 'SELL', 'EXPENSE'].map(t => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`btn ${typeFilter === t ? 'btn-primary' : 'btn-secondary'} text-xs font-semibold`}
                >
                  {t === '' ? 'All' : t === 'ADD' ? 'Purchases' : t === 'SELL' ? 'Sales' : 'Expenses'}
                </button>
              ))}
            </div>
            {typeFilter && (
              <button
                type="button"
                onClick={() => handlePrintVouchers(typeFilter)}
                disabled={Boolean(printingReport)}
                className="btn-secondary text-xs gap-1.5"
                title={`Print current ${typeFilter === 'ADD' ? 'purchases' : typeFilter === 'SELL' ? 'sales' : 'expenses'} list`}
              >
                <Printer className="w-3.5 h-3.5" /> Print {typeFilter === 'ADD' ? 'Purchases' : typeFilter === 'SELL' ? 'Sales' : 'Expenses'}
              </button>
            )}
          </div>
        )}

        <div className="card">
          {loading ? <div className="text-center py-12 text-gray-400">Loading vouchers...</div> : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-100">
                      <th className="text-left py-3 px-3 font-semibold text-gray-600">Voucher No.</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-600">Type</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-600">Party</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-600">Items</th>
                      <th className="text-right py-3 px-3 font-semibold text-gray-600">Amount</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-600">By</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-600">Date</th>
                      <th className="text-center py-3 px-3 font-semibold text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vouchers.map(v => (
                      <tr key={v._id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-3 px-3 font-mono text-sm font-medium text-gray-800">{v.voucherNumber}</td>
                        <td className="py-3 px-3">
                          <span className={`badge ${
                            v.type === 'ADD' ? 'bg-green-100 text-green-700' :
                            v.type === 'SELL' ? 'bg-red-100 text-red-700' :
                            'bg-purple-100 text-purple-700'
                          }`}>
                            {v.type === 'ADD' ? 'Purchase' : v.type === 'SELL' ? 'Sale' : 'Expense'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-gray-600">{v.party || '—'}</td>
                        <td className="py-3 px-3 text-gray-500">{v.items.length} item(s)</td>
                        <td className="py-3 px-3 text-right font-semibold text-gray-700">₹{v.totalAmount.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-3 text-gray-500">{v.createdBy?.name}</td>
                        <td className="py-3 px-3 text-gray-400">{new Date(v.date || v.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</td>
                        <td className="py-3 px-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openVoucherPreview(v)}
                              className="btn-secondary p-1.5"
                              title="View bill"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => navigate(`/stock/vouchers/${v._id}/preview`)}
                              className="btn-secondary p-1.5"
                              title="Open full preview & print"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            {canTransactStock && (v.type !== 'ADD' || isAdmin) && (
                              <button
                                type="button"
                                onClick={() => handleDelete(v)}
                                disabled={deleting === v._id}
                                className="btn-danger p-1.5"
                                title="Delete voucher (reverses stock)"
                              >
                                {deleting === v._id
                                  ? <span className="w-3.5 h-3.5 block border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  : <Trash2 className="w-3.5 h-3.5" />
                                }
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {vouchers.length === 0 && (
                      <tr><td colSpan={8} className="text-center py-12 text-gray-400">No vouchers found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <PaginationBar
                pagination={pagination}
                page={page}
                onPageChange={setPage}
                loading={loading}
                label="vouchers"
              />
            </>
          )}
        </div>

        {selected && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-3 sm:p-6"
            role="dialog"
            aria-modal="true"
            onClick={closePreview}
          >
            <div
              className="bg-[#f5f6f8] w-full max-w-4xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-4 bg-white border-b border-gray-200">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">
                    {selected.voucherNumber || 'Voucher'}
                  </h3>
                  {!selected._loading && selected.type && (
                    <span className={`badge mt-1 ${
                      selected.type === 'ADD' ? 'bg-green-100 text-green-700' :
                      selected.type === 'SELL' ? 'bg-red-100 text-red-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {selected.type === 'ADD' ? 'Purchase Bill' : selected.type === 'SELL' ? 'Sales Invoice' : 'Expense Bill'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!selected._loading && (
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="btn-secondary text-sm gap-1.5 hidden sm:inline-flex"
                    >
                      <Printer className="w-4 h-4" /> Print
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={closePreview}
                    className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto min-h-0 px-4 sm:px-6 py-4">
                {detailLoading || selected._loading ? (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-solar-500" />
                    <p className="text-sm">Loading bill…</p>
                  </div>
                ) : (
                  <VoucherBillDocument voucher={selected} styled />
                )}
              </div>

              {!selected._loading && !detailLoading && (
                <div className="shrink-0 flex flex-wrap gap-2 px-4 sm:px-6 py-4 bg-white border-t border-gray-200">
                  <button type="button" onClick={closePreview} className="btn-secondary flex-1 min-w-[100px] justify-center">
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => { closePreview(); navigate(`/stock/vouchers/${selected._id}/preview`); }}
                    className="btn-primary flex-1 min-w-[140px] justify-center gap-2"
                  >
                    <Printer className="w-4 h-4" /> Full Preview
                  </button>
                  {canTransactStock && (selected.type !== 'ADD' || isAdmin) && (
                    <button
                      type="button"
                      onClick={() => handleDelete(selected)}
                      disabled={deleting === selected._id}
                      className="btn-danger flex-1 min-w-[120px] justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
