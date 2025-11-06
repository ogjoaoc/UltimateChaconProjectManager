// src/api/client.ts
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export function getToken() { return localStorage.getItem("access_token"); }
export function setTokens(access: string, refresh: string) {
  localStorage.setItem("access_token", access);
  localStorage.setItem("refresh_token", refresh);
}
export function clearTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

export async function apiFetch(path: string, opts: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string,string> || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { ...opts, headers });
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) throw data || { detail: res.statusText };
  return data;
}
