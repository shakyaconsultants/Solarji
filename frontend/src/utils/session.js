const TOKEN_KEY = 'solarji_token';

/** Read JWT from sessionStorage (tab session — cleared when tab closes). */
export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}

export function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

/** One-time migration from older localStorage auth keys. */
export function migrateLegacyAuthStorage() {
  const legacyToken = localStorage.getItem(TOKEN_KEY);
  if (legacyToken && !getToken()) {
    setToken(legacyToken);
  }
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('solarji_user');
}

/** Decode JWT payload client-side for instant UI (signature verified by server on API calls). */
export function userFromToken(token) {
  if (!token) return null;
  try {
    const base64 = token.split('.')[1];
    if (!base64) return null;
    const payload = JSON.parse(atob(base64.replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload.id || !payload.role) return null;
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return {
      _id: payload.id,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      phone: payload.phone || '',
      points: typeof payload.points === 'number' ? payload.points : undefined,
      handlesComplaints: Boolean(payload.handlesComplaints),
    };
  } catch {
    return null;
  }
}

export function getSessionUser() {
  return userFromToken(getToken());
}

let tokenRefreshHandler = null;

export function registerTokenRefresh(handler) {
  tokenRefreshHandler = handler;
}

export function applyRefreshedToken(token) {
  if (!token) return;
  setToken(token);
  tokenRefreshHandler?.(userFromToken(token));
}
