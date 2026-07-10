import {
  createContext, useContext, useState, useEffect, useCallback, useRef,
} from 'react';
import api from '../api/axios';
import { useAuth } from './AuthContext';

const DataCacheContext = createContext(null);

const EMPTY_READY = {
  users: false,
  stockItems: false,
  stockVouchers: false,
  quotationTemplates: false,
  assignees: false,
  leadDetails: new Set(),
  'dashboard:crm': false,
  'dashboard:admin': false,
  'dashboard:stock': false,
};

const DASHBOARD_URLS = {
  crm: '/dashboard/crm',
  admin: '/dashboard/admin',
  stock: '/dashboard/stock',
};

export function DataCacheProvider({ children }) {
  const { user } = useAuth();

  const [users, setUsers] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [stockVouchers, setStockVouchers] = useState([]);
  const [quotationTemplates, setQuotationTemplates] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [leadDetails, setLeadDetails] = useState({});
  const [dashboardCrm, setDashboardCrm] = useState(null);
  const [dashboardAdmin, setDashboardAdmin] = useState(null);
  const [dashboardStock, setDashboardStock] = useState(null);
  const [bootstrapping, setBootstrapping] = useState({});

  const ready = useRef({ ...EMPTY_READY, leadDetails: new Set() });
  const inflight = useRef({});
  const leadsPageCache = useRef({});
  const dashboardCache = useRef({ crm: null, admin: null, stock: null });
  const assigneesRef = useRef([]);

  const setBoot = useCallback((key, value) => {
    setBootstrapping((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }));
  }, []);

  const resetCache = useCallback(() => {
    setUsers([]);
    setStockItems([]);
    setStockVouchers([]);
    setQuotationTemplates([]);
    setAssignees([]);
    setLeadDetails({});
    setDashboardCrm(null);
    setDashboardAdmin(null);
    setDashboardStock(null);
    assigneesRef.current = [];
    ready.current = { ...EMPTY_READY, leadDetails: new Set() };
    inflight.current = {};
    leadsPageCache.current = {};
    dashboardCache.current = { crm: null, admin: null, stock: null };
    setBootstrapping({});
  }, []);

  useEffect(() => {
    if (!user) resetCache();
  }, [user, resetCache]);

  const fetchOnce = useCallback(async (key, url, setter) => {
    if (!user || ready.current[key]) return;
    if (inflight.current[key]) return inflight.current[key];

    setBoot(key, true);
    const promise = api.get(url)
      .then((res) => {
        setter(res.data);
        ready.current[key] = true;
      })
      .catch(() => {})
      .finally(() => {
        delete inflight.current[key];
        setBoot(key, false);
      });

    inflight.current[key] = promise;
    return promise;
  }, [user, setBoot]);

  const invalidateLeadsPages = useCallback(() => {
    leadsPageCache.current = {};
  }, []);

  const invalidateDashboardCrm = useCallback(() => {
    ready.current['dashboard:crm'] = false;
  }, []);

  const invalidateDashboardAdmin = useCallback(() => {
    ready.current['dashboard:admin'] = false;
  }, []);

  const invalidateDashboardStock = useCallback(() => {
    ready.current['dashboard:stock'] = false;
  }, []);

  const setDashboardCrmData = useCallback((data) => {
    dashboardCache.current.crm = data;
    setDashboardCrm(data);
    ready.current['dashboard:crm'] = true;
  }, []);

  const setDashboardAdminData = useCallback((data) => {
    dashboardCache.current.admin = data;
    setDashboardAdmin(data);
    ready.current['dashboard:admin'] = true;
  }, []);

  const setDashboardStockData = useCallback((data) => {
    dashboardCache.current.stock = data;
    setDashboardStock(data);
    ready.current['dashboard:stock'] = true;
  }, []);

  const fetchDashboard = useCallback(async (key, { force = false } = {}) => {
    if (!user) return null;

    const readyKey = `dashboard:${key}`;
    const url = DASHBOARD_URLS[key];
    const setters = {
      crm: setDashboardCrmData,
      admin: setDashboardAdminData,
      stock: setDashboardStockData,
    };

    if (!force && ready.current[readyKey] && dashboardCache.current[key]) {
      return dashboardCache.current[key];
    }
    if (inflight.current[readyKey]) return inflight.current[readyKey];

    setBoot(readyKey, true);
    const promise = api.get(url)
      .then((res) => {
        setters[key](res.data);
        return res.data;
      })
      .finally(() => {
        delete inflight.current[readyKey];
        setBoot(readyKey, false);
      });

    inflight.current[readyKey] = promise;
    return promise;
  }, [user, setBoot, setDashboardCrmData, setDashboardAdminData, setDashboardStockData]);

  const fetchDashboardCrm = useCallback(
    (opts) => fetchDashboard('crm', opts),
    [fetchDashboard],
  );
  const fetchDashboardAdmin = useCallback(
    (opts) => fetchDashboard('admin', opts),
    [fetchDashboard],
  );
  const fetchDashboardStock = useCallback(
    (opts) => fetchDashboard('stock', opts),
    [fetchDashboard],
  );

  const fetchLeadsPage = useCallback(async ({
    page = 1, limit = 20, stage = '', search = '', force = false,
  } = {}) => {
    if (!user) return { leads: [], pagination: { page: 1, limit, total: 0, totalPages: 1, hasNext: false, hasPrev: false } };

    const key = JSON.stringify({ page, limit, stage, search });
    if (!force && leadsPageCache.current[key]) {
      return leadsPageCache.current[key];
    }
    if (inflight.current[key]) return inflight.current[key];

    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (stage) params.set('stage', stage);
    if (search) params.set('search', search);

    const promise = api.get(`/leads?${params}`)
      .then((res) => {
        leadsPageCache.current[key] = res.data;
        return res.data;
      })
      .finally(() => {
        delete inflight.current[key];
      });

    inflight.current[key] = promise;
    return promise;
  }, [user]);

  const ensureUsers = useCallback(() => fetchOnce('users', '/users', setUsers), [fetchOnce]);

  const fetchAssignees = useCallback(async () => {
    if (!user) return [];
    if (ready.current.assignees) return assigneesRef.current;
    if (inflight.current.assignees) return inflight.current.assignees;

    setBoot('assignees', true);
    const promise = api.get('/users/assignees')
      .then((res) => {
        assigneesRef.current = res.data;
        setAssignees(res.data);
        ready.current.assignees = true;
        return res.data;
      })
      .catch(() => [])
      .finally(() => {
        delete inflight.current.assignees;
        setBoot('assignees', false);
      });

    inflight.current.assignees = promise;
    return promise;
  }, [user, setBoot]);

  const invalidateAssignees = useCallback(() => {
    ready.current.assignees = false;
    assigneesRef.current = [];
    setAssignees([]);
  }, []);

  const ensureStockItems = useCallback(
    () => fetchOnce('stockItems', '/stock/items', setStockItems),
    [fetchOnce],
  );
  const ensureStockVouchers = useCallback(
    () => fetchOnce('stockVouchers', '/stock/vouchers', setStockVouchers),
    [fetchOnce],
  );
  const ensureQuotationTemplates = useCallback(
    () => fetchOnce('quotationTemplates', '/quotations/templates', setQuotationTemplates),
    [fetchOnce],
  );

  const ensureLeadDetail = useCallback(async (id) => {
    if (!user || !id || ready.current.leadDetails.has(id)) return;
    const key = `leadDetail:${id}`;
    if (inflight.current[key]) return inflight.current[key];

    setBoot(key, true);
    const promise = api.get(`/leads/${id}`)
      .then((res) => {
        setLeadDetails((prev) => ({ ...prev, [id]: res.data }));
        ready.current.leadDetails.add(id);
      })
      .catch(() => {})
      .finally(() => {
        delete inflight.current[key];
        setBoot(key, false);
      });

    inflight.current[key] = promise;
    return promise;
  }, [user, setBoot]);

  const upsertLead = useCallback((lead) => {
    setLeadDetails((prev) => ({ ...prev, [lead._id]: lead }));
    ready.current.leadDetails.add(lead._id);
    invalidateLeadsPages();
    invalidateDashboardCrm();
    invalidateDashboardAdmin();
  }, [invalidateLeadsPages, invalidateDashboardCrm, invalidateDashboardAdmin]);

  const removeLead = useCallback((id) => {
    setLeadDetails((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    ready.current.leadDetails.delete(id);
    invalidateLeadsPages();
    invalidateDashboardCrm();
    invalidateDashboardAdmin();
  }, [invalidateLeadsPages, invalidateDashboardCrm, invalidateDashboardAdmin]);

  const removeLeads = useCallback((ids) => {
    if (!ids?.length) return;
    setLeadDetails((prev) => {
      const next = { ...prev };
      ids.forEach((id) => {
        delete next[id];
        ready.current.leadDetails.delete(id);
      });
      return next;
    });
    invalidateLeadsPages();
    invalidateDashboardCrm();
    invalidateDashboardAdmin();
  }, [invalidateLeadsPages, invalidateDashboardCrm, invalidateDashboardAdmin]);

  const refreshLeadDetail = useCallback(async (id) => {
    const res = await api.get(`/leads/${id}`);
    upsertLead(res.data);
    return res.data;
  }, [upsertLead]);

  const upsertUser = useCallback((userData) => {
    setUsers((prev) => {
      const idx = prev.findIndex((u) => u._id === userData._id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = userData;
        return next;
      }
      return [userData, ...prev];
    });
    ready.current.users = true;
    invalidateDashboardAdmin();
  }, [invalidateDashboardAdmin]);

  const removeUser = useCallback((id) => {
    setUsers((prev) => prev.filter((u) => u._id !== id));
    invalidateDashboardAdmin();
  }, [invalidateDashboardAdmin]);

  const upsertStockItem = useCallback((item) => {
    setStockItems((prev) => {
      const idx = prev.findIndex((i) => i._id === item._id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = item;
        return next;
      }
      return [...prev, item].sort((a, b) => a.name.localeCompare(b.name));
    });
    ready.current.stockItems = true;
    invalidateDashboardStock();
    invalidateDashboardAdmin();
  }, [invalidateDashboardStock, invalidateDashboardAdmin]);

  const removeStockItem = useCallback((id) => {
    setStockItems((prev) => prev.filter((i) => i._id !== id));
    invalidateDashboardStock();
    invalidateDashboardAdmin();
  }, [invalidateDashboardStock, invalidateDashboardAdmin]);

  const applyVoucherToStock = useCallback((voucher, reverse = false) => {
    const sign = reverse
      ? (voucher.type === 'ADD' ? -1 : 1)
      : (voucher.type === 'ADD' ? 1 : -1);

    setStockItems((prev) => prev.map((item) => {
      const row = voucher.items.find((r) => String(r.item?._id || r.item) === String(item._id));
      if (!row) return item;
      return { ...item, quantity: item.quantity + sign * row.quantity };
    }));
  }, []);

  const addStockVoucher = useCallback((voucher) => {
    setStockVouchers((prev) => [voucher, ...prev]);
    applyVoucherToStock(voucher, false);
    ready.current.stockVouchers = true;
    invalidateDashboardStock();
    invalidateDashboardAdmin();
  }, [applyVoucherToStock, invalidateDashboardStock, invalidateDashboardAdmin]);

  const removeStockVoucher = useCallback((id) => {
    setStockVouchers((prev) => {
      const voucher = prev.find((v) => v._id === id);
      if (voucher) applyVoucherToStock(voucher, true);
      return prev.filter((v) => v._id !== id);
    });
    invalidateDashboardStock();
    invalidateDashboardAdmin();
  }, [applyVoucherToStock, invalidateDashboardStock, invalidateDashboardAdmin]);

  const upsertQuotationTemplate = useCallback((template) => {
    setQuotationTemplates((prev) => {
      const idx = prev.findIndex((t) => t._id === template._id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = template;
        return next;
      }
      return [template, ...prev];
    });
    ready.current.quotationTemplates = true;
    invalidateDashboardAdmin();
  }, [invalidateDashboardAdmin]);

  const removeQuotationTemplate = useCallback((id) => {
    setQuotationTemplates((prev) => prev.filter((t) => t._id !== id));
    invalidateDashboardAdmin();
  }, [invalidateDashboardAdmin]);

  const isLoading = useCallback((key) => {
    if (key.startsWith('leadDetail:')) {
      const id = key.slice(11);
      return Boolean(bootstrapping[key]) && !ready.current.leadDetails.has(id);
    }
    if (key.startsWith('dashboard:')) {
      return Boolean(bootstrapping[key]) && !ready.current[key];
    }
    return Boolean(bootstrapping[key]) && !ready.current[key];
  }, [bootstrapping]);

  const isReady = useCallback((key) => {
    if (key.startsWith('leadDetail:')) {
      return ready.current.leadDetails.has(key.slice(11));
    }
    return Boolean(ready.current[key]);
  }, []);

  return (
    <DataCacheContext.Provider value={{
      users,
      stockItems,
      stockVouchers,
      quotationTemplates,
      assignees,
      fetchAssignees,
      invalidateAssignees,
      leadDetails,
      dashboardCrm,
      dashboardAdmin,
      dashboardStock,
      fetchLeadsPage,
      invalidateLeadsPages,
      fetchDashboardCrm,
      fetchDashboardAdmin,
      fetchDashboardStock,
      setDashboardCrmData,
      setDashboardAdminData,
      invalidateDashboardCrm,
      invalidateDashboardAdmin,
      invalidateDashboardStock,
      ensureUsers,
      ensureStockItems,
      ensureStockVouchers,
      ensureQuotationTemplates,
      ensureLeadDetail,
      refreshLeadDetail,
      upsertLead,
      removeLead,
      removeLeads,
      upsertUser,
      removeUser,
      invalidateAssignees,
      upsertStockItem,
      removeStockItem,
      addStockVoucher,
      removeStockVoucher,
      upsertQuotationTemplate,
      removeQuotationTemplate,
      isLoading,
      isReady,
    }}>
      {children}
    </DataCacheContext.Provider>
  );
}

export const useDataCache = () => {
  const ctx = useContext(DataCacheContext);
  if (!ctx) throw new Error('useDataCache must be used within DataCacheProvider');
  return ctx;
};
