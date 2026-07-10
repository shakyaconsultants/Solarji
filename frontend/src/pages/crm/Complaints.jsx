import { useState, useEffect, useCallback } from 'react';
import { AlertCircle, Search, Eye, X } from 'lucide-react';
import api from '../../api/axios';
import Layout from '../../components/Layout';
import PaginationBar from '../../components/PaginationBar';
import toast from 'react-hot-toast';
import { showApiError } from '../../utils/apiError';
import { useAuth } from '../../context/AuthContext';
import { roleLabel } from '../../utils/roles';
import { COMPLAINT_STATUSES, statusBadgeClass } from '../../constants/complaints';

const PAGE_SIZE = 20;

export default function Complaints() {
  const [complaints, setComplaints] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [handlers, setHandlers] = useState([]);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editStatus, setEditStatus] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editAssignee, setEditAssignee] = useState('');
  const { canManageAllComplaints, user } = useAuth();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, debouncedSearch]);

  useEffect(() => {
    if (!canManageAllComplaints) return;
    api.get('/users/complaint-handlers')
      .then((res) => setHandlers(res.data))
      .catch(() => {});
  }, [canManageAllComplaints]);

  const loadComplaints = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/complaints', {
        params: {
          page,
          limit: PAGE_SIZE,
          status: statusFilter || undefined,
          search: debouncedSearch || undefined,
        },
      });
      setComplaints(res.data.complaints);
      setPagination(res.data.pagination);
    } catch (err) {
      showApiError(err, 'Could not load complaints.');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, debouncedSearch]);

  useEffect(() => {
    loadComplaints();
  }, [loadComplaints]);

  const openDetail = (c) => {
    setSelected(c);
    setEditStatus(c.status);
    setEditNote(c.internalNote || '');
    setEditAssignee(c.assignedTo?._id || c.assignedTo || '');
  };

  const handleUpdate = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const payload = { status: editStatus, internalNote: editNote };
      if (canManageAllComplaints && editAssignee) {
        payload.assignedTo = editAssignee;
      }
      const res = await api.put(`/complaints/${selected._id}`, payload);
      toast.success('Complaint updated');
      setSelected(res.data);
      loadComplaints();
    } catch (err) {
      showApiError(err, 'Could not update complaint.');
    } finally {
      setSaving(false);
    }
  };

  const subtitle = canManageAllComplaints
    ? 'All customer complaints — assign to employees with complaint access'
    : 'Complaints assigned to you';

  const tableHeaders = canManageAllComplaints
    ? ['Ref #', 'Customer', 'Issue', 'Assigned To', 'Status', 'Date', 'Actions']
    : ['Ref #', 'Customer', 'Issue', 'Status', 'Date', 'Actions'];

  return (
    <Layout module="crm">
      <div className="p-4 sm:p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertCircle className="w-7 h-7 text-solar-500" /> Service Complaints
          </h1>
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          {!canManageAllComplaints && user && (
            <p className="text-xs text-solar-700 bg-solar-50 inline-block mt-2 px-3 py-1 rounded-full font-semibold">
              Handler: {user.name}
            </p>
          )}
        </div>

        <div className="card mb-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="input pl-9"
              placeholder="Search by ref, name, phone, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="input sm:w-44" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {COMPLAINT_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="card">
          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading complaints...</div>
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
                    {complaints.map((c) => (
                      <tr key={c._id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-3 px-3 font-mono font-medium text-gray-800">{c.complaintNumber}</td>
                        <td className="py-3 px-3">
                          <p className="font-medium text-gray-800">{c.name}</p>
                          <p className="text-xs text-gray-400">{c.phone}</p>
                        </td>
                        <td className="py-3 px-3 text-gray-600 max-w-[180px] truncate" title={c.category}>{c.category}</td>
                        {canManageAllComplaints && (
                          <td className="py-3 px-3 text-gray-700">{c.assignedTo?.name || 'Unassigned'}</td>
                        )}
                        <td className="py-3 px-3">
                          <span className={`badge ${statusBadgeClass(c.status)}`}>{c.status}</span>
                        </td>
                        <td className="py-3 px-3 text-gray-400 whitespace-nowrap">
                          {new Date(c.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-3 px-3">
                          <button type="button" onClick={() => openDetail(c)} className="btn-secondary p-1.5" title="View">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {complaints.length === 0 && (
                      <tr><td colSpan={tableHeaders.length} className="text-center py-12 text-gray-400">No complaints found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <PaginationBar pagination={pagination} page={page} onPageChange={setPage} loading={loading} label="complaints" />
            </>
          )}
        </div>

        {selected && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{selected.complaintNumber}</h3>
                  <span className={`badge ${statusBadgeClass(selected.status)} mt-1`}>{selected.category}</span>
                </div>
                <button type="button" onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-sm mb-5">
                <div><p className="text-gray-400">Customer</p><p className="font-medium">{selected.name}</p></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-gray-400">Phone</p><p className="font-medium">{selected.phone}</p></div>
                  <div><p className="text-gray-400">Email</p><p className="font-medium break-all">{selected.email}</p></div>
                </div>
                <div><p className="text-gray-400">Address</p><p className="font-medium">{selected.address}</p></div>
                {selected.description && (
                  <div><p className="text-gray-400">Details</p><p className="font-medium">{selected.description}</p></div>
                )}
                <div><p className="text-gray-400">Submitted</p><p className="font-medium">{new Date(selected.createdAt).toLocaleString('en-IN')}</p></div>
              </div>

              <div className="border-t border-gray-100 pt-4 space-y-3">
                {canManageAllComplaints && (
                  <div>
                    <label className="label">Assign to employee</label>
                    <select className="input" value={editAssignee} onChange={(e) => setEditAssignee(e.target.value)}>
                      <option value="">Select handler...</option>
                      {handlers.map((h) => (
                        <option key={h._id} value={h._id}>
                          {h.name} ({roleLabel(h.role)})
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-1">Only employees with complaint access enabled appear here.</p>
                  </div>
                )}
                <div>
                  <label className="label">Status</label>
                  <select className="input" value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                    {COMPLAINT_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Internal note</label>
                  <textarea className="input" rows={3} value={editNote} onChange={(e) => setEditNote(e.target.value)} placeholder="Notes for team (not sent to customer)" />
                </div>
                <button type="button" onClick={handleUpdate} disabled={saving} className="btn-primary w-full justify-center">
                  {saving ? 'Saving...' : 'Update Complaint'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
