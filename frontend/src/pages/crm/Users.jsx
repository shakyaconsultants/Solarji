import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, X, Eye, EyeOff, RotateCcw, Search } from 'lucide-react';
import api from '../../api/axios';
import { hashPassword } from '../../api/crypto';
import Layout from '../../components/Layout';
import PaginationBar from '../../components/PaginationBar';
import toast from 'react-hot-toast';
import { showApiError } from '../../utils/apiError';
import { useAuth } from '../../context/AuthContext';
import { useDataCache } from '../../context/DataCacheContext';
import { roleLabel, roleBadgeClass, ALL_ROLES } from '../../utils/roles';

const PAGE_SIZE = 20;

export default function Users() {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useAuth();
  const { invalidateDashboardCrm, invalidateAssignees } = useDataCache();

  const emptyForm = { name: '', email: '', password: '', role: 'user', phone: '', empCode: '', isActive: true, handlesComplaints: false };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/users', {
        params: { page, limit: PAGE_SIZE, search: debouncedSearch || undefined },
      });
      setUsers(res.data.users);
      setPagination(res.data.pagination);
    } catch (err) {
      showApiError(err, 'Could not load users.');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (u) => {
    setEditing(u);
    setForm({ name: u.name, email: u.email, password: '', role: u.role, phone: u.phone || '', empCode: u.empCode || '', isActive: u.isActive, handlesComplaints: Boolean(u.handlesComplaints) });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) return toast.error('Name and email required');
    if (!editing && !form.password) return toast.error('Password required for new user');
    setSaving(true);
    try {
      const payload = { ...form };
      if (payload.password) {
        payload.password = await hashPassword(payload.password);
      } else {
        delete payload.password;
      }
      if (editing) {
        await api.put(`/users/${editing._id}`, payload);
        toast.success('User updated');
      } else {
        await api.post('/users', payload);
        toast.success('User created');
      }
      invalidateAssignees();
      setShowModal(false);
      loadUsers();
    } catch (err) {
      showApiError(err, 'Could not save user.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete user "${name}"?`)) return;
    try {
      await api.delete(`/users/${id}`);
      invalidateAssignees();
      toast.success('User deleted');
      loadUsers();
    } catch (err) {
      showApiError(err, 'Could not delete user.');
    }
  };

  const f = (field, val) => setForm(p => ({ ...p, [field]: val }));

  const handleResetAllPoints = async () => {
    if (!window.confirm('Reset reward points to 0 for ALL team members?')) return;
    try {
      await api.post('/users/reset-points');
      invalidateDashboardCrm();
      toast.success('All reward points reset');
      loadUsers();
    } catch (err) {
      showApiError(err, 'Could not reset reward points.');
    }
  };

  const handleResetUserPoints = async (id, name) => {
    if (!window.confirm(`Reset reward points for "${name}"?`)) return;
    try {
      await api.post(`/users/${id}/reset-points`);
      setUsers((prev) => prev.map((u) => (u._id === id ? { ...u, points: 0 } : u)));
      toast.success('Points reset');
    } catch (err) {
      showApiError(err, `Could not reset points for "${name}".`);
    }
  };

  return (
    <Layout module="crm">
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Users Management</h1>
          <div className="flex gap-2">
            <button onClick={handleResetAllPoints} className="btn-secondary">
              <RotateCcw className="w-4 h-4" /> Reset All Points
            </button>
            <button onClick={openCreate} className="btn-primary">
              <Plus className="w-4 h-4" /> Add User
            </button>
          </div>
        </div>

        <div className="card mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="input pl-9"
              placeholder="Search by name, email or employee code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="card">
          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading users...</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-100">
                      <th className="text-left py-3 px-3 font-semibold text-gray-600">Name</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-600">Email</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-600">Phone</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-600">Role</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-600">Complaints</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-600">Points</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-600">Status</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u._id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-solar-100 rounded-full flex items-center justify-center text-solar-700 font-bold text-xs">
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-gray-800 flex items-center gap-2">
                                {u.name}
                                {u._id === currentUser?._id && <span className="badge bg-solar-100 text-solar-700">You</span>}
                              </div>
                              {u.empCode && <span className="text-xs text-gray-400 font-mono">Code: {u.empCode}</span>}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-gray-600">{u.email}</td>
                        <td className="py-3 px-3 text-gray-500">{u.phone || '—'}</td>
                        <td className="py-3 px-3">
                          <span className={`badge ${roleBadgeClass(u.role)}`}>
                            {roleLabel(u.role)}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`badge ${u.handlesComplaints ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-500'}`}>
                            {u.handlesComplaints ? 'Enabled' : '—'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`font-semibold ${(u.points ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {(u.points ?? 0) >= 0 ? `+${u.points ?? 0}` : u.points ?? 0}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`badge ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {u.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex gap-2">
                            <button onClick={() => handleResetUserPoints(u._id, u.name)} className="btn-secondary p-1.5" title="Reset points">
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => openEdit(u)} className="btn-secondary p-1.5">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {u._id !== currentUser?._id && (
                              <button onClick={() => handleDelete(u._id, u.name)} className="btn-danger p-1.5">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr><td colSpan={8} className="text-center py-12 text-gray-400">No users found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <PaginationBar
                pagination={pagination}
                page={page}
                onPageChange={setPage}
                loading={loading}
                label="users"
              />
            </>
          )}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-4 sm:p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-gray-900 text-lg">{editing ? 'Edit User' : 'Create New User'}</h3>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="label">Full Name *</label>
                  <input className="input" required value={form.name} onChange={e => f('name', e.target.value)} placeholder="John Doe" />
                </div>
                <div>
                  <label className="label">Email *</label>
                  <input className="input" type="email" required value={form.email} onChange={e => f('email', e.target.value)} placeholder="john@solarji.com" />
                </div>
                <div>
                  <label className="label">{editing ? 'New Password (leave blank to keep)' : 'Password *'}</label>
                  <div className="relative">
                    <input
                      className="input pr-10"
                      type={showPass ? 'text' : 'password'}
                      value={form.password}
                      onChange={e => f('password', e.target.value)}
                      placeholder="••••••••"
                      required={!editing}
                    />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" onClick={() => setShowPass(!showPass)}>
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Role</label>
                    <select className="input" value={form.role} onChange={e => f('role', e.target.value)}>
                      {ALL_ROLES.map(({ value, label }) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Employee Code</label>
                    <input className="input" value={form.empCode} onChange={e => f('empCode', e.target.value)} placeholder="EMP001" />
                  </div>
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input className="input" value={form.phone} onChange={e => f('phone', e.target.value)} placeholder="+91 XXXXX" />
                </div>
                {editing && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={form.isActive}
                      onChange={e => f('isActive', e.target.checked)}
                      className="w-4 h-4 text-solar-500"
                    />
                    <label htmlFor="isActive" className="text-sm text-gray-700">Active User</label>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="handlesComplaints"
                    checked={form.handlesComplaints}
                    onChange={e => f('handlesComplaints', e.target.checked)}
                    className="w-4 h-4 text-solar-500"
                  />
                  <label htmlFor="handlesComplaints" className="text-sm text-gray-700">
                    Service complaints access (can receive &amp; handle customer complaints)
                  </label>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                  <button type="submit" className="btn-primary flex-1 justify-center" disabled={saving}>
                    {saving ? 'Saving...' : editing ? 'Update User' : 'Create User'}
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
