import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, UserPlus, Upload, CheckCircle2,
  FileText, CreditCard, Building, Receipt, Camera, X, Mail, Phone, Hash
} from 'lucide-react';
import api from '../../api/axios';
import Layout from '../../components/Layout';
import toast from 'react-hot-toast';
import { showApiError } from '../../utils/apiError';
import { useAuth } from '../../context/AuthContext';
import { roleLabel } from '../../utils/roles';
import { useDataCache } from '../../context/DataCacheContext';

const DOCUMENT_SLOTS = [
  { id: 'aadhaar', label: 'Aadhaar Card', icon: CreditCard, subtitle: 'Front/Back copy' },
  { id: 'pan', label: 'PAN Card', icon: CreditCard, subtitle: 'Customer PAN Card' },
  { id: 'passbook', label: 'Bank Passbook', icon: Building, subtitle: 'First page with account details' },
  { id: 'houseTax', label: 'House Tax / Property Paper', icon: FileText, subtitle: 'Tax receipt or ownership doc' },
  { id: 'electricityBill', label: 'Electricity Bill', icon: Receipt, subtitle: 'Latest bill copy' },
  { id: 'rooftopPhoto', label: 'Rooftop Photo', icon: Camera, subtitle: 'Clear photo of solar installation roof' },
];

