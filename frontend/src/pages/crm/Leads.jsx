import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, Target, Trash2 } from 'lucide-react';
import api from '../../api/axios';
import Layout from '../../components/Layout';
import PaginationBar from '../../components/PaginationBar';
import toast from 'react-hot-toast';
import { showApiError } from '../../utils/apiError';
import { useAuth } from '../../context/AuthContext';
import { useDataCache } from '../../context/DataCacheContext';

const STAGES = ['Lead', 'Calling', 'Visit', 'Filing', 'Loan Filing', 'Loan Process', 'Installation', 'Kesco Filing', 'Kesco Process', 'Meter Install', 'Commission'];
const PAGE_SIZE = 20;

const stageColors = {
  'Lead': 'bg-gray-100 text-gray-700',
  'Calling': 'bg-blue-100 text-blue-700',
  'Visit': 'bg-purple-100 text-purple-700',
  'Filing': 'bg-yellow-100 text-yellow-700',
  'Loan Filing': 'bg-orange-100 text-orange-700',
  'Loan Process': 'bg-orange-200 text-orange-800',
  'Installation': 'bg-green-100 text-green-700',
  'Kesco Filing': 'bg-teal-100 text-teal-700',
  'Kesco Process': 'bg-cyan-100 text-cyan-700',
  'Meter Install': 'bg-indigo-100 text-indigo-700',
  'Commission': 'bg-emerald-100 text-emerald-800',
};

