import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, UserPlus, Upload, CheckCircle2,
  FileText, CreditCard, Building, Receipt, Camera, X, Mail, Phone, Hash,
  Package, Sun, Zap, Layers, Plus, Check, Info, Sparkles, ChevronDown, ChevronUp,
  Edit3, Trash2, IndianRupee, Eye, HelpCircle
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

const CATEGORIES = [
  'Solar Panel',
  'Inverter',
  'Structure',
  'Wire/Cable',
  'ACDB/DCDB',
  'Earthing & Lightning',
  'Accessories',
  'BOS',
  'Battery',
  'General',
];

const categoryColors = {
  'Solar Panel': 'bg-amber-100 text-amber-800 border-amber-200',
  'Inverter': 'bg-blue-100 text-blue-800 border-blue-200',
  'Structure': 'bg-orange-100 text-orange-800 border-orange-200',
  'Wire/Cable': 'bg-purple-100 text-purple-800 border-purple-200',
  'ACDB/DCDB': 'bg-teal-100 text-teal-800 border-teal-200',
  'Earthing & Lightning': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Accessories': 'bg-slate-100 text-slate-800 border-slate-200',
  'BOS': 'bg-zinc-100 text-zinc-800 border-zinc-200',
  'Battery': 'bg-red-100 text-red-800 border-red-200',
  'General': 'bg-gray-100 text-gray-800 border-gray-200',
};

const QUICK_MATERIALS = [
  'Havells ACDB & DCDB Box',
  '4mm Polycab DC Solar Wire (50m)',
  '10mm Copper Earth Wire (25m)',
  'Chemical Earthing Kit (3 Rods + BFC)',
  'Copper Lightning Arrester (ESE)',
  'Bi-directional Net Meter',
  'Luminous Solar Battery 150Ah',
  'MC4 Connectors Pair (Pack of 10)',
  'PVC Flexible Conduit Pipes (50m)',
];

const COMMON_CAPACITIES = ['2 kW', '3 kW', '4 kW', '5 kW', '6 kW', '8 kW', '10 kW', '12 kW', '15 kW', '20 kW'];

