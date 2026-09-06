import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard, Search, ArrowRight, Wallet, CheckCircle2,
  Calendar, Phone, MapPin, User, Banknote, IndianRupee, Eye, RefreshCw, X, Printer
} from 'lucide-react';
import api from '../../api/axios';
import Layout from '../../components/Layout';
import PaginationBar from '../../components/PaginationBar';
import CustomerReceiptModal from '../../components/CustomerReceiptModal';
import { printCustomerListReport } from '../../utils/printReceipt';
import toast from 'react-hot-toast';
import { showApiError } from '../../utils/apiError';

const STAGES = [
  'Lead', 'Calling', 'Visit', 'Filing', 'Loan Filing', 'Loan Process',
  'Loan Release', 'Installation', 'Kesco Filing', 'Kesco Process',
  'Meter Install', 'Subsidy Apply', 'Subsidy Release', 'Commission'
];

const stageColors = {
  'Lead': 'bg-gray-100 text-gray-700',
  'Calling': 'bg-blue-100 text-blue-700',
  'Visit': 'bg-purple-100 text-purple-700',
  'Filing': 'bg-yellow-100 text-yellow-700',
  'Loan Filing': 'bg-orange-100 text-orange-700',
  'Loan Process': 'bg-orange-200 text-orange-800',
  'Loan Release': 'bg-green-100 text-green-700',
  'Installation': 'bg-green-200 text-green-800',
  'Kesco Filing': 'bg-teal-100 text-teal-700',
  'Kesco Process': 'bg-cyan-100 text-cyan-700',
  'Meter Install': 'bg-indigo-100 text-indigo-700',
  'Subsidy Apply': 'bg-teal-200 text-teal-800',
  'Subsidy Release': 'bg-cyan-200 text-cyan-800',
  'Commission': 'bg-emerald-100 text-emerald-800',
};

const PAGE_SIZE = 20;

