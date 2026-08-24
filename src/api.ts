export type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
};

export type AuthResponse = {
  token: string;
  user: User;
};

export type GalleryItem = {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  sourceImageUrl: string;
  s3Key: string | null;
  priceCents: number | null;
  isSold: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  images: GalleryImage[];
};

export type GalleryImage = {
  id: number;
  imageUrl: string;
  sourceImageUrl: string;
  s3Key: string | null;
  displayOrder: number;
};

export type GalleryDraft = {
  title: string;
  description: string;
  price: string;
};

export type Category = {
  id: number;
  name: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type OrderFile = {
  id: number;
  fileName: string;
  fileUrl: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
};

export type OrderComment = {
  id: number;
  authorRole: string;
  body: string;
  emailSentAt: string | null;
  emailError: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OrderReview = {
  id: number;
  rating: number;
  body: string;
  discountAwarded: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Order = {
  orderKind: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  galleryItemId: number | null;
  categoryName: string;
  categoryId: number | null;
  customCategoryName: string | null;
  instructions: string;
  medium: string;
  size: string;
  status: string;
  quoteAmountCents: number | null;
  payableAmountCents: number | null;
  appliedReviewDiscountCents: number;
  galleryImageUrl: string | null;
  shippingName: string | null;
  shippingLine1: string | null;
  shippingLine2: string | null;
  shippingCity: string | null;
  shippingState: string | null;
  shippingPostalCode: string | null;
  shippingCountry: string | null;
  paymentPending: boolean;
  customerConfirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
  viewerIsAdmin: boolean;
  files: OrderFile[];
  comments: OrderComment[];
  review: OrderReview | null;
  canLeaveReview: boolean;
  reviewDiscountEligible: boolean;
  reviewDiscountAvailable: boolean;
};

export type OrderSummary = {
  orderNumber: string;
  orderKind: string;
  customerName: string;
  customerEmail: string;
  categoryName: string;
  status: string;
  amountCents: number | null;
  customerConfirmedAt: string | null;
  canOpen: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PaginatedOrders = {
  items: OrderSummary[];
  page: number;
  pageSize: number;
  total: number;
};

export type CommissionDraft = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  categoryId: string;
  customCategoryName: string;
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
};

export const galleryApi = {
  listPublic: () => request<GalleryItem[]>("/gallery"),
  getItem: (itemId: number) => request<GalleryItem>(`/gallery/${itemId}`),
  listAdmin: (token: string) => request<GalleryItem[]>("/admin/gallery", { method: "GET" }, token),
  create: (token: string, payload: GalleryDraft, files: File[] = []) => {
    const formData = new FormData();
    formData.append("title", payload.title);
    formData.append("description", payload.description);
    formData.append("price_amount", payload.price);
    files.forEach((file) => formData.append("files", file));
    return request<GalleryItem>("/admin/gallery", { method: "POST", body: formData }, token);
  },
  update: (token: string, itemId: number, payload: GalleryDraft, files: File[] = [], existingImageIds: number[] = []) => {
    const formData = new FormData();
    formData.append("title", payload.title);
    formData.append("description", payload.description);
    formData.append("price_amount", payload.price);
    existingImageIds.forEach((imageId) => formData.append("existing_image_ids", String(imageId)));
    files.forEach((file) => formData.append("files", file));
    return request<GalleryItem>(`/admin/gallery/${itemId}`, { method: "PATCH", body: formData }, token);
  },
  remove: (token: string, itemId: number) => request<{ status: string }>(`/admin/gallery/${itemId}`, { method: "DELETE" }, token),
  reorder: (token: string, orderedIds: number[]) => request<{ status: string }>("/admin/gallery/reorder", { method: "POST", body: JSON.stringify({ orderedIds }) }, token),
  createCheckout: (itemId: number, customerEmail: string) => request<{ url: string }>(`/gallery/${itemId}/checkout`, { method: "POST", body: JSON.stringify({ customerEmail }) }),
  createInquiry: (itemId: number, customerEmail: string, body: string) => request<Order>(`/gallery/${itemId}/inquiries`, { method: "POST", body: JSON.stringify({ customerEmail, body }) }),
};

export const categoryApi = {
  listPublic: () => request<Category[]>("/commission-categories"),
  listAdmin: (token: string) => request<Category[]>("/admin/commission-categories", { method: "GET" }, token),
  create: (token: string, name: string) => request<Category>("/admin/commission-categories", { method: "POST", body: JSON.stringify({ name }) }, token),
  update: (token: string, categoryId: number, name: string, isArchived: boolean) => request<Category>(`/admin/commission-categories/${categoryId}`, { method: "PATCH", body: JSON.stringify({ name, isArchived }) }, token),
};

export const orderApi = {
  submit: (draft: CommissionDraft) => {
    const formData = new FormData();
    formData.append("customer_name", draft.customerName);
    formData.append("customer_email", draft.customerEmail);
    formData.append("customer_phone", draft.customerPhone);
    if (draft.categoryId && draft.categoryId !== "custom") {
      formData.append("category_id", draft.categoryId);
    }
    formData.append("custom_category_name", draft.customCategoryName);
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
  decline: (orderNumber: string) => request<Order>(`/orders/${orderNumber}/decline`, { method: "POST" }),
  createCheckout: (orderNumber: string) => request<{ url: string }>(`/orders/${orderNumber}/checkout`, { method: "POST" }),
  createGalleryInquiryCheckout: (orderNumber: string) => request<{ url: string }>(`/gallery-inquiries/${orderNumber}/checkout`, { method: "POST" }),
  confirmCheckout: (orderNumber: string, checkoutSessionId: string) => request<Order>(`/orders/${orderNumber}/confirm-payment`, { method: "POST", body: JSON.stringify({ checkoutSessionId }) }),
  confirmReceived: (orderNumber: string) => request<Order>(`/orders/${orderNumber}/confirm-received`, { method: "POST" }),
  submitReview: (orderNumber: string, rating: number, body: string) => request<Order>(`/orders/${orderNumber}/review`, { method: "POST", body: JSON.stringify({ rating, body }) }),
  listAdmin: (token: string, page: number) => request<PaginatedOrders>(`/admin/orders?page=${page}&page_size=10`, { method: "GET" }, token),
  setQuote: (token: string, orderNumber: string, quoteAmount: string) => request<Order>(`/admin/orders/${orderNumber}/quote`, { method: "POST", body: JSON.stringify({ quoteAmount }) }, token),
  declineAdmin: (token: string, orderNumber: string) => request<Order>(`/admin/orders/${orderNumber}/decline`, { method: "POST" }, token),
  updateStatus: (token: string, orderNumber: string, status: string) => request<Order>(`/admin/orders/${orderNumber}/status`, { method: "POST", body: JSON.stringify({ status }) }, token),
};
