export type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at: string;
  updated_at: string;
};


export type AuthResponse = {
  token: string;
  user: User;
};


export type GalleryItem = {
  id: number;
  title: string;
  description: string;
  image_url: string;
  source_image_url: string;
  s3_key: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
};


export type GalleryDraft = {
  title: string;
  description: string;
  image_url: string;
  s3_key: string;
};


const apiBaseUrl = process.env.REACT_APP_API_BASE_URL ?? "http://localhost:8000";


async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, { ...options, headers });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? "Request failed.");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}


export const authApi = {
  signup: (name: string, email: string, password: string) => request<AuthResponse>("/auth/signup", { method: "POST", body: JSON.stringify({ name, email, password }) }),
  login: (email: string, password: string) => request<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  validateToken: (token: string) => request<User>("/auth/validate-token", { method: "GET" }, token),
  updateProfile: (token: string, name: string) => request<User>("/profile", { method: "PATCH", body: JSON.stringify({ name }) }, token),
};


export const galleryApi = {
  listPublic: () => request<GalleryItem[]>("/gallery"),
  listAdmin: (token: string) => request<GalleryItem[]>("/admin/gallery", { method: "GET" }, token),
  create: (token: string, payload: GalleryDraft) => request<GalleryItem>("/admin/gallery", { method: "POST", body: JSON.stringify(payload) }, token),
  update: (token: string, itemId: number, payload: GalleryDraft) => request<GalleryItem>(`/admin/gallery/${itemId}`, { method: "PATCH", body: JSON.stringify(payload) }, token),
  remove: (token: string, itemId: number) => request<{ status: string }>(`/admin/gallery/${itemId}`, { method: "DELETE" }, token),
  reorder: (token: string, orderedIds: number[]) => request<{ status: string }>("/admin/gallery/reorder", { method: "POST", body: JSON.stringify({ ordered_ids: orderedIds }) }, token),
  upload: async (token: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return request<{ s3_key: string; preview_url: string }>("/admin/gallery/upload", { method: "POST", body: formData }, token);
  },
};