export default function NewLead() {
  const navigate = useNavigate();
  const { canViewAllLeads } = useAuth();
  const { upsertLead, fetchAssignees, assignees } = useDataCache();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    panNumber: '',
    aadhaarNumber: '',
    address: '',
    city: '',
    requirements: '',
    systemSize: '',
    source: 'Manual',
    assignedTo: '',
  });

  // State to hold selected document files: { aadhaar: { file, previewUrl }, pan: ... }
  const [documents, setDocuments] = useState({});

  useEffect(() => {
    if (canViewAllLeads) fetchAssignees();
  }, [canViewAllLeads, fetchAssignees]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(documents).forEach(doc => {
        if (doc?.previewUrl) URL.revokeObjectURL(doc.previewUrl);
      });
    };
  }, [documents]);

  const f = (field, val) => setForm(p => ({ ...p, [field]: val }));

  const handleDocChange = (docId, file) => {
    if (!file) return;

    // Validate size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return toast.error(`${file.name} is larger than 10MB`);
    }

    // Revoke previous URL if exists
    if (documents[docId]?.previewUrl) {
      URL.revokeObjectURL(documents[docId].previewUrl);
    }

    const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
    setDocuments(prev => ({
      ...prev,
      [docId]: { file, previewUrl, name: file.name, size: (file.size / 1024 / 1024).toFixed(2) }
    }));
  };

  const removeDoc = (docId) => {
    if (documents[docId]?.previewUrl) {
      URL.revokeObjectURL(documents[docId].previewUrl);
    }
    setDocuments(prev => {
      const next = { ...prev };
      delete next[docId];
      return next;
    });
  };

  const handleNextStep = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      return toast.error('Full Name and Phone Number are required');
    }
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      setCurrentStep(1);
      return toast.error('Full Name and Phone Number are required');
    }

    setLoading(true);
    try {
      const formData = new FormData();
      Object.keys(form).forEach(key => {
        if (form[key]) formData.append(key, form[key]);
      });

      // Append documents
      Object.keys(documents).forEach(docId => {
        if (documents[docId]?.file) {
          formData.append(docId, documents[docId].file);
        }
      });

      const res = await api.post('/leads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      upsertLead(res.data);
      toast.success('Lead created successfully with documents!');
      navigate(`/crm/leads/${res.data._id}`);
    } catch (err) {
      showApiError(err, 'Could not create lead.');
    } finally {
      setLoading(false);
    }
  };

  const attachedCount = Object.keys(documents).length;

  return (
    <Layout module="crm">
      <div className="p-4 sm:p-6 max-w-3xl mx-auto">
        {/* Top Navigation Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (currentStep === 2) setCurrentStep(1);
                else navigate('/crm/leads');
              }}
              className="btn-secondary p-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Create New Lead</h1>
              <p className="text-gray-500 text-sm">Stepwise lead onboarding pipeline</p>
            </div>
          </div>

          <div className="text-xs font-semibold px-3 py-1.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200">
            Step {currentStep} of 2
          </div>
        </div>

        {/* Stepper Wizard Indicator */}
        <div className="card mb-6 p-4">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 -z-0 rounded" />
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-orange-500 transition-all duration-300 -z-0 rounded"
              style={{ width: currentStep === 1 ? '50%' : '100%' }}
            />

            {/* Step 1 Indicator */}
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className={`relative z-10 flex items-center gap-2.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                currentStep === 1
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'bg-emerald-500 text-white'
              }`}
            >
              {currentStep > 1 ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">1</span>
              )}
              <span>1. Customer Details</span>
            </button>

            {/* Step 2 Indicator */}
            <button
              type="button"
              onClick={() => {
                if (form.name && form.phone) setCurrentStep(2);
                else toast.error('Please complete Name and Phone Number first');
              }}
              className={`relative z-10 flex items-center gap-2.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                currentStep === 2
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 border border-gray-300'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-black/10 flex items-center justify-center text-[10px]">2</span>
              <span>2. Document Upload {attachedCount > 0 && `(${attachedCount})`}</span>
            </button>
          </div>
        </div>

        {/* STEP 1 FORM: Customer Details */}
        {currentStep === 1 && (
          <form onSubmit={handleNextStep} className="space-y-5">
            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                Customer Contact & Identity Details
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Full Name *</label>
                  <input
                    className="input"
                    required
                    value={form.name}
                    onChange={e => f('name', e.target.value)}
                    placeholder="e.g. Rajesh Sharma"
                  />
                </div>
                <div>
                  <label className="label">Phone Number *</label>
                  <input
                    className="input"
                    required
                    value={form.phone}
                    onChange={e => f('phone', e.target.value)}
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div>
                  <label className="label">Mail ID (Email)</label>
                  <input
                    className="input"
                    type="email"
                    value={form.email}
                    onChange={e => f('email', e.target.value)}
                    placeholder="rajesh@example.com"
                  />
                </div>
                <div>
                  <label className="label">PAN Card Number</label>
                  <input
                    className="input uppercase"
                    value={form.panNumber}
                    onChange={e => f('panNumber', e.target.value.toUpperCase())}
                    placeholder="ABCDE1234F"
                    maxLength={10}
                  />
                </div>
                <div>
                  <label className="label">Aadhaar Card Number</label>
                  <input
                    className="input"
                    value={form.aadhaarNumber}
                    onChange={e => f('aadhaarNumber', e.target.value)}
                    placeholder="1234 5678 9012"
                    maxLength={14}
                  />
                </div>
                <div>
                  <label className="label">City</label>
                  <input
                    className="input"
                    value={form.city}
                    onChange={e => f('city', e.target.value)}
                    placeholder="Kanpur"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="label">Full Address</label>
                  <input
                    className="input"
                    value={form.address}
                    onChange={e => f('address', e.target.value)}
                    placeholder="House No., Street, Landmark, Pincode"
                  />
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                Project Details & Requirements
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="label">System Size (kW)</label>
                  <input
                    className="input"
                    value={form.systemSize}
                    onChange={e => f('systemSize', e.target.value)}
                    placeholder="e.g. 5 kW, 10 kW"
                  />
                </div>
                <div>
                  <label className="label">Lead Source</label>
                  <select
                    className="input"
                    value={form.source}
                    onChange={e => f('source', e.target.value)}
                  >
                    {['Manual', 'WhatsApp', 'Facebook', 'Instagram', 'Referral', 'Walk-in', 'Phone Call', 'Website'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="label">Requirements / Site Notes</label>
                  <textarea
                    className="input"
                    rows={3}
                    value={form.requirements}
                    onChange={e => f('requirements', e.target.value)}
                    placeholder="Shadow free area, roof type, sanction load, etc."
                  />
                </div>
              </div>
            </div>

            {canViewAllLeads && (
              <div className="card">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500" />
                  Lead Assignment
                </h3>
                <div>
                  <label className="label">Assign To</label>
                  <select
                    className="input"
                    value={form.assignedTo}
                    onChange={e => f('assignedTo', e.target.value)}
                  >
                    <option value="">Assign to myself</option>
                    {assignees.map(u => (
                      <option key={u._id} value={u._id}>
                        {u.name} ({roleLabel(u.role)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/crm/leads')}
                className="btn-secondary flex-1 justify-center"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary flex-1 justify-center gap-2"
              >
                <span>Step 2: Upload Documents</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 2 FORM: Document Upload */}
        {currentStep === 2 && (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Step 2 Contact & Identity Verification Box */}
            <div className="card bg-orange-50/50 border-orange-200">
              <h3 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-orange-600" />
                Customer Identity & Contact Verification
              </h3>
              <div className="grid md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="label text-[11px]">Mail ID (Email)</label>
                  <input
                    className="input text-xs"
                    type="email"
                    value={form.email}
                    onChange={e => f('email', e.target.value)}
                    placeholder="Customer email address"
                  />
                </div>
                <div>
                  <label className="label text-[11px]">PAN Card Number</label>
                  <input
                    className="input text-xs uppercase"
                    value={form.panNumber}
                    onChange={e => f('panNumber', e.target.value.toUpperCase())}
                    placeholder="e.g. ABCDE1234F"
                    maxLength={10}
                  />
                </div>
                <div>
                  <label className="label text-[11px]">Phone Number</label>
                  <input
                    className="input text-xs"
                    value={form.phone}
                    onChange={e => f('phone', e.target.value)}
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div>
                  <label className="label text-[11px]">Aadhaar Card Number</label>
                  <input
                    className="input text-xs"
                    value={form.aadhaarNumber}
                    onChange={e => f('aadhaarNumber', e.target.value)}
                    placeholder="e.g. 1234 5678 9012"
                  />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">Document Upload</h3>
                  <p className="text-gray-500 text-xs mt-0.5">
                    Upload customer KYC and rooftop documents (Upload now or add later).
                  </p>
                </div>
                {attachedCount > 0 && (
                  <span className="badge bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold">
                    {attachedCount} attached
                  </span>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {DOCUMENT_SLOTS.map((slot) => {
                  const Icon = slot.icon;
                  const doc = documents[slot.id];
                  const hasFile = Boolean(doc?.file);

                  return (
                    <div
                      key={slot.id}
                      className={`border rounded-xl p-4 transition-all relative ${
                        hasFile
                          ? 'border-emerald-500 bg-emerald-50/40 shadow-sm'
                          : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-lg ${hasFile ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm text-gray-900">{slot.label}</h4>
                            <p className="text-xs text-gray-500">{slot.subtitle}</p>
                          </div>
                        </div>

                        {hasFile && (
                          <button
                            type="button"
                            onClick={() => removeDoc(slot.id)}
                            className="text-gray-400 hover:text-red-600 p-1 rounded-full hover:bg-red-50 transition-colors"
                            title="Remove file"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {hasFile ? (
                        <div className="mt-3 flex items-center gap-3 bg-white p-2.5 rounded-lg border border-emerald-200">
                          {doc.previewUrl ? (
                            <img
                              src={doc.previewUrl}
                              alt={slot.label}
                              className="w-12 h-12 object-cover rounded-md border border-gray-200"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-md bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs">
                              DOC
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-800 truncate">{doc.name}</p>
                            <p className="text-[11px] text-gray-500">{doc.size} MB</p>
                          </div>
                          <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Attached
                          </span>
                        </div>
                      ) : (
                        <label className="mt-3 flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 hover:border-orange-400 rounded-lg p-3 cursor-pointer bg-white transition-colors group">
                          <Upload className="w-4 h-4 text-gray-400 group-hover:text-orange-500" />
                          <span className="text-xs font-medium text-gray-600 group-hover:text-orange-600">
                            Choose File / Image
                          </span>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*,.pdf"
                            onChange={(e) => handleDocChange(slot.id, e.target.files?.[0])}
                          />
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="btn-secondary flex-1 justify-center gap-2"
                disabled={loading}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Customer Details</span>
              </button>
              <button
                type="submit"
                className="btn-primary flex-1 justify-center gap-2"
                disabled={loading}
              >
                <UserPlus className="w-4 h-4" />
                <span>{loading ? 'Creating Lead...' : 'Complete & Create Lead'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </Layout>
  );
}
