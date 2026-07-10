import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Send, CheckCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';
import logo from '../../assets/solarji logo.jpeg';
import { COMPLAINT_CATEGORIES } from '../../constants/complaints';
import { API_BASE_URL } from '../../config/api';
import { getApiErrorMessage } from '../../utils/apiError';

const ORANGE = '#f7941d';
const BLACK = '#111111';

export default function RegisterComplaint() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    category: '',
    name: '',
    phone: '',
    email: '',
    address: '',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  const f = (field, val) => setForm((p) => ({ ...p, [field]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.category || !form.name || !form.phone || !form.email || !form.address) {
      setError('Please fill all required fields marked with *');
      return;
    }
    setSubmitting(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/complaints`, form);
      setSuccess(res.data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not register complaint. Please try again or call us.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    const { complaint, emailSent } = success;
    return (
      <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", minHeight: '100vh', background: '#f9fafb' }}>
        <header style={{ background: '#fff', borderBottom: '1px solid #eee', padding: '16px 24px' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', width: 'fit-content' }}>
            <img src={logo} alt="SolarJi" style={{ width: 36, height: 36, borderRadius: 10, border: `2px solid ${ORANGE}` }} />
            <span style={{ fontWeight: 900, color: BLACK }}>SolarJi</span>
          </Link>
        </header>
        <div className="max-w-lg mx-auto px-4 py-12">
          <div className="card text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Complaint Registered</h1>
            <p className="text-gray-500 mb-6">Thank you, {form.name}. We have received your service request.</p>
            <div className="bg-gray-50 rounded-xl p-5 text-left mb-6 space-y-3">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase">Reference Number</p>
                <p className="text-xl font-mono font-bold text-gray-900">{complaint.complaintNumber}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase">Issue</p>
                <p className="font-medium text-gray-800">{complaint.category}</p>
              </div>
              {emailSent && (
                <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
                  A confirmation email has been sent to <strong>{form.email}</strong>
                </p>
              )}
              {!emailSent && (
                <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                  Save your reference number. Email confirmation could not be sent at this time.
                </p>
              )}
            </div>
            <p className="text-sm text-gray-500 mb-6">Our team will review your complaint and contact you shortly.</p>
            <button type="button" onClick={() => navigate('/')} className="btn-primary w-full justify-center">
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", minHeight: '100vh', background: '#f9fafb' }}>
      <header style={{ background: '#fff', borderBottom: '1px solid #eee', padding: '16px 24px', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <img src={logo} alt="SolarJi" style={{ width: 36, height: 36, borderRadius: 10, border: `2px solid ${ORANGE}` }} />
            <span style={{ fontWeight: 900, color: BLACK }}>SolarJi</span>
          </Link>
          <button type="button" onClick={() => navigate('/')} className="btn-secondary text-sm py-2 px-3">
            <ArrowLeft className="w-4 h-4" /> Home
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-bold mb-4">
            <AlertCircle className="w-3.5 h-3.5" /> Customer Support
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Register a Complaint</h1>
          <p className="text-gray-500 max-w-md mx-auto">
            Facing an issue with your solar system? Submit your details and our service team will assist you promptly.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700 text-sm font-medium px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <div>
            <label className="label">Issue Category *</label>
            <select className="input" required value={form.category} onChange={(e) => f('category', e.target.value)}>
              <option value="">Select issue type...</option>
              {COMPLAINT_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Name (Registered) *</label>
              <input className="input" required value={form.name} onChange={(e) => f('name', e.target.value)} placeholder="Full name as registered" />
            </div>
            <div>
              <label className="label">Phone Number (Registered) *</label>
              <input className="input" required type="tel" value={form.phone} onChange={(e) => f('phone', e.target.value)} placeholder="+91 XXXXX XXXXX" />
            </div>
          </div>

          <div>
            <label className="label">Email *</label>
            <input className="input" required type="email" value={form.email} onChange={(e) => f('email', e.target.value)} placeholder="your@email.com" />
          </div>

          <div>
            <label className="label">Address *</label>
            <textarea className="input min-h-[88px]" required value={form.address} onChange={(e) => f('address', e.target.value)} placeholder="Installation / service address" rows={3} />
          </div>

          <div>
            <label className="label">Additional Details (optional)</label>
            <textarea className="input" value={form.description} onChange={(e) => f('description', e.target.value)} placeholder="Describe the issue, error codes, when it started..." rows={3} />
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full justify-center py-3 text-base">
            {submitting ? 'Submitting...' : <><Send className="w-4 h-4" /> Submit Complaint</>}
          </button>

          <p className="text-xs text-center text-gray-400">
            By submitting, you confirm the contact details are registered with SolarJi.
          </p>
        </form>

        <div className="mt-8 card text-sm text-gray-600 text-center">
          <p>Need urgent help? Contact our support team after submitting your complaint reference number.</p>
        </div>
      </div>
    </div>
  );
}
