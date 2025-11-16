// src/api/client.ts
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function getToken() { return localStorage.getItem("access_token"); }
function getRefreshToken() { return localStorage.getItem("refresh_token"); }
export function setTokens(access: string, refresh: string) {
  localStorage.setItem("access_token", access);
  localStorage.setItem("refresh_token", refresh);
}
export function clearTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
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
      localStorage.setItem('access_token', newAccessToken);
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
