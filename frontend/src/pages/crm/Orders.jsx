import { useState, useEffect, useCallback } from 'react';
import { ShoppingCart, Search, Eye, X } from 'lucide-react';
import api from '../../api/axios';
import Layout from '../../components/Layout';
import PaginationBar from '../../components/PaginationBar';
import toast from 'react-hot-toast';
import { showApiError } from '../../utils/apiError';
import { useAuth } from '../../context/AuthContext';
import { roleLabel } from '../../utils/roles';

const PAGE_SIZE = 20;

const ORDER_STATUSES = ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'];

const statusBadgeClass = (status) => {
  switch (status) {
    case 'Pending':   return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
    case 'Confirmed': return 'bg-blue-50 text-blue-700 border border-blue-200';
    case 'Shipped':   return 'bg-indigo-50 text-indigo-700 border border-indigo-200';
    case 'Delivered': return 'bg-green-50 text-green-700 border border-green-200';
    case 'Cancelled': return 'bg-red-50 text-red-700 border border-red-200';
    default:          return 'bg-gray-50 text-gray-700 border border-gray-200';
  }
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [assignees, setAssignees] = useState([]);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  
  const [editStatus, setEditStatus] = useState('');
  const [editAssignee, setEditAssignee] = useState('');
  const { user } = useAuth();

  // Helper to check if user has manager privileges
  const canManageAllOrders = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'stock_manager';

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, debouncedSearch]);

  // Load potential assignees
  useEffect(() => {
    if (!canManageAllOrders) return;
    api.get('/users/assignees')
      .then((res) => setAssignees(res.data))
      .catch(() => {});
  }, [canManageAllOrders]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/orders', {
        params: {
          page,
          limit: PAGE_SIZE,
          status: statusFilter || undefined,
          search: debouncedSearch || undefined,
        },
      });
      setOrders(res.data.orders);
      setPagination(res.data.pagination);
    } catch (err) {
      showApiError(err, 'Could not load orders.');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, debouncedSearch]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const openDetail = (ord) => {
    setSelected(ord);
    setEditStatus(ord.status);
    setEditAssignee(ord.assignedTo?._id || ord.assignedTo || '');
  };

  const handleUpdate = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const payload = { status: editStatus };
      if (canManageAllOrders && editAssignee) {
        payload.assignedTo = editAssignee;
      }
      const res = await api.put(`/orders/${selected._id}`, payload);
      toast.success('Order updated');
      setSelected(res.data);
      loadOrders();
    } catch (err) {
      showApiError(err, 'Could not update order.');
    } finally {
      setSaving(false);
    }
  };

  const subtitle = canManageAllOrders
    ? 'All shop e-commerce orders — process inquiries and track delivery status'
    : 'Shop orders assigned to you';

  const tableHeaders = canManageAllOrders
    ? ['Order #', 'Customer', 'Items Count', 'Total Amount', 'Assigned To', 'Status', 'Date', 'Actions']
    : ['Order #', 'Customer', 'Items Count', 'Total Amount', 'Status', 'Date', 'Actions'];

  return (
    <Layout module="crm">
      <div className="p-4 sm:p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingCart className="w-7 h-7 text-solar-500" /> Shop Orders
          </h1>
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          {!canManageAllOrders && user && (
            <p className="text-xs text-solar-700 bg-solar-50 inline-block mt-2 px-3 py-1 rounded-full font-semibold">
              Representative: {user.name}
            </p>
          )}
        </div>

        <div className="card mb-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="input pl-9"
              placeholder="Search by order #, name, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="input sm:w-44" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="card">
          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading orders...</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-100">
                      {tableHeaders.map((h) => (
                        <th key={h} className="text-left py-3 px-3 font-semibold text-gray-600">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((ord) => {
                      const totalItems = ord.items.reduce((acc, i) => acc + i.quantity, 0);
                      return (
                        <tr key={ord._id} className="border-b border-gray-55 hover:bg-gray-50">
                          <td className="py-3 px-3 font-mono font-medium text-gray-800">{ord.orderNumber}</td>
                          <td className="py-3 px-3">
                            <p className="font-medium text-gray-800">{ord.customerName}</p>
                            <p className="text-xs text-gray-400">{ord.phone}</p>
                          </td>
                          <td className="py-3 px-3 text-gray-700">{totalItems}</td>
                          <td className="py-3 px-3 font-medium text-gray-850">
                            ₹{ord.totalAmount.toLocaleString('en-IN')}
                          </td>
                          {canManageAllOrders && (
                            <td className="py-3 px-3 text-gray-700">{ord.assignedTo?.name || 'Unassigned'}</td>
                          )}
                          <td className="py-3 px-3">
                            <span className={`badge ${statusBadgeClass(ord.status)}`}>{ord.status}</span>
                          </td>
                          <td className="py-3 px-3 text-gray-400 whitespace-nowrap">
                            {new Date(ord.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="py-3 px-3">
                            <button type="button" onClick={() => openDetail(ord)} className="btn-secondary p-1.5" title="View Details">
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {orders.length === 0 && (
                      <tr><td colSpan={tableHeaders.length} className="text-center py-12 text-gray-400">No orders found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <PaginationBar pagination={pagination} page={page} onPageChange={setPage} loading={loading} label="orders" />
            </>
          )}
        </div>

        {selected && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{selected.orderNumber}</h3>
                  <p className="text-xs text-gray-400 mt-1">Submitted: {new Date(selected.createdAt).toLocaleString('en-IN')}</p>
                </div>
                <button type="button" onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-sm mb-5">
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <p className="font-bold text-gray-800 text-xs uppercase tracking-wider mb-2">Customer Information</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <div><p className="text-gray-400 text-xs">Name</p><p className="font-medium text-gray-800">{selected.customerName}</p></div>
                    <div><p className="text-gray-400 text-xs">Phone</p><p className="font-medium text-gray-800">{selected.phone}</p></div>
                    <div className="col-span-2 mt-1"><p className="text-gray-400 text-xs">Address</p><p className="font-medium text-gray-800">{selected.address}, {selected.city}</p></div>
                    {selected.notes && (
                      <div className="col-span-2 mt-1"><p className="text-gray-400 text-xs">Order Notes</p><p className="font-medium text-gray-800">{selected.notes}</p></div>
                    )}
                  </div>
                </div>

                <div>
                  <p className="font-bold text-gray-800 text-xs uppercase tracking-wider mb-2">Order Items Bill of Material</p>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-400 font-semibold">
                        <th className="text-left pb-2">Item Description</th>
                        <th className="text-right pb-2 w-20">Price</th>
                        <th className="text-right pb-2 w-16">Qty</th>
                        <th className="text-right pb-2 w-24">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.items.map((item, i) => (
                        <tr key={i} className="border-b border-gray-100 text-gray-700">
                          <td className="py-2 pr-2">
                            <span className="font-medium text-gray-900">{item.itemName}</span>
                            <span className="text-[10px] bg-gray-100 text-gray-500 rounded px-1.5 py-0.5 ml-2 font-semibold uppercase">{item.category}</span>
                          </td>
                          <td className="py-2 text-right">₹{item.price.toLocaleString('en-IN')}</td>
                          <td className="py-2 text-right">{item.quantity} {item.unit}</td>
                          <td className="py-2 text-right font-medium">₹{item.total.toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-bold text-gray-900">
                        <td colSpan={3} className="pt-3 text-right">Grand Total:</td>
                        <td className="pt-3 text-right text-solar-600 text-sm">₹{selected.totalAmount.toLocaleString('en-IN')}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4 space-y-3">
                {canManageAllOrders && (
                  <div>
                    <label className="label">Assign to Coordinator</label>
                    <select className="input" value={editAssignee} onChange={(e) => setEditAssignee(e.target.value)}>
                      <option value="">Select handler...</option>
                      {assignees.map((h) => (
                        <option key={h._id} value={h._id}>
                          {h.name} ({roleLabel(h.role)})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="label">Order Status</label>
                  <select className="input" value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                    {ORDER_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <button type="button" onClick={handleUpdate} disabled={saving} className="btn-primary w-full justify-center">
                  {saving ? 'Saving...' : 'Update Order Details'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