export default function FirstPaid() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState(''); // '' | 'cash' | 'account'
  const [page, setPage] = useState(1);
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({ totalCustomers: 0, totalPlantCost: 0, totalPaid: 0, totalBalanceLeft: 0 });
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const fetchId = useRef(0);
  const [receiptLead, setReceiptLead] = useState(null);

  // Quick Payment Modal for Admin and Employees
  const [selectedLeadForPay, setSelectedLeadForPay] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash'); // 'cash' | 'account'
  const [payDate, setPayDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [payNote, setPayNote] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const handleOpenPayModal = (lead) => {
    setSelectedLeadForPay(lead);
    setPayAmount('');
    setPayNote('');
    setPayMethod('cash');
    setPayDate(new Date().toISOString().split('T')[0]);
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedLeadForPay) return;
    const num = Number(payAmount);
    if (!num || num <= 0) return toast.error('Please enter a valid payment amount');

    setSubmittingPayment(true);
    try {
      await api.post(`/leads/${selectedLeadForPay._id}/payments`, {
        amount: num,
        method: payMethod,
        date: payDate || new Date().toISOString(),
        note: payNote,
      });
      toast.success(`Payment of ₹${num.toLocaleString('en-IN')} recorded by ${payMethod === 'account' ? 'Bank Account' : 'Cash'}!`);
      setSelectedLeadForPay(null);
      loadData();
    } catch (err) {
      showApiError(err, 'Could not record payment.');
    } finally {
      setSubmittingPayment(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [stageFilter, methodFilter, debouncedSearch]);

  const loadData = useCallback(async () => {
    const id = ++fetchId.current;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (stageFilter) params.set('stage', stageFilter);
      if (methodFilter) params.set('method', methodFilter);
      if (debouncedSearch) params.set('search', debouncedSearch);

      const res = await api.get(`/leads/first-paid?${params}`);
      if (id !== fetchId.current) return;
      setLeads(res.data.leads || []);
      setStats(res.data.stats || { totalCustomers: 0, totalPlantCost: 0, totalPaid: 0, totalBalanceLeft: 0 });
      setPagination(res.data.pagination);
    } catch (err) {
      showApiError(err, 'Could not load first-paid customers.');
    } finally {
      if (id === fetchId.current) setLoading(false);
    }
  }, [page, stageFilter, methodFilter, debouncedSearch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <Layout module="crm">
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-orange-100 text-orange-600">
                <CreditCard className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">First Paid Customers</h1>
            </div>
            <p className="text-gray-500 text-sm mt-1">
              Customers who have paid their first installment, ordered by earliest first payment date (first paid person at top).
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => printCustomerListReport(leads, 'First-Paid Customers Report', stats)}
              disabled={loading || leads.length === 0}
              className="btn-secondary gap-1.5"
              title="Print or Save list as PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Print Report</span>
            </button>
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="btn-secondary gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-orange-500' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Stats KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-4 bg-gradient-to-br from-orange-50/70 to-white border-orange-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">First-Paid Customers</p>
            <p className="text-2xl font-black text-gray-900 mt-1">
              {stats.totalCustomers}
            </p>
            <p className="text-xs text-orange-600 font-semibold mt-1">Customers with payments</p>
          </div>

          <div className="card p-4 bg-gradient-to-br from-blue-50/70 to-white border-blue-100">
            <p className="text-xs font-bold text-blue-500 uppercase tracking-wider">Total Collected</p>
            <p className="text-2xl font-black text-blue-900 mt-1">
              ₹{Number(stats.totalPaid || 0).toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-blue-600 font-semibold mt-1">Cumulative collected sum</p>
          </div>

          <div className="card p-4 bg-gradient-to-br from-emerald-50/70 to-white border-emerald-100">
            <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Total Plant Value</p>
            <p className="text-2xl font-black text-emerald-900 mt-1">
              ₹{Number(stats.totalPlantCost || 0).toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-emerald-600 font-semibold mt-1">Combined portfolio cost</p>
          </div>

          <div className="card p-4 bg-gradient-to-br from-amber-50/70 to-white border-amber-100">
            <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Balance Remaining</p>
            <p className="text-2xl font-black text-amber-900 mt-1">
              ₹{Number(stats.totalBalanceLeft || 0).toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-amber-700 font-semibold mt-1">To be collected</p>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="card p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                className="input pl-9 text-sm"
                placeholder="Search by customer name, phone, city, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              className="input sm:w-44 text-sm"
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
            >
              <option value="">All Stages</option>
              {STAGES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select
              className="input sm:w-44 text-sm"
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
            >
              <option value="">All Methods</option>
              <option value="cash">Cash Only</option>
              <option value="account">Bank Account Only</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="card p-0 overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-gray-400">
              <RefreshCw className="w-6 h-6 animate-spin text-orange-500 mr-2" />
              <span>Loading first-paid customer records...</span>
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-16 px-4">
              <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-base font-bold text-gray-700">No first-paid customers found</p>
              <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
                No customer records currently match your filters with recorded payments. Record a customer payment in the CRM to list them here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50/90 text-gray-600 border-b border-gray-200 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4 font-bold">Order #</th>
                    <th className="py-3 px-4 font-bold">Customer Details</th>
                    <th className="py-3 px-4 font-bold">First Payment</th>
                    <th className="py-3 px-4 font-bold">Plant Cost</th>
                    <th className="py-3 px-4 font-bold">Total Paid</th>
                    <th className="py-3 px-4 font-bold">Balance Left</th>
                    <th className="py-3 px-4 font-bold">Stage</th>
                    <th className="py-3 px-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {leads.map((l, index) => {
                    const globalRank = ((page - 1) * PAGE_SIZE) + index + 1;
                    const payments = l.payments || [];
                    const sortedPayments = [...payments].sort((a, b) => new Date(a.date) - new Date(b.date));
                    const fp = sortedPayments[0] || null;
                    const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
                    const plantCost = Number(l.plantCost) || 0;
                    const remainingBalance = Math.max(0, plantCost - totalPaid);
                    const percentPaid = plantCost > 0 ? Math.min(100, Math.round((totalPaid / plantCost) * 100)) : (totalPaid > 0 ? 100 : 0);

                    return (
                      <tr key={l._id} className="hover:bg-orange-50/20 transition-colors group">
                        {/* Rank / Order */}
                        <td className="py-3.5 px-4 font-mono font-bold text-gray-500 whitespace-nowrap">
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-black ${
                            globalRank === 1 ? 'bg-amber-100 text-amber-800 border border-amber-300 shadow-sm' :
                            globalRank === 2 ? 'bg-slate-100 text-slate-800 border border-slate-300' :
                            globalRank === 3 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            #{globalRank}
                          </span>
                        </td>

                        {/* Customer Info */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 font-bold flex items-center justify-center text-xs flex-shrink-0">
                              {l.name?.charAt(0)?.toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 group-hover:text-orange-600 transition-colors">
                                {l.name}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                <span className="flex items-center gap-1 font-mono">{l.phone}</span>
                                {l.city && <span>· {l.city}</span>}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* First Payment Details */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {fp ? (
                            <div>
                              <p className="font-extrabold text-blue-900">
                                ₹{Number(fp.amount).toLocaleString('en-IN')}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  fp.method === 'account' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                                }`}>
                                  {fp.method === 'account' ? 'ACCOUNT' : 'CASH'}
                                </span>
                                <span className="text-[11px] text-gray-500 flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-gray-400" />
                                  {new Date(fp.date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">No record</span>
                          )}
                        </td>

                        {/* Plant Cost */}
                        <td className="py-3.5 px-4 font-bold text-gray-800 whitespace-nowrap">
                          {plantCost > 0 ? `₹${plantCost.toLocaleString('en-IN')}` : '—'}
                          {l.systemSize && (
                            <p className="text-[11px] font-normal text-gray-400 mt-0.5">{l.systemSize}</p>
                          )}
                        </td>

                        {/* Total Paid */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <p className="font-bold text-emerald-700">₹{totalPaid.toLocaleString('en-IN')}</p>
                          {plantCost > 0 && (
                            <div className="w-24 bg-gray-100 rounded-full h-1.5 mt-1.5 overflow-hidden">
                              <div
                                className="bg-emerald-500 h-full rounded-full"
                                style={{ width: `${percentPaid}%` }}
                              />
                            </div>
                          )}
                        </td>

                        {/* Remaining Balance */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`inline-block font-bold text-xs px-2.5 py-1 rounded-full ${
                            remainingBalance === 0 && plantCost > 0
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-100 text-amber-900 border border-amber-200'
                          }`}>
                            {remainingBalance === 0 && plantCost > 0 ? 'Fully Paid' : `₹${remainingBalance.toLocaleString('en-IN')} Left`}
                          </span>
                        </td>

                        {/* Stage */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`badge text-xs px-2.5 py-1 ${stageColors[l.stage] || 'bg-gray-100 text-gray-700'}`}>
                            {l.stage}
                          </span>
                        </td>

                        {/* Action */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenPayModal(l)}
                              className="btn-primary py-1.5 px-2.5 text-xs inline-flex items-center gap-1"
                              title="Add customer payment"
                            >
                              <Banknote className="w-3.5 h-3.5" />
                              <span>+ Payment</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setReceiptLead(l)}
                              className="btn-secondary py-1.5 px-2.5 text-xs inline-flex items-center gap-1 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200"
                              title="Print or Download customer payment receipt"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Print</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => navigate(`/crm/leads/${l._id}`)}
                              className="btn-secondary py-1.5 px-2.5 text-xs inline-flex items-center gap-1 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="p-4 bg-white border-t border-gray-100">
            <PaginationBar
              pagination={pagination}
              page={page}
              onPageChange={setPage}
              loading={loading}
              label="first-paid customers"
            />
          </div>
        </div>

        {/* Record Payment Modal for Admin & Employee */}
        {selectedLeadForPay && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                    <Banknote className="w-5 h-5 text-emerald-600" /> Record Payment
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Customer: <span className="font-semibold text-gray-800">{selectedLeadForPay.name}</span> ({selectedLeadForPay.phone})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedLeadForPay(null)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRecordPayment} className="space-y-4">
                <div>
                  <label className="label">Payment Amount (₹) *</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                    <input
                      className="input pl-8 font-semibold text-base"
                      type="number"
                      min="1"
                      required
                      placeholder="e.g. 50000"
                      value={payAmount}
                      onChange={e => setPayAmount(e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Payment Method *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPayMethod('cash')}
                      className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition-all ${
                        payMethod === 'cash'
                          ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <Banknote className="w-4 h-4" />
                      <span>Cash</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayMethod('account')}
                      className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition-all ${
                        payMethod === 'account'
                          ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Bank Account</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="label">Payment Date</label>
                  <input
                    className="input"
                    type="date"
                    value={payDate}
                    onChange={e => setPayDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="label">Note / Reference (optional)</label>
                  <input
                    className="input"
                    placeholder="e.g. 2nd installment, Cheque #123, UPI Txn ID"
                    value={payNote}
                    onChange={e => setPayNote(e.target.value)}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    className="btn-secondary flex-1 justify-center"
                    onClick={() => setSelectedLeadForPay(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary flex-1 justify-center gap-2"
                    disabled={submittingPayment}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{submittingPayment ? 'Recording...' : 'Save Payment'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Receipt Preview & Print Modal */}
        {receiptLead && (
          <CustomerReceiptModal
            lead={receiptLead}
            onClose={() => setReceiptLead(null)}
          />
        )}
      </div>
    </Layout>
  );
}
