import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit2, MessageSquare, GitBranch, User, Phone, Mail, MapPin,
  RefreshCw, Star, Clock, Calendar, ImagePlus, X, Trash2,
  FileText, CreditCard, Building, Receipt, Camera, Upload, ExternalLink, Eye
} from 'lucide-react';
import api from '../../api/axios';
import Layout from '../../components/Layout';
import toast from 'react-hot-toast';
import { showApiError } from '../../utils/apiError';
import { useAuth } from '../../context/AuthContext';
import { useDataCache } from '../../context/DataCacheContext';

const MAX_NOTE_IMAGES = 6;
const MAX_NOTE_IMAGE_MB = 10;

const DOCUMENT_SLOTS = [
  { id: 'aadhaar', label: 'Aadhaar Card', icon: CreditCard },
  { id: 'pan', label: 'PAN Card', icon: CreditCard },
  { id: 'passbook', label: 'Bank Passbook', icon: Building },
  { id: 'houseTax', label: 'House Tax / Property Paper', icon: FileText },
  { id: 'electricityBill', label: 'Electricity Bill', icon: Receipt },
  { id: 'rooftopPhoto', label: 'Rooftop Photo', icon: Camera },
];

const STAGES = ['Lead', 'Calling', 'Visit', 'Filing', 'Loan Filing', 'Loan Process', 'Loan Release', 'Installation', 'Kesco Filing', 'Kesco Process', 'Meter Install', 'Subsidy Apply', 'Subsidy Release', 'Commission'];

const stageColors = {
  'Lead': 'bg-gray-100 text-gray-700 border-gray-300',
  'Calling': 'bg-blue-100 text-blue-700 border-blue-300',
  'Visit': 'bg-purple-100 text-purple-700 border-purple-300',
  'Filing': 'bg-yellow-100 text-yellow-700 border-yellow-300',
  'Loan Filing': 'bg-orange-100 text-orange-700 border-orange-300',
  'Loan Process': 'bg-orange-200 text-orange-800 border-orange-400',
  'Loan Release': 'bg-green-100 text-green-700 border-green-300',
  'Installation': 'bg-green-200 text-green-800 border-green-400',
  'Kesco Filing': 'bg-teal-100 text-teal-700 border-teal-300',
  'Kesco Process': 'bg-cyan-100 text-cyan-700 border-cyan-300',
  'Meter Install': 'bg-indigo-100 text-indigo-700 border-indigo-300',
  'Subsidy Apply': 'bg-teal-200 text-teal-800 border-teal-400',
  'Subsidy Release': 'bg-cyan-200 text-cyan-800 border-cyan-400',
  'Commission': 'bg-emerald-100 text-emerald-800 border-emerald-300',
};

const ORANGE = '#f7941d';

function daysSince(dateStr) {
  if (!dateStr) return 0;
  return Math.floor((Date.now() - new Date(dateStr)) / 86400000);
}

function stageDuration(history, idx) {
  const entry = history[idx];
  const next  = history[idx + 1];
  const start = new Date(entry.date);
  const end   = next ? new Date(next.date) : new Date();
  const days  = Math.floor((end - start) / 86400000);
  return days;
}

