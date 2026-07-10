import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { hashPassword } from '../api/crypto';
import {
  getToken, setToken, clearToken, getSessionUser, userFromToken, migrateLegacyAuthStorage,
  registerTokenRefresh,
} from '../utils/session';

const AuthContext = createContext(null);

const ALL_LEADS_ROLES = ['admin', 'manager', 'stock_manager'];
const STOCK_ACCESS_ROLES = ['admin', 'stock_manager'];
const TEAM_VIEW_ROLES = ['admin', 'manager', 'stock_manager'];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getSessionUser());
  const [loading, setLoading] = useState(() => Boolean(getToken()) && !getSessionUser());

  useEffect(() => {
    migrateLegacyAuthStorage();
    registerTokenRefresh((sessionUser) => {
      if (sessionUser) setUser(sessionUser);
    });

    const token = getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    const sessionUser = userFromToken(token);
    if (sessionUser) {
      setUser(sessionUser);
      setLoading(false);
      return;
    }

    clearToken();
    setUser(null);
    setLoading(false);
  }, []);

  const applyToken = useCallback((token, fallbackUser) => {
    setToken(token);
    setUser(userFromToken(token) || fallbackUser || null);
  }, []);

  const login = async (email, password) => {
    const hashed = await hashPassword(password);
    const res = await api.post('/auth/login', { email, password: hashed });
    applyToken(res.data.token, res.data.user);
    return res.data.user;
  };

  const logout = () => {
    clearToken();
    setUser(null);
  };

  const updateSessionUser = useCallback((patch) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const role = user?.role;

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      updateSessionUser,
      isAdmin: role === 'admin',
      isEmployee: role === 'user',
      isSalesManager: role === 'manager',
      isStockManager: role === 'stock_manager',
      isManager: role === 'manager',
      canViewAllLeads: ALL_LEADS_ROLES.includes(role),
      canViewTeam: TEAM_VIEW_ROLES.includes(role),
      canAccessStock: STOCK_ACCESS_ROLES.includes(role),
      canTransactStock: STOCK_ACCESS_ROLES.includes(role),
      canManageStockItems: role === 'admin',
      canForwardLead: ALL_LEADS_ROLES.includes(role),
      canManageStock: STOCK_ACCESS_ROLES.includes(role),
      canAccessComplaints: role === 'admin' || Boolean(user?.handlesComplaints),
      canManageAllComplaints: role === 'admin',
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
