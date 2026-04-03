const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }

  return res.json();
}

export const api = {
  // Auth
  register: (data: { name: string; email: string; password: string }) =>
    apiFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  login: (data: { email: string; password: string }) =>
    apiFetch("/api/auth/login", { method: "POST", body: JSON.stringify(data) }),

  // Documents
  uploadDocument: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiFetch("/api/documents/upload", { method: "POST", body: form });
  },
  getDocuments: () => apiFetch("/api/documents"),
  getDocument: (id: string) => apiFetch(`/api/documents/${id}`),
  renameDocument: (id: string, name: string) =>
    apiFetch(`/api/documents/${id}`, { method: "PATCH", body: JSON.stringify({ name }) }),
  deleteDocument: (id: string) =>
    apiFetch(`/api/documents/${id}`, { method: "DELETE" }),

  // Requests
  createRequest: (data: Record<string, unknown>) =>
    apiFetch("/api/requests", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getRequests: () => apiFetch("/api/requests"),
  getRequest: (id: string) => apiFetch(`/api/requests/${id}`),
  cancelRequest: (id: string) =>
    apiFetch(`/api/requests/${id}/cancel`, { method: "POST" }),
  remindRequest: (id: string) =>
    apiFetch(`/api/requests/${id}/remind`, { method: "POST" }),

  // Signing (public)
  getSigningSession: (token: string) => apiFetch(`/api/signing/${token}`),
  submitSigning: (token: string, fields: { fieldId: string; value: string }[]) =>
    apiFetch(`/api/signing/${token}/submit`, {
      method: "POST",
      body: JSON.stringify({ fields }),
    }),
  declineSigning: (token: string, reason?: string) =>
    apiFetch(`/api/signing/${token}/decline`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),

  // Contacts
  createContact: (data: Record<string, unknown>) =>
    apiFetch("/api/contacts", { method: "POST", body: JSON.stringify(data) }),
  getContacts: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiFetch(`/api/contacts${qs}`);
  },
  getContact: (id: string) => apiFetch(`/api/contacts/${id}`),
  updateContact: (id: string, data: Record<string, unknown>) =>
    apiFetch(`/api/contacts/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteContact: (id: string) =>
    apiFetch(`/api/contacts/${id}`, { method: "DELETE" }),
  importContacts: (contacts: Record<string, unknown>[]) =>
    apiFetch("/api/contacts/import", { method: "POST", body: JSON.stringify({ contacts }) }),

  // Templates
  createTemplate: (data: Record<string, unknown>) =>
    apiFetch("/api/templates", { method: "POST", body: JSON.stringify(data) }),
  getTemplates: () => apiFetch("/api/templates"),
  getTemplate: (id: string) => apiFetch(`/api/templates/${id}`),
  updateTemplate: (id: string, data: Record<string, unknown>) =>
    apiFetch(`/api/templates/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteTemplate: (id: string) =>
    apiFetch(`/api/templates/${id}`, { method: "DELETE" }),
};

export const getFileUrl = (path: string) => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  const parts = path.split("/");
  const filename = parts[parts.length - 1];
  return `${API_URL}/uploads/originals/${filename}`;
};

export const getCompletedFileUrl = (path: string) => {
  if (!path) return "";
  return path; // Cloudinary HTTPS URL stored in DB
};