function pointsColor(p) {
  if (p >= 4)  return '#10b981';
  if (p >= 2)  return ORANGE;
  if (p >= 0)  return '#f59e0b';
  return '#f43f5e';
}

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const {
    upsertLead, removeLead, ensureLeadDetail, fetchAssignees, refreshLeadDetail,
    leadDetails, assignees, isLoading,
  } = useDataCache();
  const lead = leadDetails[id];
  const detailLoading = isLoading(`leadDetail:${id}`);
  const [note, setNote] = useState('');
  const [noteImages, setNoteImages] = useState([]); // [{ file, previewUrl }]
  const [addingNote, setAddingNote] = useState(false);
  const [lightbox, setLightbox] = useState(null); // image url
  const fileInputRef = useRef(null);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveStage, setMoveStage] = useState('');
  const [moveUser, setMoveUser] = useState('');
  const [moveNote, setMoveNote] = useState('');
  const [moving, setMoving] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(null);

  const handleUploadDoc = async (docId, file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      return toast.error('File size cannot exceed 10MB');
    }
    setUploadingDoc(docId);
    try {
      const formData = new FormData();
      formData.append(docId, file);
      await api.put(`/leads/${id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await refreshLeadDetail(id);
      toast.success('Document uploaded successfully!');
    } catch (err) {
      showApiError(err, 'Could not upload document.');
    } finally {
      setUploadingDoc(null);
    }
  };

  useEffect(() => {
    return () => {
      // Free any in-memory image previews when leaving the page
      noteImages.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    ensureLeadDetail(id);
    fetchAssignees();
  }, [id, ensureLeadDetail, fetchAssignees]);

  useEffect(() => {
    if (lead) {
      setMoveStage(lead.stage);
      setMoveUser(lead.assignedTo?._id || '');
    }
  }, [lead]);

  const handleAddNote = async () => {
    const text = note.trim();
    if (!text && noteImages.length === 0) return;
    setAddingNote(true);
    try {
      const formData = new FormData();
      formData.append('text', text);
      noteImages.forEach((img) => formData.append('images', img.file));

      await api.post(`/leads/${id}/notes`, formData);
      await refreshLeadDetail(id);
      setNote('');
      noteImages.forEach((img) => URL.revokeObjectURL(img.previewUrl));
      setNoteImages([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast.success('Note added');
    } catch (err) {
      showApiError(err, 'Could not add note.');
    } finally {
      setAddingNote(false);
    }
  };

  const handleSelectFiles = (e) => {
    const incoming = Array.from(e.target.files || []);
    if (!incoming.length) return;

    const remainingSlots = MAX_NOTE_IMAGES - noteImages.length;
    if (incoming.length > remainingSlots) {
      toast.error(`You can attach up to ${MAX_NOTE_IMAGES} images per note`);
    }

    const accepted = [];
    for (const file of incoming.slice(0, remainingSlots)) {
      if (!file.type.startsWith('image/')) {
        toast.error(`Skipped ${file.name}: not an image`);
        continue;
      }
      if (file.size > MAX_NOTE_IMAGE_MB * 1024 * 1024) {
        toast.error(`${file.name} is larger than ${MAX_NOTE_IMAGE_MB}MB`);
        continue;
      }
      accepted.push({ file, previewUrl: URL.createObjectURL(file) });
    }

    setNoteImages((prev) => [...prev, ...accepted]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeNoteImage = (index) => {
    setNoteImages((prev) => {
      const next = [...prev];
      const [removed] = next.splice(index, 1);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return next;
    });
  };

  const handleDeleteNote = async (noteId) => {
    if (!noteId) return;
    if (!window.confirm('Delete this note? This cannot be undone.')) return;
    try {
      await api.delete(`/leads/${id}/notes/${noteId}`);
      await refreshLeadDetail(id);
      toast.success('Note deleted');
    } catch (err) {
      showApiError(err, 'Could not delete note.');
    }
  };

  const canDeleteNote = (n) => {
    if (!n) return false;
    if (isAdmin) return true;
    const authorId = n.addedBy?._id || n.addedBy;
    return authorId && user?._id && String(authorId) === String(user._id);
  };

  const handleDeleteLead = async () => {
    if (!window.confirm(`Delete lead "${lead?.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/leads/${id}`);
      removeLead(id);
      toast.success('Lead deleted');
      navigate('/crm/leads');
    } catch (err) {
      showApiError(err, 'Could not delete lead.');
    }
  };

  const handleMove = async () => {
    if (!moveStage) return;
    setMoving(true);
    try {
      const res = await api.put(`/leads/${id}/stage`, { stage: moveStage, assignedTo: moveUser || undefined, note: moveNote });
      upsertLead(res.data);
      setShowMoveModal(false);
      setMoveNote('');
      toast.success(`Lead moved to ${moveStage}`);
    } catch (err) {
      showApiError(err, 'Could not move lead to the selected stage.');
    } finally {
      setMoving(false);
    }
  };

  if (detailLoading && !lead) return (
    <Layout module="crm">
      <div className="flex items-center justify-center h-64 text-gray-400">Loading lead...</div>
    </Layout>
  );

  if (!lead) return (
    <Layout module="crm">
      <div className="p-4 sm:p-6 text-center text-gray-500">Lead not found</div>
    </Layout>
  );

  return (
    <Layout module="crm">
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/crm/leads')} className="btn-secondary p-2">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{lead.name}</h1>
              <p className="text-gray-500 text-sm">{lead.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`badge border ${stageColors[lead.stage] || 'bg-gray-100'} px-3 py-1.5 text-sm`}>
              {lead.stage}
            </span>
            {(() => {
              const last = lead.stageHistory?.[lead.stageHistory.length - 1];
              const days = daysSince(last?.date || lead.createdAt);
              const pts  = 5 - days;
              return (
                <span style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 10px', borderRadius:99, background: pts >= 0 ? 'rgba(16,185,129,.1)' : 'rgba(244,63,94,.1)', border:`1px solid ${pts>=0?'rgba(16,185,129,.3)':'rgba(244,63,94,.3)'}`, fontSize:'.78rem', fontWeight:700, color: pointsColor(pts) }}>
                  <Clock size={11}/> {days}d in stage · {pts >= 0 ? `+${pts}` : pts} pts if moved now
                </span>
              );
            })()}
            <button onClick={() => setShowMoveModal(true)} className="btn-primary gap-2">
              <RefreshCw className="w-4 h-4" /> Move Stage
            </button>
            {isAdmin && (
              <button onClick={handleDeleteLead} className="btn-danger gap-2">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left - Info */}
          <div className="lg:col-span-2 space-y-5">
            {/* Customer Details */}
            <div className="card">
              <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-solar-500" /> Customer Details
              </h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                {[
                  { icon: User, label: 'Name', value: lead.name },
                  { icon: Phone, label: 'Phone', value: lead.phone },
                  { icon: Mail, label: 'Email', value: lead.email || '—' },
                  { icon: CreditCard, label: 'PAN Card Number', value: lead.panNumber || '—' },
                  { icon: CreditCard, label: 'Aadhaar Number', value: lead.aadhaarNumber || '—' },
                  { icon: MapPin, label: 'City', value: lead.city || '—' },
                  { icon: MapPin, label: 'Address', value: lead.address || '—' },
                  { icon: User, label: 'System Size', value: lead.systemSize || '—' },
                  { icon: User, label: 'Source', value: lead.source || 'Manual' },
                  { icon: User, label: 'Created By', value: lead.createdBy?.name || '—' },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-2">
                    <Icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400">{label}</p>
                      <p className="text-gray-700 font-medium">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
              {lead.requirements && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-400 mb-1">Requirements</p>
                  <p className="text-sm text-gray-700">{lead.requirements}</p>
                </div>
              )}
            </div>

            {/* Customer Documents */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-solar-500" /> Customer Documents
                </h3>
                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                  {Object.keys(lead.documents || {}).filter(k => lead.documents[k]?.url).length} / 6 Uploaded
                </span>
              </div>

              <div className="grid md:grid-cols-2 gap-3 text-sm">
                {DOCUMENT_SLOTS.map((slot) => {
                  const Icon = slot.icon;
                  const doc = lead.documents?.[slot.id];
                  const hasDoc = Boolean(doc && doc.url);
                  const isUploading = uploadingDoc === slot.id;

                  return (
                    <div
                      key={slot.id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                        hasDoc ? 'bg-emerald-50/40 border-emerald-200' : 'bg-gray-50/80 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`p-2 rounded-lg flex-shrink-0 ${hasDoc ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-800 truncate">{slot.label}</p>
                          <p className="text-[11px] text-gray-500 truncate">
                            {hasDoc ? (doc.originalName || 'Uploaded Document') : 'Not uploaded'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {hasDoc && (
                          <button
                            type="button"
                            onClick={() => setLightbox(doc.url)}
                            className="btn-secondary py-1 px-2 text-xs flex items-center gap-1"
                            title="View document"
                          >
                            <Eye className="w-3.5 h-3.5 text-gray-600" />
                            <span>View</span>
                          </button>
                        )}

                        <label className="btn-secondary py-1 px-2 text-xs cursor-pointer flex items-center gap-1 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200">
                          <Upload className="w-3.5 h-3.5 text-gray-600" />
                          <span>{isUploading ? 'Uploading...' : hasDoc ? 'Update' : 'Upload'}</span>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*,.pdf"
                            disabled={isUploading}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleUploadDoc(slot.id, file);
                              e.target.value = '';
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div className="card">
              <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-solar-500" /> Notes ({lead.notes?.length || 0})
              </h3>

              <div className="mb-4">
                <div className="flex gap-2">
                  <input
                    className="input flex-1"
                    placeholder="Add a note..."
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !addingNote && handleAddNote()}
                  />
                  <button
                    type="button"
                    className="btn-secondary px-3"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={addingNote || noteImages.length >= MAX_NOTE_IMAGES}
                    title={`Attach images (up to ${MAX_NOTE_IMAGES})`}
                  >
                    <ImagePlus className="w-4 h-4" />
                  </button>
                  <button className="btn-primary" onClick={handleAddNote} disabled={addingNote || (!note.trim() && noteImages.length === 0)}>
                    {addingNote ? 'Adding...' : 'Add'}
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleSelectFiles}
                />

                {noteImages.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {noteImages.map((img, i) => (
                      <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                        <img src={img.previewUrl} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeNoteImage(i)}
                          className="absolute top-0.5 right-0.5 bg-black/60 hover:bg-black/80 text-white rounded-full p-0.5"
                          aria-label="Remove image"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {noteImages.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    {noteImages.length}/{MAX_NOTE_IMAGES} images attached · they'll be compressed before upload
                  </p>
                )}
              </div>

              <div className="space-y-3">
                {lead.notes?.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No notes yet</p>}
                {[...( lead.notes || [])].reverse().map((n, i) => (
                  <div key={n._id || i} className="bg-gray-50 rounded-lg p-3 group">
                    <div className="flex items-start justify-between gap-2">
                      {n.text ? (
                        <p className="text-sm text-gray-700 whitespace-pre-wrap break-words flex-1">{n.text}</p>
                      ) : (
                        <p className="text-sm text-gray-400 italic flex-1">Image{(n.images?.length || 0) > 1 ? 's' : ''}</p>
                      )}
                      {canDeleteNote(n) && (
                        <button
                          type="button"
                          onClick={() => handleDeleteNote(n._id)}
                          className="opacity-0 group-hover:opacity-100 transition text-gray-400 hover:text-red-500 p-1"
                          title="Delete note"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {n.images && n.images.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {n.images.map((img, j) => (
                          <button
                            key={j}
                            type="button"
                            onClick={() => setLightbox(img.url)}
                            className="block w-24 h-24 rounded-lg overflow-hidden border border-gray-200 bg-white hover:opacity-90"
                          >
                            <img src={img.url} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}

                    <p className="text-xs text-gray-400 mt-2">{n.addedBy?.name} · {new Date(n.date).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right - Stage History */}
          <div className="space-y-5">
            <div className="card">
              <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-solar-500" /> Stage History
              </h3>
              <div className="space-y-3">
                {(lead.stageHistory || []).map((h, i, arr) => {
                  const dur = stageDuration(arr, i);
                  const isCurrent = i === arr.length - 1;
                  const pts = 5 - dur;
                  return (
                    <div key={i} className="relative pl-4 border-l-2" style={{ borderColor: isCurrent ? ORANGE : '#e5e7eb' }}>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <div className={`badge ${stageColors[h.stage] || 'bg-gray-100 text-gray-600'}`}>{h.stage}</div>
                        {isCurrent && <span style={{ fontSize:'.68rem', fontWeight:700, color:ORANGE, background:'rgba(247,148,29,.1)', padding:'1px 7px', borderRadius:99 }}>CURRENT</span>}
                        {!isCurrent && (
                          <span style={{ fontSize:'.68rem', fontWeight:700, color: pts > 0 ? '#10b981' : pts === 0 ? '#f59e0b' : '#f43f5e', background: pts > 0 ? 'rgba(16,185,129,.08)' : pts === 0 ? 'rgba(245,158,11,.08)' : 'rgba(244,63,94,.08)', padding:'1px 7px', borderRadius:99 }}>
                            {pts > 0 ? `+${pts} pts` : pts === 0 ? '0 pts' : `${pts} pts`} · {dur}d
                          </span>
                        )}
                      </div>
                      {h.assignedTo && <p className="text-xs text-gray-600">→ {h.assignedTo.name}</p>}
                      {h.movedBy?.name && <p className="text-xs text-gray-500">by {h.movedBy.name}</p>}
                      {h.note && <p className="text-xs text-gray-500 italic">"{h.note}"</p>}
                      <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                        <Calendar size={9}/>
                        {new Date(h.date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                        {' · '}
                        {new Date(h.date).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}
                      </p>
                    </div>
                  );
                }).reverse()}
              </div>
            </div>

            <div className="card">
              <h3 className="font-semibold text-gray-700 mb-3">Assigned To</h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-solar-100 rounded-full flex items-center justify-center text-solar-700 font-bold">
                  {lead.assignedTo?.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="font-medium text-gray-800">{lead.assignedTo?.name || 'Unassigned'}</p>
                  <p className="text-xs text-gray-400">{lead.assignedTo?.email}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Image lightbox */}
        {lightbox && (
          <div
            className="fixed inset-0 bg-black/85 flex items-center justify-center z-[60] p-4"
            onClick={() => setLightbox(null)}
          >
            <button
              type="button"
              className="absolute top-4 right-4 text-white/80 hover:text-white p-2"
              onClick={() => setLightbox(null)}
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={lightbox}
              alt=""
              className="max-w-full max-h-full rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        {/* Move Stage Modal */}
        {showMoveModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-4 sm:p-6">
              <h3 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-solar-500" /> Move Lead Stage
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="label">Select Stage</label>
                  <select className="input" value={moveStage} onChange={e => setMoveStage(e.target.value)}>
                    {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Assign To</label>
                  <select className="input" value={moveUser} onChange={e => setMoveUser(e.target.value)}>
                    <option value="">Keep current ({lead.assignedTo?.name || 'None'})</option>
                    {assignees.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Note (optional)</label>
                  <input className="input" value={moveNote} onChange={e => setMoveNote(e.target.value)} placeholder="Reason for moving..." />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button className="btn-secondary flex-1 justify-center" onClick={() => setShowMoveModal(false)}>Cancel</button>
                <button className="btn-primary flex-1 justify-center" onClick={handleMove} disabled={moving}>
                  {moving ? 'Moving...' : 'Confirm Move'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
