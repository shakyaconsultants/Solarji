import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus } from 'lucide-react';
import api from '../../api/axios';
import Layout from '../../components/Layout';
import toast from 'react-hot-toast';
import { showApiError } from '../../utils/apiError';
import { useAuth } from '../../context/AuthContext';
import { roleLabel } from '../../utils/roles';
import { useDataCache } from '../../context/DataCacheContext';

export default function NewLead() {
  const navigate = useNavigate();
  const { canViewAllLeads } = useAuth();
  const { upsertLead, fetchAssignees, assignees } = useDataCache();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', phone: '', email: '', address: '', city: '',
    requirements: '', systemSize: '', source: 'Manual', assignedTo: '',
  });

  useEffect(() => {
    if (canViewAllLeads) fetchAssignees();
  }, [canViewAllLeads, fetchAssignees]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone) return toast.error('Name and phone are required');
    setLoading(true);
    try {
      const payload = { ...form };
      if (!payload.assignedTo) delete payload.assignedTo;
      const res = await api.post('/leads', payload);
      upsertLead(res.data);
      toast.success('Lead created successfully!');
      navigate(`/crm/leads/${res.data._id}`);
    } catch (err) {
      showApiError(err, 'Could not create lead.');
    } finally {
      setLoading(false);
    }
  };

  const f = (field, val) => setForm(p => ({ ...p, [field]: val }));

  return (
    <Layout module="crm">
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/crm/leads')} className="btn-secondary p-2">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Create New Lead</h1>
            <p className="text-gray-500 text-sm">Add a new customer lead to the pipeline</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="card">
            <h3 className="font-semibold text-gray-700 mb-4">Customer Information</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">Full Name *</label>
                <input className="input" required value={form.name} onChange={e => f('name', e.target.value)} placeholder="Customer's full name" />
              </div>
              <div>
                <label className="label">Phone Number *</label>
                <input className="input" required value={form.phone} onChange={e => f('phone', e.target.value)} placeholder="+91 XXXXX XXXXX" />
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" value={form.email} onChange={e => f('email', e.target.value)} placeholder="email@example.com" />
              </div>
              <div>
                <label className="label">City</label>
                <input className="input" value={form.city} onChange={e => f('city', e.target.value)} placeholder="Kanpur" />
              </div>
              <div className="md:col-span-2">
                <label className="label">Address</label>
                <input className="input" value={form.address} onChange={e => f('address', e.target.value)} placeholder="Full address" />
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-700 mb-4">Project Details</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">System Size</label>
                <input className="input" value={form.systemSize} onChange={e => f('systemSize', e.target.value)} placeholder="e.g. 5 kW, 10 kW" />
              </div>
              <div>
                <label className="label">Lead Source</label>
                <select className="input" value={form.source} onChange={e => f('source', e.target.value)}>
                  {['Manual', 'WhatsApp', 'Facebook', 'Instagram', 'Referral', 'Walk-in', 'Phone Call', 'Website'].map(s =>
                    <option key={s} value={s}>{s}</option>
                  )}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="label">Requirements / Notes</label>
                <textarea className="input" rows={3} value={form.requirements} onChange={e => f('requirements', e.target.value)} placeholder="Customer requirements, site details, etc." />
              </div>
            </div>
          </div>

          {canViewAllLeads && (
            <div className="card">
              <h3 className="font-semibold text-gray-700 mb-4">Assignment</h3>
              <div>
                <label className="label">Assign To</label>
                <select className="input" value={form.assignedTo} onChange={e => f('assignedTo', e.target.value)}>
                  <option value="">Assign to myself</option>
                  {assignees.map(u => <option key={u._id} value={u._id}>{u.name} ({roleLabel(u.role)})</option>)}
                </select>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={() => navigate('/crm/leads')} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" className="btn-primary flex-1 justify-center" disabled={loading}>
              <UserPlus className="w-4 h-4" />
              {loading ? 'Creating...' : 'Create Lead'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
