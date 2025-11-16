// src/api/client.ts
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const TAB_SCOPE_SESSION_KEY = "ucpm_tab_scope_v1";

const hasWindow = typeof window !== "undefined";

function safeGetLocalStorage(): Storage | null {
  if (!hasWindow) return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function safeGetSessionStorage(): Storage | null {
  if (!hasWindow) return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function randomScopeId() {
  if (!hasWindow) return null;
  const crypto = window.crypto;
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function getTabScopeId() {
  const sessionStorage = safeGetSessionStorage();
  if (!sessionStorage) return null;
  let scope = sessionStorage.getItem(TAB_SCOPE_SESSION_KEY);
  if (!scope) {
    scope = randomScopeId();
    if (scope) sessionStorage.setItem(TAB_SCOPE_SESSION_KEY, scope);
  }
  return scope;
}

function getScopedKey(baseKey: string) {
  const scope = getTabScopeId();
  return scope ? `${baseKey}:${scope}` : baseKey;
}

function migrateLegacyToken(baseKey: string) {
  const storage = safeGetLocalStorage();
  if (!storage) return;
  const scopedKey = getScopedKey(baseKey);
  if (scopedKey === baseKey) return; // sem escopo, nada para migrar
  if (storage.getItem(scopedKey)) return;
  const legacyValue = storage.getItem(baseKey);
  if (legacyValue) {
    storage.setItem(scopedKey, legacyValue);
    storage.removeItem(baseKey);
  }
}

function getToken() {
  const storage = safeGetLocalStorage();
  if (!storage) return null;
  migrateLegacyToken(ACCESS_TOKEN_KEY);
  return storage.getItem(getScopedKey(ACCESS_TOKEN_KEY));
}

function getRefreshToken() {
  const storage = safeGetLocalStorage();
  if (!storage) return null;
  migrateLegacyToken(REFRESH_TOKEN_KEY);
  return storage.getItem(getScopedKey(REFRESH_TOKEN_KEY));
}

function setAccessToken(access: string) {
  const storage = safeGetLocalStorage();
  if (!storage) return;
  storage.setItem(getScopedKey(ACCESS_TOKEN_KEY), access);
}

function setRefreshToken(refresh: string) {
  const storage = safeGetLocalStorage();
  if (!storage) return;
  storage.setItem(getScopedKey(REFRESH_TOKEN_KEY), refresh);
}

export function setTokens(access: string, refresh: string) {
  setAccessToken(access);
  if (refresh) {
    setRefreshToken(refresh);
  }
}

export function clearTokens() {
  const storage = safeGetLocalStorage();
  if (!storage) return;
  [
    getScopedKey(ACCESS_TOKEN_KEY),
    getScopedKey(REFRESH_TOKEN_KEY),
    ACCESS_TOKEN_KEY,
    REFRESH_TOKEN_KEY,
  ].forEach((key) => storage.removeItem(key));
}

// --- Lógica de Token Refresh ---
let isRefreshing = false;
let failedQueue: { resolve: (value?: any) => void; reject: (reason?: any) => void; }[] = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};
// --- Fim da Lógica de Token Refresh ---

export async function apiFetch(path: string, opts: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string,string> || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  let res = await fetch(`${API_URL}${path}`, { ...opts, headers });

  if (res.status === 401) {
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(newToken => {
        headers['Authorization'] = `Bearer ${newToken}`;
        return fetch(`${API_URL}${path}`, { ...opts, headers });
      });
    }

    isRefreshing = true;
    const refreshToken = getRefreshToken();

    if (!refreshToken) {
      clearTokens();
      window.location.href = '/auth';
      return Promise.reject(new Error("Sessão expirada."));
    }

    try {
      const refreshRes = await fetch(`${API_URL}/api/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (!refreshRes.ok) {
        throw new Error("Não foi possível renovar a sessão.");
      }

  const { access: newAccessToken } = await refreshRes.json();
  setAccessToken(newAccessToken);
      headers['Authorization'] = `Bearer ${newAccessToken}`;
      
      processQueue(null, newAccessToken);
      res = await fetch(`${API_URL}${path}`, { ...opts, headers });

    } catch (e) {
      clearTokens();
      processQueue(e as Error, null);
      window.location.href = '/auth';
      return Promise.reject(e);
    } finally {
      isRefreshing = false;
    }
  }

  if (res.status === 204) {
    return null;
  }

  const data = await res.json();

  if (!res.ok) {
    const errorMessage = data?.detail || JSON.stringify(data);
    throw new Error(errorMessage);
  }

  return data;
}
