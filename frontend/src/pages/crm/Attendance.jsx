import { useState, useEffect, useCallback } from 'react';
import {
  Clock, Search, Plus, Edit2, Trash2, X, Calendar, ChevronDown, ChevronUp, UserCheck, Users, Info
} from 'lucide-react';
import api from '../../api/axios';
import Layout from '../../components/Layout';
import PaginationBar from '../../components/PaginationBar';
import toast from 'react-hot-toast';
import { showApiError } from '../../utils/apiError';
import { useAuth } from '../../context/AuthContext';

const PAGE_SIZE = 15;

const getTodayISTString = () => {
  const now = new Date();
  // Adjust to UTC+5:30 (IST)
  const tzOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + tzOffset);
  return istDate.toISOString().split('T')[0];
};

const formatTime = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata'
  });
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  // Parse YYYY-MM-DD
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const calculateHours = (inStr, outStr) => {
  if (!inStr || !outStr) return '—';
  const diffMs = new Date(outStr) - new Date(inStr);
  if (diffMs < 0) return '—';
  const totalMin = Math.floor(diffMs / (1000 * 60));
  const hrs = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  return `${hrs}h ${mins}m`;
};

export default function Attendance() {
  const { user, isAdmin } = useAuth();

  const [attendance, setAttendance] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateFilter, setDateFilter] = useState(isAdmin ? getTodayISTString() : '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Expandable punches list
  const [expandedId, setExpandedId] = useState(null);

  // Modals & Forms
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({
    userId: '',
    date: getTodayISTString(),
    checkInTime: '09:00',
    checkOutTime: '',
    hasCheckOut: false
  });

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Load active employees list for Admin manual entry dropdown
  useEffect(() => {
    if (isAdmin && showModal) {
      api.get('/users/assignees')
        .then((res) => setEmployees(res.data))
        .catch((err) => showApiError(err, 'Could not load employees list.'));
    }
  }, [isAdmin, showModal]);

  const loadAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: PAGE_SIZE,
      };

      if (isAdmin) {
        if (dateFilter) params.date = dateFilter;
        if (debouncedSearch) params.search = debouncedSearch;
      } else {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
        if (dateFilter) params.date = dateFilter; // employee can search specific date too
      }

      const res = await api.get('/attendance', { params });
      setAttendance(res.data.attendance);
      setPagination(res.data.pagination);
    } catch (err) {
      showApiError(err, 'Could not load attendance logs.');
    } finally {
      setLoading(false);
    }
  }, [page, isAdmin, dateFilter, debouncedSearch, startDate, endDate]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  // Reset page on filter changes
  useEffect(() => {
    setPage(1);
  }, [dateFilter, debouncedSearch, startDate, endDate]);

  const openCreate = () => {
    setEditingRecord(null);
    setForm({
      userId: '',
      date: getTodayISTString(),
      checkInTime: '09:00',
      checkOutTime: '',
      hasCheckOut: false
    });
    setShowModal(true);
  };

  const openEdit = (rec) => {
    setEditingRecord(rec);
    const inDate = new Date(rec.checkIn);
    const inHrs = String(inDate.getHours()).padStart(2, '0');
    const inMins = String(inDate.getMinutes()).padStart(2, '0');

    let outHrs = '';
    let outMins = '';
    if (rec.checkOut) {
      const outDate = new Date(rec.checkOut);
      outHrs = String(outDate.getHours()).padStart(2, '0');
      outMins = String(outDate.getMinutes()).padStart(2, '0');
    }

    setForm({
      userId: rec.user?._id || rec.user,
      date: rec.date,
      checkInTime: `${inHrs}:${inMins}`,
      checkOutTime: rec.checkOut ? `${outHrs}:${outMins}` : '',
      hasCheckOut: !!rec.checkOut
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (isAdmin && !editingRecord && !form.userId) {
      return toast.error('Please select an employee');
    }

    setSaving(true);
    try {
      const checkInDateTime = new Date(`${form.date}T${form.checkInTime}:00`);
      let checkOutDateTime = null;
      if (form.hasCheckOut && form.checkOutTime) {
        checkOutDateTime = new Date(`${form.date}T${form.checkOutTime}:00`);
        if (checkOutDateTime < checkInDateTime) {
          toast.error('Check-out time must be after check-in time');
          setSaving(false);
          return;
        }
      }

      const payload = {
        date: form.date,
        checkIn: checkInDateTime.toISOString(),
        checkOut: checkOutDateTime ? checkOutDateTime.toISOString() : null
      };

      if (editingRecord) {
        await api.put(`/attendance/${editingRecord._id}`, payload);
        toast.success('Attendance updated successfully');
      } else {
        payload.userId = form.userId;
        await api.post('/attendance', payload);
        toast.success('Attendance manually logged successfully');
      }

      setShowModal(false);
      loadAttendance();
    } catch (err) {
      showApiError(err, 'Failed to save attendance.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this attendance record?')) return;
    try {
      await api.delete(`/attendance/${id}`);
      toast.success('Attendance record deleted');
      loadAttendance();
    } catch (err) {
      showApiError(err, 'Failed to delete attendance record.');
    }
  };

  const toggleExpandRow = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Stats calculation
  const totalLogged = attendance.length;
  const presentCount = attendance.filter(a => !!a.checkIn).length;
  const avgHours = () => {
    const list = attendance.filter(a => !!a.checkIn && !!a.checkOut);
    if (!list.length) return '—';
    const totalMs = list.reduce((acc, a) => acc + (new Date(a.checkOut) - new Date(a.checkIn)), 0);
    const avgMs = totalMs / list.length;
    const totalMin = Math.floor(avgMs / (1000 * 60));
    const hrs = Math.floor(totalMin / 60);
    const mins = totalMin % 60;
    return `${hrs}h ${mins}m`;
  };

  return (
    <Layout module="crm">
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2 tracking-tight">
              <Clock className="w-7 h-7 text-solar-500" />
              {isAdmin ? 'Employee Attendance' : 'My Attendance Logs'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {isAdmin 
                ? 'Monitor staff punch timings, trace facial-recognition scans, and manage corrections.'
                : 'Track your daily clock-in/out stamps and total work duration.'
              }
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={openCreate}
              className="btn-primary flex items-center justify-center gap-2 self-start sm:self-center font-bold px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" /> Add Attendance
            </button>
          )}
        </div>

        {/* Stats Cards Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="card p-5 border-l-4 border-solar-500 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Records</p>
              <h3 className="text-2xl font-black text-gray-800 mt-1">{totalLogged}</h3>
            </div>
            <div className="w-11 h-11 bg-solar-50 rounded-xl flex items-center justify-center text-solar-600">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          
          <div className="card p-5 border-l-4 border-emerald-500 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                {isAdmin ? 'Active Staff Today' : 'Days Present'}
              </p>
              <h3 className="text-2xl font-black text-gray-800 mt-1">{presentCount}</h3>
            </div>
            <div className="w-11 h-11 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
              {isAdmin ? <Users className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
            </div>
          </div>

          <div className="card p-5 border-l-4 border-indigo-500 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Avg. Hours / Shift</p>
              <h3 className="text-2xl font-black text-gray-800 mt-1">{avgHours()}</h3>
            </div>
            <div className="w-11 h-11 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        <div className="card mb-6 p-4 bg-white shadow-sm flex flex-col md:flex-row gap-4 items-end">
          
          {/* Admin filters */}
          {isAdmin && (
            <>
              <div className="flex-1 w-full">
                <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Search Employee</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    className="input pl-9 w-full"
                    placeholder="Search by employee name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="w-full md:w-52">
                <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Log Date</label>
                <input
                  type="date"
                  className="input w-full"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                />
              </div>
            </>
          )}

          {/* Employee filters */}
          {!isAdmin && (
            <>
              <div className="w-full md:w-44">
                <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Specific Date</label>
                <input
                  type="date"
                  className="input w-full"
                  value={dateFilter}
                  onChange={(e) => {
                    setDateFilter(e.target.value);
                    if (e.target.value) {
                      setStartDate('');
                      setEndDate('');
                    }
                  }}
                />
              </div>

              <div className="w-full md:w-44">
                <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Start Date</label>
                <input
                  type="date"
                  className="input w-full"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (e.target.value) setDateFilter('');
                  }}
                />
              </div>

              <div className="w-full md:w-44">
                <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">End Date</label>
                <input
                  type="date"
                  className="input w-full"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    if (e.target.value) setDateFilter('');
                  }}
                />
              </div>
            </>
          )}

          <button
            onClick={() => {
              setSearch('');
              setDateFilter(isAdmin ? getTodayISTString() : '');
              setStartDate('');
              setEndDate('');
            }}
            className="btn-secondary w-full md:w-auto px-4 py-2.5 rounded-xl font-bold justify-center"
          >
            Clear Filters
          </button>
        </div>

        {/* Data Table */}
        <div className="card shadow-sm overflow-hidden">
          {loading ? (
            <div className="text-center py-16 text-gray-400 flex flex-col items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-solar-500" />
              <p className="text-sm font-semibold">Loading attendance logs...</p>
            </div>
          ) : attendance.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Calendar className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="font-semibold text-gray-600">No attendance records found</p>
              <p className="text-xs text-gray-400 mt-1">Try expanding your search criteria or selecting a different date.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="py-3 px-4 text-left font-bold text-gray-500 w-12" aria-label="Expand row" />
                    <th className="py-3 px-4 text-left font-bold text-gray-500">Date</th>
                    {isAdmin && <th className="py-3 px-4 text-left font-bold text-gray-500">Employee</th>}
                    <th className="py-3 px-4 text-left font-bold text-gray-500">Check In</th>
                    <th className="py-3 px-4 text-left font-bold text-gray-500">Check Out</th>
                    <th className="py-3 px-4 text-left font-bold text-gray-500">Total Hours</th>
                    <th className="py-3 px-4 text-left font-bold text-gray-500">Scans</th>
                    {isAdmin && <th className="py-3 px-4 text-right font-bold text-gray-500">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((rec) => {
                    const isExpanded = expandedId === rec._id;
                    const hoursWorked = calculateHours(rec.checkIn, rec.checkOut);

                    return (
                      <optgroup key={rec._id} className="border-b border-gray-50 hover:bg-gray-50/20">
                        {/* Main row */}
                        <tr className="border-b border-gray-50/50">
                          <td className="py-4 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => toggleExpandRow(rec._id)}
                              className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                              aria-label={isExpanded ? "Collapse history" : "Expand history"}
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </td>
                          <td className="py-4 px-4 font-semibold text-gray-800 whitespace-nowrap">
                            {formatDate(rec.date)}
                          </td>
                          {isAdmin && (
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-solar-100 text-solar-700 font-bold rounded-lg flex items-center justify-center text-xs">
                                  {rec.user?.name?.charAt(0).toUpperCase() || '?'}
                                </div>
                                <div>
                                  <p className="font-bold text-gray-800 leading-tight">
                                    {rec.user?.name || 'Unknown User'}
                                    {rec.user?.empCode && (
                                      <span className="ml-1.5 text-xxs font-mono bg-solar-50 text-solar-700 px-1 py-0.5 rounded border border-solar-100/50">
                                        {rec.user.empCode}
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-xxs text-gray-400 font-medium">{rec.user?.email || 'No email'}</p>
                                </div>
                              </div>
                            </td>
                          )}
                          <td className="py-4 px-4 font-mono font-medium text-emerald-600 whitespace-nowrap">
                            {formatTime(rec.checkIn)}
                          </td>
                          <td className="py-4 px-4 font-mono font-medium text-amber-600 whitespace-nowrap">
                            {formatTime(rec.checkOut)}
                          </td>
                          <td className="py-4 px-4 whitespace-nowrap">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                              hoursWorked !== '—' ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {hoursWorked}
                            </span>
                          </td>
                          <td className="py-4 px-4 whitespace-nowrap">
                            <span className="bg-solar-50 text-solar-700 px-2 py-0.5 rounded font-bold text-xs">
                              {rec.punches?.length || 0} scans
                            </span>
                          </td>
                          {isAdmin && (
                            <td className="py-4 px-4 text-right whitespace-nowrap">
                              <div className="flex justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => openEdit(rec)}
                                  className="btn-secondary p-2 rounded-xl text-gray-600 hover:text-solar-600 hover:bg-solar-50"
                                  title="Edit Entry"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(rec._id)}
                                  className="btn-secondary p-2 rounded-xl text-rose-500 hover:bg-rose-50 hover:border-rose-100"
                                  title="Delete Entry"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>

                        {/* Expanded details row */}
                        {isExpanded && (
                          <tr className="bg-gray-50/40">
                            <td colSpan={isAdmin ? 8 : 7} className="p-4 border-b border-gray-100">
                              <div className="max-w-md bg-white border border-gray-100 rounded-xl p-4 shadow-xxs">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                  <Info className="w-3.5 h-3.5 text-gray-400" />
                                  Facial recognition Scan Timeline ({rec.punches?.length || 0} scans)
                                </h4>
                                <div className="relative border-l-2 border-gray-100 pl-4 ml-2.5 space-y-4 py-1">
                                  {rec.punches && rec.punches.map((punch, idx) => (
                                    <div key={idx} className="relative flex items-center gap-3">
                                      {/* Dots */}
                                      <div className={`absolute -left-[23px] w-2.5 h-2.5 rounded-full border-2 border-white ${
                                        punch.type === 'in' ? 'bg-emerald-500 ring-4 ring-emerald-50' : 'bg-amber-500 ring-4 ring-amber-50'
                                      }`} />
                                      <span className={`text-xxs font-black px-2 py-0.5 rounded uppercase ${
                                        punch.type === 'in' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                                      }`}>
                                        {punch.type === 'in' ? 'In' : 'Out'}
                                      </span>
                                      <span className="font-mono text-xs font-semibold text-gray-700">
                                        {formatTime(punch.time)}
                                      </span>
                                      <span className="text-xxs text-gray-400">
                                        ({new Date(punch.time).toLocaleDateString('en-IN', { hourCycle: 'h23' })})
                                      </span>
                                    </div>
                                  ))}
                                  {(!rec.punches || rec.punches.length === 0) && (
                                    <p className="text-xs text-gray-400 italic">No punch details logged.</p>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </optgroup>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <PaginationBar pagination={pagination} page={page} onPageChange={setPage} loading={loading} label="records" />
        </div>

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 backdrop-blur-xxs">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <h3 className="font-black text-gray-900 tracking-tight text-lg">
                  {editingRecord ? 'Edit Attendance' : 'Manual Attendance Entry'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="p-1.5 hover:bg-gray-150 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleSave} className="p-6 space-y-4">
                
                {/* Employee Selector (Only when creating new) */}
                {!editingRecord ? (
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Select Employee *</label>
                    <select
                      className="input w-full font-medium"
                      required
                      value={form.userId}
                      onChange={(e) => setForm(f => ({ ...f, userId: e.target.value }))}
                    >
                      <option value="">-- Select Employee --</option>
                      {employees.map((emp) => (
                        <option key={emp._id} value={emp._id}>
                          {emp.name} {emp.empCode ? `[${emp.empCode}]` : ''} ({emp.role})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Employee</label>
                    <p className="font-bold text-gray-800 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 text-sm">
                      {editingRecord.user?.name} ({editingRecord.user?.email})
                    </p>
                  </div>
                )}

                {/* Date Selection */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Date *</label>
                  <input
                    type="date"
                    className="input w-full"
                    required
                    value={form.date}
                    onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))}
                  />
                </div>

                {/* Check In Time */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Check-In Time *</label>
                  <input
                    type="time"
                    className="input w-full font-mono"
                    required
                    value={form.checkInTime}
                    onChange={(e) => setForm(f => ({ ...f, checkInTime: e.target.value }))}
                  />
                </div>

                {/* Check Out Toggle & Time */}
                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-solar-500 focus:ring-solar-500 h-4.5 w-4.5"
                      checked={form.hasCheckOut}
                      onChange={(e) => setForm(f => ({ ...f, hasCheckOut: e.target.checked }))}
                    />
                    <span className="text-xs font-bold text-gray-700 uppercase">Include Check-Out Time</span>
                  </label>
                </div>

                {form.hasCheckOut && (
                  <div className="animate-in slide-in-from-top-2 duration-100">
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Check-Out Time *</label>
                    <input
                      type="time"
                      className="input w-full font-mono"
                      required={form.hasCheckOut}
                      value={form.checkOutTime}
                      onChange={(e) => setForm(f => ({ ...f, checkOutTime: e.target.value }))}
                    />
                  </div>
                )}

                {/* Submit / Cancel Buttons */}
                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="btn-secondary flex-1 justify-center py-2.5 rounded-xl font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary flex-1 justify-center py-2.5 rounded-xl font-bold shadow-md shadow-solar-500/10"
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Record'}
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
