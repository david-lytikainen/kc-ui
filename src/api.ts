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


export type Category = {
  id: number;
  name: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};


export type OrderFile = {
  id: number;
  file_name: string;
  file_url: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
};


export type OrderComment = {
  id: number;
  author_role: string;
  body: string;
  email_sent_at: string | null;
  created_at: string;
  updated_at: string;
  can_send_email: boolean;
};


export type Order = {
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  category_name: string;
  category_id: number | null;
  custom_category_name: string | null;
  instructions: string;
  medium: string;
  size: string;
  status: string;
  quote_amount_cents: number | null;
  created_at: string;
  updated_at: string;
  viewer_is_admin: boolean;
  files: OrderFile[];
  comments: OrderComment[];
};


export type OrderSummary = {
  order_number: string;
  customer_name: string;
  category_name: string;
  status: string;
  quote_amount_cents: number | null;
  created_at: string;
  updated_at: string;
};


export type PaginatedOrders = {
  items: OrderSummary[];
  page: number;
  page_size: number;
  total: number;
};


export type CommissionDraft = {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  category_id: string;
  custom_category_name: string;
  instructions: string;
  medium: string;
  size: string;
  files: File[];
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


export const categoryApi = {
  listPublic: () => request<Category[]>("/commission-categories"),
  listAdmin: (token: string) => request<Category[]>("/admin/commission-categories", { method: "GET" }, token),
  create: (token: string, name: string) => request<Category>("/admin/commission-categories", { method: "POST", body: JSON.stringify({ name }) }, token),
  update: (token: string, categoryId: number, name: string, isArchived: boolean) => request<Category>(`/admin/commission-categories/${categoryId}`, { method: "PATCH", body: JSON.stringify({ name, is_archived: isArchived }) }, token),
};


export const orderApi = {
  submit: async (draft: CommissionDraft) => {
    const formData = new FormData();
    formData.append("customer_name", draft.customer_name);
    formData.append("customer_email", draft.customer_email);
    formData.append("customer_phone", draft.customer_phone);
    if (draft.category_id && draft.category_id !== "custom") {
      formData.append("category_id", draft.category_id);
    }
    formData.append("custom_category_name", draft.custom_category_name);
    formData.append("instructions", draft.instructions);
    formData.append("medium", draft.medium);
    formData.append("size", draft.size);
    draft.files.forEach((file) => formData.append("files", file));
    return request<Order>("/commissions", { method: "POST", body: formData });
  },
  get: (orderNumber: string, token?: string) => request<Order>(`/orders/${orderNumber}`, { method: "GET" }, token),
  createComment: (orderNumber: string, body: string, token?: string) => request<OrderComment>(`/orders/${orderNumber}/comments`, { method: "POST", body: JSON.stringify({ body }) }, token),
  updateComment: (orderNumber: string, commentId: number, body: string, token?: string) => request<OrderComment>(`/orders/${orderNumber}/comments/${commentId}`, { method: "PATCH", body: JSON.stringify({ body }) }, token),
  deleteComment: (orderNumber: string, commentId: number, token?: string) => request<{ status: string }>(`/orders/${orderNumber}/comments/${commentId}`, { method: "DELETE" }, token),
  sendCommentEmail: (orderNumber: string, commentId: number, token?: string) => request<OrderComment>(`/orders/${orderNumber}/comments/${commentId}/send-email`, { method: "POST" }, token),
  decline: (orderNumber: string) => request<Order>(`/orders/${orderNumber}/decline`, { method: "POST" }),
  createCheckout: (orderNumber: string) => request<{ url: string }>(`/orders/${orderNumber}/checkout`, { method: "POST" }),
  confirmCheckout: (orderNumber: string, checkoutSessionId: string) => request<Order>(`/orders/${orderNumber}/confirm-payment`, { method: "POST", body: JSON.stringify({ checkout_session_id: checkoutSessionId }) }),
  listAdmin: (token: string, page: number) => request<PaginatedOrders>(`/admin/orders?page=${page}&page_size=10`, { method: "GET" }, token),
  setQuote: (token: string, orderNumber: string, quoteAmount: string) => request<Order>(`/admin/orders/${orderNumber}/quote`, { method: "POST", body: JSON.stringify({ quote_amount: quoteAmount }) }, token),
  declineAdmin: (token: string, orderNumber: string) => request<Order>(`/admin/orders/${orderNumber}/decline`, { method: "POST" }, token),
  updateStatus: (token: string, orderNumber: string, status: string) => request<Order>(`/admin/orders/${orderNumber}/status`, { method: "POST", body: JSON.stringify({ status }) }, token),
};