export default function Leads() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [page, setPage] = useState(1);
  const [leads, setLeads] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { fetchLeadsPage, removeLead, removeLeads } = useDataCache();
  const fetchId = useRef(0);

  useEffect(() => {
    setStageFilter(searchParams.get('stage') || '');
  }, [searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [stageFilter, debouncedSearch]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, stageFilter, debouncedSearch]);

  const pageLeadIds = useMemo(() => leads.map((l) => l._id), [leads]);
  const allPageSelected = pageLeadIds.length > 0 && pageLeadIds.every((id) => selectedIds.has(id));
  const somePageSelected = pageLeadIds.some((id) => selectedIds.has(id));
  const selectedCount = selectedIds.size;

  const reloadPage = useCallback(async (force = true) => {
    const data = await fetchLeadsPage({
      page,
      limit: PAGE_SIZE,
      stage: stageFilter,
      search: debouncedSearch,
      force,
    });
    setLeads(data.leads);
    setPagination(data.pagination);
    setSelectedIds(new Set());
    if (data.leads.length === 0 && data.pagination.hasPrev) {
      setPage((p) => p - 1);
    }
    return data;
  }, [page, stageFilter, debouncedSearch, fetchLeadsPage]);

  const loadPage = useCallback(async () => {
    const id = ++fetchId.current;
    setLoading(true);
    try {
      const data = await fetchLeadsPage({
        page,
        limit: PAGE_SIZE,
        stage: stageFilter,
        search: debouncedSearch,
      });
      if (id !== fetchId.current) return;
      setLeads(data.leads);
      setPagination(data.pagination);
    } catch (err) {
      showApiError(err, 'Could not load leads.');
    } finally {
      if (id === fetchId.current) setLoading(false);
    }
  }, [page, stageFilter, debouncedSearch, fetchLeadsPage]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  const handleStageChange = (stage) => {
    setStageFilter(stage);
    if (stage) {
      setSearchParams({ stage });
    } else {
      setSearchParams({});
    }
  };

  const toggleSelectAll = () => {
    if (allPageSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pageLeadIds));
    }
  };

  const toggleSelectOne = (e, id) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = async (e, lead) => {
    e.stopPropagation();
    if (!window.confirm(`Delete lead "${lead.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/leads/${lead._id}`);
      removeLead(lead._id);
      toast.success('Lead deleted');
      await reloadPage();
    } catch (err) {
      showApiError(err, 'Could not delete lead.');
    }
  };

  const handleBulkDelete = async () => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    const label = allPageSelected && ids.length === pageLeadIds.length
      ? `all ${ids.length} lead(s) on this page`
      : `${ids.length} selected lead(s)`;
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;

    setBulkDeleting(true);
    try {
      const res = await api.post('/leads/bulk-delete', { ids });
      removeLeads(ids);
      toast.success(res.data.message || `${ids.length} lead(s) deleted`);
      await reloadPage();
    } catch (err) {
      showApiError(err, 'Could not delete selected leads.');
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <Layout module="crm">
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="text-2xl font-bold text-gray-900">
            {stageFilter ? `${stageFilter} Leads` : 'All Leads'}
          </h1>
          <div className="flex items-center gap-2 flex-wrap">
            {isAdmin && selectedCount > 0 && (
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={bulkDeleting || loading}
                className="btn-danger gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {bulkDeleting
                  ? 'Deleting…'
                  : allPageSelected && selectedCount === pageLeadIds.length
                    ? `Delete all on page (${selectedCount})`
                    : `Delete selected (${selectedCount})`}
              </button>
            )}
            <button onClick={() => navigate('/crm/leads/new')} className="btn-primary">
              <Plus className="w-4 h-4" /> New Lead
            </button>
          </div>
        </div>

        <div className="card mb-4 flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="input pl-9"
              placeholder="Search by name, phone, city, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="input md:w-52"
            value={stageFilter}
            onChange={(e) => handleStageChange(e.target.value)}
          >
            <option value="">All Stages</option>
            {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <p className="text-sm text-gray-500">
                {pagination
                  ? `${pagination.total} lead${pagination.total !== 1 ? 's' : ''} found`
                  : 'Loading…'}
              </p>
              {isAdmin && selectedCount > 0 && (
                <span className="text-sm font-semibold text-solar-600">
                  {selectedCount} selected
                </span>
              )}
            </div>
            {pagination && pagination.totalPages > 1 && (
              <p className="text-sm text-gray-400">Page {page} of {pagination.totalPages}</p>
            )}
          </div>
          {loading && leads.length === 0 ? (
            <div className="text-center py-12 text-gray-400">Loading leads...</div>
          ) : leads.length === 0 ? (
            <div className="text-center py-12">
              <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No leads found</p>
            </div>
          ) : (
            <>
              <div className={`overflow-x-auto transition-opacity ${loading ? 'opacity-50' : ''}`}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-100">
                      {isAdmin && (
                        <th className="py-3 px-3 w-10">
                          <input
                            type="checkbox"
                            checked={allPageSelected}
                            ref={(el) => {
                              if (el) el.indeterminate = somePageSelected && !allPageSelected;
                            }}
                            onChange={toggleSelectAll}
                            onClick={(e) => e.stopPropagation()}
                            aria-label="Select all leads on this page"
                            className="w-4 h-4 rounded border-gray-300 text-solar-500 focus:ring-solar-400 cursor-pointer"
                          />
                        </th>
                      )}
                      <th className="text-left py-3 px-3 font-semibold text-gray-600">Customer</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-600">Phone</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-600">City</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-600">Stage</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-600">Assigned To</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-600">Created By</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-600">Date</th>
                      {isAdmin && <th className="text-center py-3 px-3 font-semibold text-gray-600">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => {
                      const isSelected = selectedIds.has(lead._id);
                      return (
                        <tr
                          key={lead._id}
                          onClick={() => navigate(`/crm/leads/${lead._id}`)}
                          className={`border-b border-gray-50 hover:bg-solar-50 cursor-pointer transition-colors ${
                            isSelected ? 'bg-solar-50/80' : ''
                          }`}
                        >
                          {isAdmin && (
                            <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => toggleSelectOne(e, lead._id)}
                                aria-label={`Select ${lead.name}`}
                                className="w-4 h-4 rounded border-gray-300 text-solar-500 focus:ring-solar-400 cursor-pointer"
                              />
                            </td>
                          )}
                          <td className="py-3 px-3 font-medium text-gray-800">{lead.name}</td>
                          <td className="py-3 px-3 text-gray-600">{lead.phone}</td>
                          <td className="py-3 px-3 text-gray-500">{lead.city || '—'}</td>
                          <td className="py-3 px-3">
                            <span className={`badge ${stageColors[lead.stage] || 'bg-gray-100 text-gray-600'}`}>{lead.stage}</span>
                          </td>
                          <td className="py-3 px-3 text-gray-600">{lead.assignedTo?.name || '—'}</td>
                          <td className="py-3 px-3 text-gray-500">{lead.createdBy?.name || '—'}</td>
                          <td className="py-3 px-3 text-gray-400">{new Date(lead.createdAt).toLocaleDateString()}</td>
                          {isAdmin && (
                            <td className="py-3 px-3 text-center">
                              <button
                                onClick={(e) => handleDelete(e, lead)}
                                className="btn-danger p-1.5"
                                title="Delete lead"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <PaginationBar
                pagination={pagination}
                page={page}
                onPageChange={setPage}
                loading={loading}
                label="leads"
              />
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