export default function NewLead() {
  const navigate = useNavigate();
  const { canViewAllLeads, canManageStockItems, isAdmin } = useAuth();
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
    panel: '',
    inverter: '',
    structure: '',
    otherMaterials: '',
    plantCost: '',
    source: 'Manual',
    referralName: '',
    assignedTo: '',
    loadGroup: '',
    loadGroupName: '',
  });

  const [stockItems, setStockItems] = useState([]);
  const [loadGroups, setLoadGroups] = useState([]);
  const [loadMode, setLoadMode] = useState('group'); // 'group' | 'manual'
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [showBomDetails, setShowBomDetails] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newGroupForm, setNewGroupForm] = useState({
    name: '',
    load: '',
    systemType: 'On-Grid',
    description: '',
    items: [
      { item: '', itemName: '', category: 'Solar Panel', quantity: 6, unit: 'piece', price: 0, notes: '' },
      { item: '', itemName: '', category: 'Inverter', quantity: 1, unit: 'piece', price: 0, notes: '' },
      { item: '', itemName: '', category: 'Structure', quantity: 1, unit: 'set', price: 0, notes: '' },
    ]
  });

  // State to hold selected document files: { aadhaar: { file, previewUrl }, pan: ... }
  const [documents, setDocuments] = useState({});

  useEffect(() => {
    if (canViewAllLeads) fetchAssignees();
    api.get('/stock/public/items')
      .then(res => setStockItems(res.data.items || []))
      .catch(err => console.error('Could not fetch stock items:', err));
    api.get('/stock/public/groups')
      .then(res => {
        const groups = res.data.groups || [];
        setLoadGroups(groups);
        if (groups.length === 0) {
          setLoadMode('manual');
        }
      })
      .catch(err => {
        console.error('Could not fetch load groups:', err);
        setLoadMode('manual');
      });
  }, [canViewAllLeads, fetchAssignees]);

  const applyLoadGroup = (group) => {
    if (!group) return;
    setSelectedGroupId(group._id);
    setLoadMode('group');

    const panels = (group.items || []).filter(i => i.category === 'Solar Panel');
    const inverters = (group.items || []).filter(i => i.category === 'Inverter');
    const structures = (group.items || []).filter(i => i.category === 'Structure');
    const others = (group.items || []).filter(i => !['Solar Panel', 'Inverter', 'Structure'].includes(i.category));

    const panelStr = panels.map(p => `${p.quantity}x ${p.itemName}`).join(', ');
    const inverterStr = inverters.map(inv => `${inv.quantity}x ${inv.itemName}`).join(', ');
    const structureStr = structures.map(s => `${s.quantity} ${s.unit || 'set'} ${s.itemName}`).join(', ');
    const othersStr = others.map(o => `${o.quantity} ${o.unit || ''} ${o.itemName}`).join(', ');

    setForm(prev => ({
      ...prev,
      loadGroup: group._id,
      loadGroupName: `${group.load} - ${group.name}`,
      systemSize: group.load || prev.systemSize,
      plantCost: group.totalEstimatedCost ? String(group.totalEstimatedCost) : prev.plantCost,
      panel: panelStr || prev.panel,
      inverter: inverterStr || prev.inverter,
      structure: structureStr || prev.structure,
      otherMaterials: othersStr || prev.otherMaterials,
    }));

    toast.success(`Applied ${group.load} (${group.name}) kit specifications!`);
  };

  const switchToManual = () => {
    setLoadMode('manual');
    setSelectedGroupId('');
    setForm(prev => ({
      ...prev,
      loadGroup: '',
      loadGroupName: '',
    }));
    toast('Switched to manual load entry. You can customize all fields.', { icon: '✍️' });
  };

  const appendMaterial = (mat) => {
    setForm(prev => {
      const existing = (prev.otherMaterials || '').trim();
      if (!existing) return { ...prev, otherMaterials: mat };
      if (existing.toLowerCase().includes(mat.toLowerCase())) {
        toast('Already added in other materials', { icon: 'ℹ️' });
        return prev;
      }
      return { ...prev, otherMaterials: `${existing}, ${mat}` };
    });
    toast.success(`Appended "${mat}"!`);
  };

  const selectCapacity = (cap) => {
    if (loadMode === 'group') {
      const matched = loadGroups.find(lg => lg.load?.toLowerCase().trim() === cap.toLowerCase().trim());
      if (matched) {
        applyLoadGroup(matched);
        return;
      }
    }
    f('systemSize', cap);
  };

  const openNewGroupModal = () => {
    setNewGroupForm({
      name: '',
      load: form.systemSize || '',
      systemType: 'On-Grid',
      description: '',
      items: [
        { item: '', itemName: form.panel || '', category: 'Solar Panel', quantity: 6, unit: 'piece', price: 0, notes: '' },
        { item: '', itemName: form.inverter || '', category: 'Inverter', quantity: 1, unit: 'piece', price: 0, notes: '' },
        { item: '', itemName: form.structure || '', category: 'Structure', quantity: 1, unit: 'set', price: 0, notes: '' },
      ]
    });
    setShowCreateGroupModal(true);
  };

  const updateNewGroupRow = (idx, field, val) => {
    const updated = [...newGroupForm.items];
    updated[idx] = { ...updated[idx], [field]: val };
    setNewGroupForm(p => ({ ...p, items: updated }));
  };

  const handleNewGroupItemSelect = (idx, stockItemId) => {
    const selectedItem = stockItems.find(i => i._id === stockItemId);
    const updated = [...newGroupForm.items];
    if (selectedItem) {
      updated[idx] = {
        ...updated[idx],
        item: selectedItem._id,
        itemName: selectedItem.name,
        category: selectedItem.category || 'General',
        unit: selectedItem.unit || 'piece',
        price: selectedItem.sellPrice || selectedItem.purchasePrice || 0,
      };
    } else {
      updated[idx] = {
        ...updated[idx],
        item: '',
      };
    }
    setNewGroupForm(p => ({ ...p, items: updated }));
  };

  const addNewGroupRow = () => {
    setNewGroupForm(p => ({
      ...p,
      items: [...p.items, { item: '', itemName: '', category: 'General', quantity: 1, unit: 'piece', price: 0, notes: '' }]
    }));
  };

  const removeNewGroupRow = (idx) => {
    if (newGroupForm.items.length <= 1) return;
    setNewGroupForm(p => ({
      ...p,
      items: p.items.filter((_, i) => i !== idx)
    }));
  };

  const handleCreateNewGroupSubmit = async (e) => {
    e.preventDefault();
    if (!newGroupForm.name.trim() || !newGroupForm.load.trim()) {
      return toast.error('Group Name and System Load (e.g. 3 kW) are required');
    }
    const validItems = newGroupForm.items.filter(i => i.itemName.trim());
    if (validItems.length === 0) {
      return toast.error('Please add at least one component with a name');
    }

    setCreatingGroup(true);
    try {
      const res = await api.post('/stock/groups', {
        name: newGroupForm.name.trim(),
        load: newGroupForm.load.trim(),
        systemType: newGroupForm.systemType,
        description: newGroupForm.description.trim(),
        items: validItems,
      });

      const created = res.data;
      setLoadGroups(prev => [...prev, created]);
      applyLoadGroup(created);
      setShowCreateGroupModal(false);
      toast.success(`Load Group "${created.name}" created and applied to this lead!`);
    } catch (err) {
      showApiError(err, 'Could not create load group.');
    } finally {
      setCreatingGroup(false);
    }
  };

  const selectedGroup = loadGroups.find(lg => lg._id === selectedGroupId) || null;
  const newGroupTotalCost = newGroupForm.items.reduce((acc, i) => acc + ((Number(i.quantity) || 0) * (Number(i.price) || 0)), 0);

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

            {/* Card 2: Lead Source & Site Requirements */}
            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                Lead Source & Site Requirements
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
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
                <div>
                  <label className="label">Referral Name (Optional)</label>
                  <input
                    type="text"
                    className="input"
                    value={form.referralName}
                    onChange={e => f('referralName', e.target.value)}
                    placeholder="e.g. Person / Partner who referred"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="label">Requirements / Site Notes</label>
                  <textarea
                    className="input"
                    rows={2}
                    value={form.requirements}
                    onChange={e => f('requirements', e.target.value)}
                    placeholder="Shadow free area, roof type, sanction load, client preferences, etc."
                  />
                </div>
              </div>
            </div>

            {/* Card 3: Dedicated Load Management & System Equipment Section */}
            <div className="card border-orange-200/90 bg-gradient-to-br from-orange-50/30 via-white to-white shadow-xs">
              {/* Header with Title and Mode Switcher */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-orange-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-orange-100 text-orange-600 shadow-2xs">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900 text-base">
                        Load Management & System Equipment
                      </h3>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        loadMode === 'group'
                          ? 'bg-orange-100 text-orange-800 border-orange-200'
                          : 'bg-blue-100 text-blue-800 border-blue-200'
                      }`}>
                        {loadMode === 'group' ? '⚡ Load Group Active' : '✍️ Manual Entry Active'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Use predefined load group templates or enter capacity and equipment manually
                    </p>
                  </div>
                </div>

                {/* Mode Selector Buttons */}
                <div className="inline-flex rounded-lg p-1 bg-gray-100 border border-gray-200 self-start sm:self-auto text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setLoadMode('group');
                      if (loadGroups.length > 0 && !selectedGroupId) {
                        applyLoadGroup(loadGroups[0]);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                      loadMode === 'group'
                        ? 'bg-white text-orange-600 shadow-xs font-bold'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Use Load Group</span>
                  </button>

                  <button
                    type="button"
                    onClick={switchToManual}
                    className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                      loadMode === 'manual'
                        ? 'bg-white text-orange-600 shadow-xs font-bold'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Add Manually</span>
                  </button>
                </div>
              </div>

              {/* Group Mode Controls */}
              {loadMode === 'group' && (
                <div className="space-y-3 mb-5">
                  <div className="p-3 bg-white border border-orange-200/90 rounded-xl shadow-2xs space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                        <span className="text-sm">⚡</span>
                        <span>Select Decided Load Group (BOM Kit):</span>
                      </label>
                      <div className="flex items-center gap-2">
                        {canManageStockItems && (
                          <button
                            type="button"
                            onClick={openNewGroupModal}
                            className="text-xs text-orange-600 hover:text-orange-700 font-bold flex items-center gap-1 hover:underline"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Add New Group</span>
                          </button>
                        )}
                        <span className="text-[10.5px] text-gray-400">
                          {loadGroups.length} available template{loadGroups.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-2">
                        <select
                          className="input bg-white font-semibold text-gray-800"
                          value={selectedGroupId}
                          onChange={(e) => {
                            const g = loadGroups.find(lg => lg._id === e.target.value);
                            if (g) applyLoadGroup(g);
                          }}
                        >
                          <option value="">-- Choose a Load Group Template --</option>
                          {loadGroups.map(lg => (
                            <option key={lg._id} value={lg._id}>
                              {lg.load} — {lg.name} ({lg.systemType || 'On-Grid'}) • ₹{(lg.totalEstimatedCost || 0).toLocaleString('en-IN')}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={switchToManual}
                        className="btn-secondary text-xs justify-center hover:border-orange-400"
                        title="Customize load manually instead"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-gray-500" />
                        <span>Switch to Manual Entry</span>
                      </button>
                    </div>

                    {/* Quick Select Buttons */}
                    {loadGroups.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[11px] font-bold text-gray-500 mr-1">Quick Select:</span>
                        {loadGroups.map(lg => {
                          const isSelected = selectedGroupId === lg._id;
                          return (
                            <button
                              key={lg._id}
                              type="button"
                              onClick={() => applyLoadGroup(lg)}
                              className={`text-xs py-1 px-2.5 rounded-lg font-bold border transition-all ${
                                isSelected
                                  ? 'bg-orange-500 text-white border-orange-600 shadow-xs'
                                  : 'bg-orange-50/50 text-gray-700 border-orange-200 hover:border-orange-400 hover:bg-orange-100/70'
                              }`}
                            >
                              {lg.load} <span className="opacity-75 font-normal text-[10px]">({lg.name})</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Selected Group Details Card */}
                  {selectedGroup && (
                    <div className="p-3 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-white border border-orange-200 rounded-xl space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-lg bg-orange-500 text-white font-extrabold text-xs shadow-2xs">
                            {selectedGroup.load}
                          </span>
                          <div>
                            <p className="font-bold text-gray-900 text-xs">{selectedGroup.name}</p>
                            <p className="text-[10.5px] text-gray-500">
                              System Type: <span className="font-semibold text-gray-700">{selectedGroup.systemType || 'On-Grid'}</span>
                              {selectedGroup.description && ` • ${selectedGroup.description}`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-medium">Kit Est. Cost</span>
                            <span className="text-xs font-black text-orange-600">
                              ₹{(selectedGroup.totalEstimatedCost || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowBomDetails(!showBomDetails)}
                            className="btn-secondary py-1 px-2.5 text-xs font-semibold gap-1"
                          >
                            <Eye className="w-3.5 h-3.5 text-orange-500" />
                            <span>{showBomDetails ? 'Hide BOM' : `View BOM (${selectedGroup.items?.length || 0})`}</span>
                          </button>
                        </div>
                      </div>

                      {/* Expandable BOM Table */}
                      {showBomDetails && (
                        <div className="mt-2 pt-2 border-t border-orange-200/80 overflow-x-auto">
                          <p className="text-[10.5px] font-bold text-orange-900 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                            <span>📦 Kit Bill of Materials:</span>
                          </p>
                          <table className="w-full text-left text-xs border border-orange-100 rounded-lg overflow-hidden">
                            <thead className="bg-orange-100/60 text-orange-950 text-[10.5px] font-bold">
                              <tr>
                                <th className="p-1.5">Category</th>
                                <th className="p-1.5">Component / Item Name</th>
                                <th className="p-1.5 text-center">Qty</th>
                                <th className="p-1.5 text-right">Est. Rate</th>
                                <th className="p-1.5 text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-orange-100 bg-white">
                              {(selectedGroup.items || []).map((it, idx) => (
                                <tr key={idx} className="hover:bg-orange-50/40">
                                  <td className="p-1.5">
                                    <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold border ${categoryColors[it.category] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                                      {it.category || 'General'}
                                    </span>
                                  </td>
                                  <td className="p-1.5 font-medium text-gray-900">{it.itemName}</td>
                                  <td className="p-1.5 text-center font-bold text-gray-700">{it.quantity} {it.unit || 'pcs'}</td>
                                  <td className="p-1.5 text-right text-gray-600">₹{(Number(it.price) || 0).toLocaleString('en-IN')}</td>
                                  <td className="p-1.5 text-right font-bold text-orange-600">
                                    ₹{((Number(it.quantity) || 0) * (Number(it.price) || 0)).toLocaleString('en-IN')}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      <div className="bg-white/80 border border-orange-200/60 rounded-lg p-2 text-[11px] text-orange-950 flex items-center gap-2">
                        <span>💡</span>
                        <span>
                          Standard components have been populated below. You can freely edit or fine-tune any field or append extra materials manually.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Manual Mode Info Banner */}
              {loadMode === 'manual' && (
                <div className="mb-4 p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs text-blue-900 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold flex items-center gap-1.5">
                      <span>✍️</span> Custom Load & Manual Equipment Entry:
                    </span>
                    {loadGroups.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setLoadMode('group');
                          if (loadGroups.length > 0) applyLoadGroup(loadGroups[0]);
                        }}
                        className="text-[11px] text-blue-700 hover:text-blue-900 font-bold underline"
                      >
                        ⚡ Switch to Decided Load Group
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-blue-800">
                    Enter custom load capacity, plant cost, and choose materials directly from inventory or type custom brand/model specifications.
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10.5px] font-bold text-blue-700 mr-1">Quick Capacities:</span>
                    {COMMON_CAPACITIES.map(cap => (
                      <button
                        key={cap}
                        type="button"
                        onClick={() => selectCapacity(cap)}
                        className="text-[10.5px] py-0.5 px-2 bg-white text-blue-700 font-semibold rounded border border-blue-200 hover:bg-blue-100"
                      >
                        {cap}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* System Capacity & Plant Cost Inputs */}
              <div className="grid md:grid-cols-2 gap-4 mb-4 p-3 bg-gray-50/70 border border-gray-200 rounded-xl">
                <div>
                  <label className="label flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-bold text-gray-800">
                      <Zap className="w-3.5 h-3.5 text-orange-500" />
                      System Size / Capacity (kW)
                    </span>
                    <span className="text-[10px] text-gray-400 font-normal">e.g. 3 kW, 5 kW</span>
                  </label>
                  <input
                    className="input bg-white font-semibold"
                    value={form.systemSize}
                    onChange={e => f('systemSize', e.target.value)}
                    placeholder="e.g. 3 kW, 5 kW, 10 kW"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Solar plant sanctioned or installation load capacity</p>
                </div>

                <div>
                  <label className="label flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-bold text-gray-800">
                      <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                      Total Plant Cost (₹)
                    </span>
                    <span className="text-[10px] text-gray-400 font-normal">Quoted price to client</span>
                  </label>
                  <input
                    className="input bg-white font-semibold"
                    type="number"
                    min="0"
                    value={form.plantCost}
                    onChange={e => f('plantCost', e.target.value)}
                    placeholder="e.g. 185000"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Total deal amount (auto-set from group or custom negotiated rate)</p>
                </div>
              </div>

              {/* Equipment Breakdown Fields */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-orange-600" />
                    <span>Materials & Equipment Specifications (Editable & Addable Manually)</span>
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Optional — Can be modified anytime
                  </span>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="label flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Sun className="w-3.5 h-3.5 text-orange-500" />
                        Solar Panel Model
                      </span>
                      <span className="text-[10px] text-gray-400 font-normal">Optional</span>
                    </label>
                    <input
                      className="input bg-white"
                      list="panelOptions"
                      value={form.panel}
                      onChange={e => f('panel', e.target.value)}
                      placeholder="e.g. 6x Adani 550W Mono PERC / Loom Solar"
                    />
                    <datalist id="panelOptions">
                      {stockItems.filter(i => i.category === 'Solar Panel').map(i => (
                        <option key={i._id} value={i.name} />
                      ))}
                    </datalist>
                    <p className="text-[10px] text-gray-400 mt-1">Select from inventory or enter custom panel model & wattage</p>
                  </div>

                  <div>
                    <label className="label flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-blue-500" />
                        Inverter Model
                      </span>
                      <span className="text-[10px] text-gray-400 font-normal">Optional</span>
                    </label>
                    <input
                      className="input bg-white"
                      list="inverterOptions"
                      value={form.inverter}
                      onChange={e => f('inverter', e.target.value)}
                      placeholder="e.g. 1x Solis 5kW Grid-Tied / Growatt"
                    />
                    <datalist id="inverterOptions">
                      {stockItems.filter(i => i.category === 'Inverter').map(i => (
                        <option key={i._id} value={i.name} />
                      ))}
                    </datalist>
                    <p className="text-[10px] text-gray-400 mt-1">Select from inventory or enter custom inverter model</p>
                  </div>

                  <div>
                    <label className="label flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-amber-600" />
                        Mounting Structure Type
                      </span>
                      <span className="text-[10px] text-gray-400 font-normal">Optional</span>
                    </label>
                    <input
                      className="input bg-white"
                      list="structureOptions"
                      value={form.structure}
                      onChange={e => f('structure', e.target.value)}
                      placeholder="e.g. 1 set GI High-Rise Elevated / Standard Tin Roof"
                    />
                    <datalist id="structureOptions">
                      {stockItems.filter(i => i.category === 'Structure').map(i => (
                        <option key={i._id} value={i.name} />
                      ))}
                    </datalist>
                    <p className="text-[10px] text-gray-400 mt-1">Select from inventory or enter structure specifications</p>
                  </div>

                  <div>
                    <label className="label flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-gray-600" />
                        Other Materials & BOS
                      </span>
                      <span className="text-[10px] text-gray-400 font-normal">Optional</span>
                    </label>
                    <input
                      className="input bg-white"
                      value={form.otherMaterials}
                      onChange={e => f('otherMaterials', e.target.value)}
                      placeholder="e.g. Havells ACDB/DCDB, 4mm DC Cables, Earthing kit"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">Batteries, cables, protection boxes, earthing, etc.</p>
                  </div>
                </div>

                {/* Quick Add Extra Materials Section */}
                <div className="p-2.5 bg-orange-50/50 border border-orange-200/60 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-orange-950 flex items-center gap-1">
                      <Plus className="w-3 h-3 text-orange-600" />
                      <span>Add Extra BOS Materials Manually (1-Click):</span>
                    </span>
                    <span className="text-[10px] text-gray-400">Appends to Other Materials</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_MATERIALS.map(mat => (
                      <button
                        key={mat}
                        type="button"
                        onClick={() => appendMaterial(mat)}
                        className="text-[10.5px] py-0.5 px-2 bg-white text-gray-700 font-semibold rounded-md border border-orange-200 hover:border-orange-500 hover:text-orange-700 hover:bg-orange-50 transition-all shadow-2xs"
                        title={`Append ${mat}`}
                      >
                        + {mat}
                      </button>
                    ))}
                  </div>
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

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/crm/leads')}
                className="btn-secondary sm:w-1/4 justify-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="btn-secondary sm:w-1/3 justify-center border-orange-300 text-orange-600 hover:bg-orange-50 font-semibold"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Save & Create Lead Now'}
              </button>
              <button
                type="submit"
                className="btn-primary sm:w-5/12 justify-center gap-2"
              >
                <span>Next: Documents (Optional)</span>
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

        {/* Modal: Create New Load Group (BOM Template) Manually on the Fly */}
        {showCreateGroupModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-2xl w-full p-5 my-8 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-start justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-orange-100 text-orange-600">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">Add New Load Group (BOM Template)</h3>
                    <p className="text-xs text-gray-500">Define a standard load package and decide its component equipment</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateGroupModal(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateNewGroupSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-3 gap-3">
                  <div>
                    <label className="label text-xs">Load Capacity *</label>
                    <input
                      className="input font-bold"
                      required
                      value={newGroupForm.load}
                      onChange={e => setNewGroupForm(p => ({ ...p, load: e.target.value }))}
                      placeholder="e.g. 4 kW, 7 kW"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label text-xs">Group Kit Name *</label>
                    <input
                      className="input"
                      required
                      value={newGroupForm.name}
                      onChange={e => setNewGroupForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="e.g. 4kW Loom Solar Standard Kit"
                    />
                  </div>
                  <div>
                    <label className="label text-xs">System Type</label>
                    <select
                      className="input text-xs"
                      value={newGroupForm.systemType}
                      onChange={e => setNewGroupForm(p => ({ ...p, systemType: e.target.value }))}
                    >
                      {['On-Grid', 'Off-Grid', 'Hybrid', 'Commercial'].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label text-xs">Description (Optional)</label>
                    <input
                      className="input text-xs"
                      value={newGroupForm.description}
                      onChange={e => setNewGroupForm(p => ({ ...p, description: e.target.value }))}
                      placeholder="Brief notes or manufacturer specification"
                    />
                  </div>
                </div>

                {/* Items in the new load group */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-800">
                      Decided Component Items ({newGroupForm.items.length})
                    </label>
                    <button
                      type="button"
                      onClick={addNewGroupRow}
                      className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Row</span>
                    </button>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-2 border border-gray-200 rounded-xl p-2 bg-gray-50/50">
                    {newGroupForm.items.map((row, idx) => (
                      <div key={idx} className="bg-white p-2.5 rounded-lg border border-gray-200 grid grid-cols-12 gap-2 items-center text-xs">
                        <div className="col-span-4">
                          <input
                            className="input text-xs py-1 px-2"
                            placeholder="Component Name *"
                            value={row.itemName}
                            onChange={e => updateNewGroupRow(idx, 'itemName', e.target.value)}
                            list={`newGroupStockItems-${idx}`}
                          />
                          <datalist id={`newGroupStockItems-${idx}`}>
                            {stockItems.map(si => (
                              <option key={si._id} value={si.name} />
                            ))}
                          </datalist>
                        </div>
                        <div className="col-span-3">
                          <select
                            className="input text-xs py-1 px-1.5"
                            value={row.category}
                            onChange={e => updateNewGroupRow(idx, 'category', e.target.value)}
                          >
                            {CATEGORIES.map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            className="input text-xs py-1 px-1.5 text-center"
                            placeholder="Qty"
                            value={row.quantity}
                            onChange={e => updateNewGroupRow(idx, 'quantity', e.target.value)}
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            min="0"
                            className="input text-xs py-1 px-1.5 text-right"
                            placeholder="Rate ₹"
                            value={row.price}
                            onChange={e => updateNewGroupRow(idx, 'price', e.target.value)}
                          />
                        </div>
                        <div className="col-span-1 text-center">
                          <button
                            type="button"
                            onClick={() => removeNewGroupRow(idx)}
                            disabled={newGroupForm.items.length <= 1}
                            className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-30"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-orange-50 border border-orange-200 rounded-lg text-xs font-bold text-orange-950">
                    <span>Estimated Total Kit Cost:</span>
                    <span className="text-orange-600 font-black">
                      ₹{newGroupTotalCost.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateGroupModal(false)}
                    className="btn-secondary text-xs"
                    disabled={creatingGroup}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary text-xs"
                    disabled={creatingGroup}
                  >
                    {creatingGroup ? 'Saving...' : 'Save & Apply to Lead'}
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
