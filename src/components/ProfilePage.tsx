import { ChangeEvent, FormEvent, useEffect, useState } from "react";

import { authApi, Category, categoryApi, GalleryDraft, galleryApi, GalleryItem, orderApi, OrderSummary, User } from "../api";


type ProfilePageProps = {
  token: string;
  user: User;
  onUserChange: (user: User) => void;
  onGalleryChanged: () => void;
  onOpenOrder: (orderNumber: string) => void;
};


const emptyDraft: GalleryDraft = { title: "", description: "", imageUrl: "", s3Key: "" };


export default function ProfilePage({ token, user, onUserChange, onGalleryChanged, onOpenOrder }: ProfilePageProps) {
  const [name, setName] = useState(user.name);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [galleryError, setGalleryError] = useState("");
  const [galleryMessage, setGalleryMessage] = useState("");
  const [isLoadingItems, setIsLoadingItems] = useState(user.role === "admin");
  const [draft, setDraft] = useState<GalleryDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedPreviewUrl, setUploadedPreviewUrl] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [categoryError, setCategoryError] = useState("");
  const [categoryMessage, setCategoryMessage] = useState("");
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [isLoadingOrders, setIsLoadingOrders] = useState(user.role === "admin");
  const [ordersError, setOrdersError] = useState("");

  useEffect(() => {
    setName(user.name);
  }, [user.name]);

  useEffect(() => {
    if (user.role !== "admin") {
      return;
    }

    async function loadAdminState() {
      try {
        setIsLoadingItems(true);
        setGalleryError("");
        setItems(await galleryApi.listAdmin(token));
      } catch (nextError) {
        setGalleryError(nextError instanceof Error ? nextError.message : "Unable to load admin gallery.");
      } finally {
        setIsLoadingItems(false);
      }
    }

    async function loadCategories() {
      try {
        setCategoryError("");
        setCategories(await categoryApi.listAdmin(token));
      } catch (nextError) {
        setCategoryError(nextError instanceof Error ? nextError.message : "Unable to load categories.");
      }
    }

    void loadAdminState();
    void loadCategories();
  }, [token, user.role]);

  useEffect(() => {
    if (user.role !== "admin") {
      return;
    }

    async function loadOrders() {
      try {
        setIsLoadingOrders(true);
        setOrdersError("");
        const response = await orderApi.listAdmin(token, ordersPage);
        setOrders(response.items);
        setOrdersTotal(response.total);
      } catch (nextError) {
        setOrdersError(nextError instanceof Error ? nextError.message : "Unable to load orders.");
      } finally {
        setIsLoadingOrders(false);
      }
    }

    void loadOrders();
  }, [ordersPage, token, user.role]);

  const isEditing = editingId !== null;

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setIsSavingProfile(true);
      setProfileMessage("");
      setProfileError("");
      const nextUser = await authApi.updateProfile(token, name);
      onUserChange(nextUser);
      setProfileMessage("Profile saved.");
    } catch (nextError) {
      setProfileError(nextError instanceof Error ? nextError.message : "Unable to save profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const resetDraft = () => {
    setDraft(emptyDraft);
    setEditingId(null);
    setUploadedPreviewUrl("");
  };

  const reloadCategories = async () => {
    setCategories(await categoryApi.listAdmin(token));
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setIsUploading(true);
      setGalleryError("");
      const uploaded = await galleryApi.upload(token, file);
      setDraft((current) => ({ ...current, s3Key: uploaded.s3Key }));
      setUploadedPreviewUrl(uploaded.previewUrl);
      setGalleryMessage("Image uploaded.");
    } catch (nextError) {
      setGalleryError(nextError instanceof Error ? nextError.message : "Upload failed.");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const refreshAdminItems = async () => {
    const nextItems = await galleryApi.listAdmin(token);
    setItems(nextItems);
    onGalleryChanged();
  };

  const handleGallerySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setGalleryError("");
      setGalleryMessage("");
      if (isEditing && editingId !== null) {
        await galleryApi.update(token, editingId, draft);
      } else {
        await galleryApi.create(token, draft);
      }
      await refreshAdminItems();
      resetDraft();
      setGalleryMessage(isEditing ? "Gallery item updated." : "Gallery item created.");
    } catch (nextError) {
      setGalleryError(nextError instanceof Error ? nextError.message : "Unable to save gallery item.");
    }
  };

  const handleDelete = async (itemId: number) => {
    try {
      setGalleryError("");
      setGalleryMessage("");
      await galleryApi.remove(token, itemId);
      await refreshAdminItems();
      if (editingId === itemId) {
        resetDraft();
      }
      setGalleryMessage("Gallery item deleted.");
    } catch (nextError) {
      setGalleryError(nextError instanceof Error ? nextError.message : "Unable to delete gallery item.");
    }
  };

  const handleDrop = (targetId: number) => {
    if (draggingId === null || draggingId === targetId) {
      return;
    }

    const nextItems = [...items];
    const fromIndex = nextItems.findIndex((item) => item.id === draggingId);
    const toIndex = nextItems.findIndex((item) => item.id === targetId);
    if (fromIndex === -1 || toIndex === -1) {
      return;
    }

    const [movedItem] = nextItems.splice(fromIndex, 1);
    nextItems.splice(toIndex, 0, movedItem);
    setItems(nextItems);
    setDraggingId(null);
  };

  const saveOrder = async () => {
    try {
      setGalleryError("");
      setGalleryMessage("");
      await galleryApi.reorder(token, items.map((item) => item.id));
      await refreshAdminItems();
      setGalleryMessage("Gallery order saved.");
    } catch (nextError) {
      setGalleryError(nextError instanceof Error ? nextError.message : "Unable to save order.");
    }
  };

  const handleCategorySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setCategoryError("");
      setCategoryMessage("");
      if (editingCategoryId !== null) {
        const category = categories.find((item) => item.id === editingCategoryId);
        if (!category) {
          throw new Error("Category not found.");
        }
        await categoryApi.update(token, editingCategoryId, categoryName, category.isArchived);
      } else {
        await categoryApi.create(token, categoryName);
      }
      setCategoryName("");
      setEditingCategoryId(null);
      await reloadCategories();
      setCategoryMessage(editingCategoryId !== null ? "Category updated." : "Category created.");
    } catch (nextError) {
      setCategoryError(nextError instanceof Error ? nextError.message : "Unable to save category.");
    }
  };

  const toggleArchiveCategory = async (category: Category) => {
    try {
      setCategoryError("");
      setCategoryMessage("");
      await categoryApi.update(token, category.id, category.name, !category.isArchived);
      await reloadCategories();
      setCategoryMessage(category.isArchived ? "Category restored." : "Category archived.");
    } catch (nextError) {
      setCategoryError(nextError instanceof Error ? nextError.message : "Unable to update category.");
    }
  };

  const totalPages = Math.max(1, Math.ceil(ordersTotal / 10));

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <div>
        <p style={{ margin: 0, fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", color: "#9c6f63" }}>Profile</p>
        <h2 style={{ margin: "8px 0 0", fontSize: "1.5rem" }}>{user.name}</h2>
      </div>
      <form onSubmit={handleProfileSubmit} style={{ display: "grid", gap: 12, padding: 16, border: "1px solid #ead9d2", borderRadius: 14, background: "#ffffff" }}>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" style={{ width: "100%", padding: 14, border: "1px solid #d9c4bd", borderRadius: 10, fontSize: "1rem" }} />
        <input value={user.email} readOnly style={{ width: "100%", padding: 14, border: "1px solid #ead9d2", borderRadius: 10, fontSize: "1rem", color: "#6a4b43", background: "#faf3f0" }} />
        <p style={{ margin: 0, color: "#6a4b43" }}>Role: {user.role}</p>
        {profileError ? <p style={{ margin: 0, color: "#8f2d1d" }}>{profileError}</p> : null}
        {profileMessage ? <p style={{ margin: 0, color: "#2c6e49" }}>{profileMessage}</p> : null}
        <button type="submit" disabled={isSavingProfile} style={{ border: "none", borderRadius: 10, padding: "14px 16px", background: "#2f1712", color: "#ffffff", fontSize: "1rem", fontWeight: 700, cursor: "pointer", opacity: isSavingProfile ? 0.7 : 1 }}>{isSavingProfile ? "Saving..." : "Save profile"}</button>
      </form>

      {user.role === "admin" ? (
        <>
          <details style={{ border: "1px solid #ead9d2", borderRadius: 14, background: "#ffffff", overflow: "hidden" }} open>
            <summary style={{ padding: 16, cursor: "pointer", fontWeight: 700 }}>Admin Tools</summary>
            <div style={{ display: "grid", gap: 16, padding: 16, borderTop: "1px solid #ead9d2" }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700 }}>Gallery management</p>
                <p style={{ margin: "6px 0 0", color: "#6a4b43", lineHeight: 1.5 }}>Create, edit, delete, upload, and drag-drop reorder gallery items from Kyra&apos;s profile.</p>
              </div>
              <form onSubmit={handleGallerySubmit} style={{ display: "grid", gap: 12 }}>
                <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Title" style={{ width: "100%", padding: 14, border: "1px solid #d9c4bd", borderRadius: 10, fontSize: "1rem" }} />
                <textarea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} placeholder="Description" rows={4} style={{ width: "100%", padding: 14, border: "1px solid #d9c4bd", borderRadius: 10, fontSize: "1rem", resize: "vertical" }} />
                <input value={draft.imageUrl} onChange={(event) => setDraft((current) => ({ ...current, imageUrl: event.target.value }))} placeholder="Signed or fallback image URL" style={{ width: "100%", padding: 14, border: "1px solid #d9c4bd", borderRadius: 10, fontSize: "1rem" }} />
                <input value={draft.s3Key} onChange={(event) => setDraft((current) => ({ ...current, s3Key: event.target.value }))} placeholder="S3 key" style={{ width: "100%", padding: 14, border: "1px solid #d9c4bd", borderRadius: 10, fontSize: "1rem" }} />
                <label style={{ display: "grid", gap: 8, color: "#6a4b43" }}>
                  <span>Upload image to S3</span>
                  <input type="file" accept="image/*" onChange={handleUpload} />
                </label>
                {uploadedPreviewUrl ? <img src={uploadedPreviewUrl} alt="Uploaded preview" style={{ display: "block", width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 10, background: "#f6e7e2" }} /> : null}
                {galleryError ? <p style={{ margin: 0, color: "#8f2d1d" }}>{galleryError}</p> : null}
                {galleryMessage ? <p style={{ margin: 0, color: "#2c6e49" }}>{galleryMessage}</p> : null}
                <div style={{ display: "flex", gap: 12 }}>
                  <button type="submit" disabled={isUploading} style={{ border: "none", borderRadius: 10, padding: "14px 16px", background: "#2f1712", color: "#ffffff", fontSize: "1rem", fontWeight: 700, cursor: "pointer", opacity: isUploading ? 0.7 : 1 }}>{isEditing ? "Update item" : "Create item"}</button>
                  {isEditing ? <button type="button" onClick={resetDraft} style={{ border: "1px solid #d9c4bd", borderRadius: 10, padding: "14px 16px", background: "#ffffff", color: "#2f1712", fontSize: "1rem", fontWeight: 700, cursor: "pointer" }}>Cancel edit</button> : null}
                </div>
              </form>

              {isLoadingItems ? <p style={{ margin: 0, color: "#6a4b43" }}>Loading admin gallery...</p> : null}
              {!isLoadingItems ? (
                <div style={{ display: "grid", gap: 12 }}>
                  {items.map((item) => (
                    <article key={item.id} draggable onDragStart={() => setDraggingId(item.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => handleDrop(item.id)} style={{ display: "grid", gap: 10, padding: 14, border: "1px solid #ead9d2", borderRadius: 12, background: "#fffaf8" }}>
                      <img src={item.imageUrl} alt={item.title} style={{ display: "block", width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 10, background: "#f6e7e2" }} />
                      <div style={{ display: "grid", gap: 6 }}>
                        <p style={{ margin: 0, fontWeight: 700 }}>{item.title}</p>
                        <p style={{ margin: 0, color: "#6a4b43", lineHeight: 1.5 }}>{item.description}</p>
                        <p style={{ margin: 0, color: "#9c6f63", fontSize: "0.85rem" }}>Drag to reorder</p>
                      </div>
                      <div style={{ display: "flex", gap: 12 }}>
                        <button type="button" onClick={() => { setEditingId(item.id); setDraft({ title: item.title, description: item.description, imageUrl: item.sourceImageUrl, s3Key: item.s3Key ?? "" }); setUploadedPreviewUrl(item.imageUrl); }} style={{ border: "1px solid #d9c4bd", borderRadius: 10, padding: "12px 14px", background: "#ffffff", color: "#2f1712", fontSize: "0.95rem", fontWeight: 700, cursor: "pointer" }}>Edit</button>
                        <button type="button" onClick={() => void handleDelete(item.id)} style={{ border: "1px solid #d9c4bd", borderRadius: 10, padding: "12px 14px", background: "#ffffff", color: "#8f2d1d", fontSize: "0.95rem", fontWeight: 700, cursor: "pointer" }}>Delete</button>
                      </div>
                    </article>
                  ))}
                  {items.length > 1 ? <button type="button" onClick={() => void saveOrder()} style={{ border: "none", borderRadius: 10, padding: "14px 16px", background: "#2f1712", color: "#ffffff", fontSize: "1rem", fontWeight: 700, cursor: "pointer" }}>Save gallery order</button> : null}
                </div>
              ) : null}

              <section style={{ display: "grid", gap: 12 }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 700 }}>Commission categories</p>
                  <p style={{ margin: "6px 0 0", color: "#6a4b43", lineHeight: 1.5 }}>Create, rename, and archive category options for new commission requests.</p>
                </div>
                <form onSubmit={handleCategorySubmit} style={{ display: "grid", gap: 12 }}>
                  <input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Category name" style={{ width: "100%", padding: 14, border: "1px solid #d9c4bd", borderRadius: 10, fontSize: "1rem" }} />
                  {categoryError ? <p style={{ margin: 0, color: "#8f2d1d" }}>{categoryError}</p> : null}
                  {categoryMessage ? <p style={{ margin: 0, color: "#2c6e49" }}>{categoryMessage}</p> : null}
                  <div style={{ display: "flex", gap: 12 }}>
                    <button type="submit" style={{ border: "none", borderRadius: 10, padding: "14px 16px", background: "#2f1712", color: "#ffffff", fontSize: "1rem", fontWeight: 700, cursor: "pointer" }}>{editingCategoryId !== null ? "Update category" : "Create category"}</button>
                    {editingCategoryId !== null ? <button type="button" onClick={() => { setEditingCategoryId(null); setCategoryName(""); }} style={{ border: "1px solid #d9c4bd", borderRadius: 10, padding: "14px 16px", background: "#ffffff", color: "#2f1712", fontSize: "1rem", fontWeight: 700, cursor: "pointer" }}>Cancel edit</button> : null}
                  </div>
                </form>
                <div style={{ display: "grid", gap: 12 }}>
                  {categories.map((category) => (
                    <div key={category.id} style={{ display: "grid", gap: 8, padding: 12, border: "1px solid #ead9d2", borderRadius: 12, background: category.isArchived ? "#faf3f0" : "#fffaf8" }}>
                      <p style={{ margin: 0, fontWeight: 700 }}>{category.name}</p>
                      <p style={{ margin: 0, color: "#6a4b43" }}>{category.isArchived ? "Archived" : "Active"}</p>
                      <div style={{ display: "flex", gap: 12 }}>
                        <button type="button" onClick={() => { setEditingCategoryId(category.id); setCategoryName(category.name); }} style={{ border: "1px solid #d9c4bd", borderRadius: 10, padding: "10px 12px", background: "#ffffff", color: "#2f1712", fontWeight: 700, cursor: "pointer" }}>Edit</button>
                        <button type="button" onClick={() => void toggleArchiveCategory(category)} style={{ border: "1px solid #d9c4bd", borderRadius: 10, padding: "10px 12px", background: "#ffffff", color: "#2f1712", fontWeight: 700, cursor: "pointer" }}>{category.isArchived ? "Restore" : "Archive"}</button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </details>

          <details style={{ border: "1px solid #ead9d2", borderRadius: 14, background: "#ffffff", overflow: "hidden" }} open>
            <summary style={{ padding: 16, cursor: "pointer", fontWeight: 700 }}>All Orders</summary>
            <div style={{ display: "grid", gap: 16, padding: 16, borderTop: "1px solid #ead9d2" }}>
              {ordersError ? <p style={{ margin: 0, color: "#8f2d1d" }}>{ordersError}</p> : null}
              {isLoadingOrders ? <p style={{ margin: 0, color: "#6a4b43" }}>Loading orders...</p> : null}
              {!isLoadingOrders ? (
                <div style={{ display: "grid", gap: 12 }}>
                  {orders.map((order) => (
                    <article key={order.orderNumber} style={{ display: "grid", gap: 8, padding: 14, border: "1px solid #ead9d2", borderRadius: 12, background: "#fffaf8" }}>
                      <p style={{ margin: 0, fontWeight: 700 }}>Order {order.orderNumber}</p>
                      <p style={{ margin: 0, color: "#6a4b43" }}>{order.customerName} · {order.categoryName}</p>
                      <p style={{ margin: 0, color: "#6a4b43" }}>Status: {order.status}</p>
                      <button type="button" onClick={() => onOpenOrder(order.orderNumber)} style={{ justifySelf: "start", border: "none", borderRadius: 10, padding: "12px 14px", background: "#2f1712", color: "#ffffff", fontWeight: 700, cursor: "pointer" }}>Open order</button>
                    </article>
                  ))}
                </div>
              ) : null}
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <button type="button" disabled={ordersPage === 1} onClick={() => setOrdersPage((current) => current - 1)} style={{ border: "1px solid #d9c4bd", borderRadius: 10, padding: "12px 14px", background: "#ffffff", color: "#2f1712", fontWeight: 700, cursor: "pointer", opacity: ordersPage === 1 ? 0.6 : 1 }}>Previous</button>
                <p style={{ margin: 0, color: "#6a4b43" }}>Page {ordersPage} of {totalPages}</p>
                <button type="button" disabled={ordersPage >= totalPages} onClick={() => setOrdersPage((current) => current + 1)} style={{ border: "1px solid #d9c4bd", borderRadius: 10, padding: "12px 14px", background: "#ffffff", color: "#2f1712", fontWeight: 700, cursor: "pointer", opacity: ordersPage >= totalPages ? 0.6 : 1 }}>Next</button>
              </div>
            </div>
          </details>
        </>
      ) : null}
    </section>
  );
}
