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
  
  try {
    const res = await fetch(`${API_URL}${path}`, { ...opts, headers });

    // Se a resposta for 204 No Content, não há corpo para ler.
    if (res.status === 204) {
      return null; // Retorna nulo ou algo que indique sucesso sem dados
    }

    const data = await res.json();
    
    if (!res.ok) {
      // Se o erro for um objeto com uma chave detail, use ela
      if (data?.detail) {
        throw new Error(data.detail);
      }
      // Se for um objeto de erros por campo, junte-os
      if (typeof data === 'object') {
        const errorMessages = Object.entries(data)
          .map(([key, value]) => `${key}: ${value}`)
          .join('; ');
        throw new Error(errorMessages || 'Erro desconhecido');
      }
      // Fallback para o status text
      throw new Error(res.statusText);
    }
    
    return data;
  } catch (error: any) {
    // Se já for um Error, apenas repasse
    if (error instanceof Error) throw error;
    // Caso contrário, crie um novo erro
    throw new Error(error?.message || 'Erro na requisição');
  }
}
