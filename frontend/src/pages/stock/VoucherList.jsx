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

const PAGE_SIZE = 20;

export default function VoucherList() {
  const [typeFilter, setTypeFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleting, setDeleting] = useState(null);
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

  return (
    <Layout module="stock">
      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Voucher History</h1>
          <div className="flex gap-2">
            {isAdmin && (
              <button onClick={() => navigate('/stock/voucher/add')} className="btn-success gap-2">
                <Package className="w-4 h-4" /> Purchase
              </button>
            )}
            <button onClick={() => navigate('/stock/voucher/sell')} className="btn-primary gap-2">
              <ShoppingCart className="w-4 h-4" /> Sell
            </button>
          </div>
        </div>

        <div className={`grid ${isAdmin ? 'grid-cols-2' : 'grid-cols-1'} gap-4 mb-6 max-[480px]:grid-cols-1`}>
          {isAdmin && (
            <div className="card border-l-4 border-green-500">
              <p className="text-sm text-gray-500">Total Purchases</p>
              <p className="text-2xl font-bold text-green-600">₹{summary.purchase.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
            </div>
          )}
          <div className="card border-l-4 border-solar-500">
            <p className="text-sm text-gray-500">Total Sales</p>
            <p className="text-2xl font-bold text-solar-600">₹{summary.sales.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
          </div>
        </div>

        {isAdmin && (
          <div className="card mb-4 flex gap-3">
            {['', 'ADD', 'SELL'].map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`btn ${typeFilter === t ? 'btn-primary' : 'btn-secondary'} text-xs`}
              >
                {t === '' ? 'All' : t === 'ADD' ? 'Purchases' : 'Sales'}
              </button>
            ))}
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
                          <span className={`badge ${v.type === 'ADD' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {v.type === 'ADD' ? 'Purchase' : 'Sale'}
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
                    <span className={`badge mt-1 ${selected.type === 'ADD' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {selected.type === 'ADD' ? 'Purchase Bill' : 'Sales Invoice'}
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
