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


function getGalleryColumns() {
  if (typeof window === "undefined") {
    return 2;
  }
  if (window.innerWidth >= 1024) {
    return 5;
  }
  if (window.innerWidth >= 768) {
    return 3;
  }
  return 2;
}


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
  const [galleryColumns, setGalleryColumns] = useState(getGalleryColumns);

  useEffect(() => {
    setName(user.name);
  }, [user.name]);

  useEffect(() => {
    const handleResize = () => setGalleryColumns(getGalleryColumns());
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (user.role !== "admin") {
      return;
    }

    async function loadAdminState() {
      try {
        setIsLoadingItems(true);
        setGalleryError("");
        setCategoryError("");
        const [nextItems, nextCategories] = await Promise.all([galleryApi.listAdmin(token), categoryApi.listAdmin(token)]);
        setItems(nextItems);
        setCategories(nextCategories);
      } catch (nextError) {
        const message = nextError instanceof Error ? nextError.message : "Unable to load admin tools.";
        setGalleryError(message);
        setCategoryError(message);
      } finally {
        setIsLoadingItems(false);
      }
    }

    void loadAdminState();
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
      setDraft((current) => ({ ...current, imageUrl: uploaded.previewUrl, s3Key: uploaded.s3Key }));
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
      if (!draft.imageUrl && !draft.s3Key) {
        throw new Error("Upload an image before saving this gallery item.");
      }
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
  const editGalleryGridColumns = `repeat(${galleryColumns}, minmax(0, 1fr))`;

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gap: 8, maxWidth: 680 }}>
        <p style={{ margin: 0, color: "var(--leaf-700)", fontSize: "0.82rem", fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase" }}>Profile</p>
        <h2 style={{ margin: 0, color: "var(--leaf-800)", fontFamily: "var(--serif)", fontSize: "clamp(1.6rem, 4vw, 2.2rem)", fontWeight: 500 }}>{user.name}</h2>
      </div>
      <form onSubmit={handleProfileSubmit} style={{ display: "grid", gap: 12, padding: 16, border: "1px solid var(--line)", borderRadius: 8, background: "rgba(255, 253, 248, 0.86)", boxShadow: "0 10px 30px rgba(31, 51, 40, 0.08)" }}>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" style={{ width: "100%", padding: 14, border: "1px solid rgba(63, 95, 72, 0.28)", borderRadius: 8, background: "rgba(255, 253, 248, 0.94)", color: "var(--ink)", fontSize: "1rem" }} />
        <input value={user.email} readOnly style={{ width: "100%", padding: 14, border: "1px solid rgba(63, 95, 72, 0.28)", borderRadius: 8, background: "var(--linen)", color: "var(--muted)", fontSize: "1rem" }} />
        <p style={{ margin: 0, color: "var(--muted)" }}>Role: {user.role}</p>
        {profileError ? <p style={{ margin: 0, color: "var(--danger)" }}>{profileError}</p> : null}
        {profileMessage ? <p style={{ margin: 0, color: "var(--success)" }}>{profileMessage}</p> : null}
        <button type="submit" disabled={isSavingProfile} style={{ border: "1px solid var(--leaf-800)", borderRadius: 8, padding: "14px 16px", background: "var(--leaf-800)", color: "var(--paper)", fontWeight: 800, boxShadow: "0 12px 28px rgba(31, 51, 40, 0.18)" }}>{isSavingProfile ? "Saving..." : "Save profile"}</button>
      </form>

      {user.role === "admin" ? (
        <>
          <section style={{ display: "grid", gap: 12 }}>
            <div>
              <p style={{ margin: 0, color: "var(--leaf-700)", fontSize: "0.82rem", fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase" }}>Admin Tools</p>
              <h3 style={{ margin: 0, color: "var(--leaf-800)", fontFamily: "var(--serif)", fontSize: "clamp(1.35rem, 3vw, 1.8rem)", fontWeight: 500 }}>Manage gallery, categories, and orders.</h3>
            </div>

            <details open={isEditing} style={{ overflow: "hidden", border: "1px solid var(--line)", borderRadius: 8, background: "rgba(255, 253, 248, 0.86)", boxShadow: "0 10px 30px rgba(31, 51, 40, 0.08)" }}>
              <summary style={{ padding: 16, cursor: "pointer", color: "var(--leaf-800)", fontFamily: "var(--serif)", fontWeight: 700 }}>{isEditing ? "Edit Gallery Item" : "Create Gallery Item"}</summary>
              <div style={{ display: "grid", gap: 12, padding: 16, borderTop: "1px solid var(--line)" }}>
                <form onSubmit={handleGallerySubmit} style={{ display: "grid", gap: 12 }}>
                  <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Title" style={{ width: "100%", padding: 14, border: "1px solid rgba(63, 95, 72, 0.28)", borderRadius: 8, background: "rgba(255, 253, 248, 0.94)", color: "var(--ink)", fontSize: "1rem" }} />
                  <textarea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} placeholder="Description" rows={4} style={{ width: "100%", padding: 14, border: "1px solid rgba(63, 95, 72, 0.28)", borderRadius: 8, background: "rgba(255, 253, 248, 0.94)", color: "var(--ink)", fontSize: "1rem", resize: "vertical" }} />
                  <input value={draft.imageUrl} onChange={(event) => setDraft((current) => ({ ...current, imageUrl: event.target.value }))} placeholder="Signed or fallback image URL" style={{ width: "100%", padding: 14, border: "1px solid rgba(63, 95, 72, 0.28)", borderRadius: 8, background: "rgba(255, 253, 248, 0.94)", color: "var(--ink)", fontSize: "1rem" }} />
                  <input value={draft.s3Key} onChange={(event) => setDraft((current) => ({ ...current, s3Key: event.target.value }))} placeholder="S3 key" style={{ width: "100%", padding: 14, border: "1px solid rgba(63, 95, 72, 0.28)", borderRadius: 8, background: "rgba(255, 253, 248, 0.94)", color: "var(--ink)", fontSize: "1rem" }} />
                  <label style={{ display: "grid", gap: 8, color: "var(--muted)" }}>
                    <span>Artwork image</span>
                    <input type="file" accept="image/*" onChange={handleUpload} />
                  </label>
                  {uploadedPreviewUrl ? <img src={uploadedPreviewUrl} alt="Uploaded preview" style={{ display: "block", width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 8, background: "var(--linen)" }} /> : null}
                  {galleryError ? <p style={{ margin: 0, color: "var(--danger)" }}>{galleryError}</p> : null}
                  {galleryMessage ? <p style={{ margin: 0, color: "var(--success)" }}>{galleryMessage}</p> : null}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                    <button type="submit" disabled={isUploading} style={{ border: "1px solid var(--leaf-800)", borderRadius: 8, padding: "14px 16px", background: "var(--leaf-800)", color: "var(--paper)", fontWeight: 800, boxShadow: "0 12px 28px rgba(31, 51, 40, 0.18)", opacity: isUploading ? 0.7 : 1 }}>{isEditing ? "Update item" : "Create item"}</button>
                    {isEditing ? <button type="button" onClick={resetDraft} style={{ border: "1px solid rgba(63, 95, 72, 0.34)", borderRadius: 8, padding: "14px 16px", background: "rgba(255, 253, 248, 0.82)", color: "var(--leaf-900)", fontWeight: 800 }}>Cancel edit</button> : null}
                  </div>
                </form>
              </div>
            </details>

            <details open style={{ overflow: "hidden", border: "1px solid var(--line)", borderRadius: 8, background: "rgba(255, 253, 248, 0.86)", boxShadow: "0 10px 30px rgba(31, 51, 40, 0.08)" }}>
              <summary style={{ padding: 16, cursor: "pointer", color: "var(--leaf-800)", fontFamily: "var(--serif)", fontWeight: 700 }}>Edit Gallery</summary>
              <div style={{ display: "grid", gap: 16, padding: 16, borderTop: "1px solid var(--line)" }}>
                {isLoadingItems ? <p style={{ margin: 0, color: "var(--muted)" }}>Loading admin gallery...</p> : null}
                {!isLoadingItems ? (
                  <div style={{ display: "grid", gap: 12 }}>
                    <div style={{ display: "grid", gap: 12, gridTemplateColumns: editGalleryGridColumns }}>
                      {items.map((item) => (
                        <article key={item.id} draggable onDragStart={() => setDraggingId(item.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => handleDrop(item.id)} style={{ position: "relative", display: "grid", gap: 10, minHeight: 148, padding: 14, border: "1px solid var(--line)", borderRadius: 8, background: "rgba(255, 253, 248, 0.86)", boxShadow: "0 10px 30px rgba(31, 51, 40, 0.08)" }}>
                          <span style={{ position: "absolute", top: 12, right: 12, color: "var(--leaf-700)", fontSize: "1rem", fontWeight: 700, letterSpacing: 1, cursor: "grab" }} aria-hidden="true">⋮⋮</span>
                          <div style={{ display: "grid", gap: 6, paddingRight: 24 }}>
                            <p style={{ margin: 0, fontWeight: 700 }}>{item.title}</p>
                            <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.85rem" }}>Drag to reorder</p>
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignSelf: "end", alignItems: "center" }}>
                            <button type="button" onClick={() => { setEditingId(item.id); setDraft({ title: item.title, description: item.description, imageUrl: item.sourceImageUrl, s3Key: item.s3Key ?? "" }); setUploadedPreviewUrl(item.imageUrl); }} style={{ border: "1px solid rgba(63, 95, 72, 0.34)", borderRadius: 8, padding: "10px 12px", background: "rgba(255, 253, 248, 0.82)", color: "var(--leaf-900)", fontWeight: 800 }}>Edit</button>
                            <button type="button" onClick={() => void handleDelete(item.id)} style={{ border: "1px solid rgba(63, 95, 72, 0.34)", borderRadius: 8, padding: "10px 12px", background: "rgba(255, 253, 248, 0.82)", color: "var(--danger)", fontWeight: 800 }}>Delete</button>
                          </div>
                        </article>
                      ))}
                    </div>
                    {items.length > 1 ? <button type="button" onClick={() => void saveOrder()} style={{ justifySelf: "start", border: "1px solid var(--leaf-800)", borderRadius: 8, padding: "14px 16px", background: "var(--leaf-800)", color: "var(--paper)", fontWeight: 800, boxShadow: "0 12px 28px rgba(31, 51, 40, 0.18)" }}>Save gallery order</button> : null}
                  </div>
                ) : null}
              </div>
            </details>

            <details open style={{ overflow: "hidden", border: "1px solid var(--line)", borderRadius: 8, background: "rgba(255, 253, 248, 0.86)", boxShadow: "0 10px 30px rgba(31, 51, 40, 0.08)" }}>
              <summary style={{ padding: 16, cursor: "pointer", color: "var(--leaf-800)", fontFamily: "var(--serif)", fontWeight: 700 }}>Categories</summary>
              <div style={{ display: "grid", gap: 12, padding: 16, borderTop: "1px solid var(--line)" }}>
                <form onSubmit={handleCategorySubmit} style={{ display: "grid", gap: 12 }}>
                  <input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Category name" style={{ width: "100%", padding: 14, border: "1px solid rgba(63, 95, 72, 0.28)", borderRadius: 8, background: "rgba(255, 253, 248, 0.94)", color: "var(--ink)", fontSize: "1rem" }} />
                  {categoryError ? <p style={{ margin: 0, color: "var(--danger)" }}>{categoryError}</p> : null}
                  {categoryMessage ? <p style={{ margin: 0, color: "var(--success)" }}>{categoryMessage}</p> : null}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                    <button type="submit" style={{ border: "1px solid var(--leaf-800)", borderRadius: 8, padding: "14px 16px", background: "var(--leaf-800)", color: "var(--paper)", fontWeight: 800, boxShadow: "0 12px 28px rgba(31, 51, 40, 0.18)" }}>{editingCategoryId !== null ? "Update category" : "Create category"}</button>
                    {editingCategoryId !== null ? <button type="button" onClick={() => { setEditingCategoryId(null); setCategoryName(""); }} style={{ border: "1px solid rgba(63, 95, 72, 0.34)", borderRadius: 8, padding: "14px 16px", background: "rgba(255, 253, 248, 0.82)", color: "var(--leaf-900)", fontWeight: 800 }}>Cancel edit</button> : null}
                  </div>
                </form>
                <div style={{ display: "grid", gap: 12 }}>
                  {categories.map((category) => (
                    <div key={category.id} style={{ display: "grid", gap: 8, padding: 16, border: "1px solid var(--line)", borderRadius: 8, background: "rgba(255, 253, 248, 0.86)", boxShadow: "0 10px 30px rgba(31, 51, 40, 0.08)" }}>
                      <p style={{ margin: 0, fontWeight: 700 }}>{category.name}</p>
                      <p style={{ margin: 0, color: "var(--muted)" }}>{category.isArchived ? "Archived" : "Active"}</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                        <button type="button" onClick={() => { setEditingCategoryId(category.id); setCategoryName(category.name); }} style={{ border: "1px solid rgba(63, 95, 72, 0.34)", borderRadius: 8, padding: "10px 12px", background: "rgba(255, 253, 248, 0.82)", color: "var(--leaf-900)", fontWeight: 800 }}>Edit</button>
                        <button type="button" onClick={() => void toggleArchiveCategory(category)} style={{ border: "1px solid rgba(63, 95, 72, 0.34)", borderRadius: 8, padding: "10px 12px", background: "rgba(255, 253, 248, 0.82)", color: "var(--leaf-900)", fontWeight: 800 }}>{category.isArchived ? "Restore" : "Archive"}</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </details>
          </section>

          <details open style={{ overflow: "hidden", border: "1px solid var(--line)", borderRadius: 8, background: "rgba(255, 253, 248, 0.86)", boxShadow: "0 10px 30px rgba(31, 51, 40, 0.08)" }}>
            <summary style={{ padding: 16, cursor: "pointer", color: "var(--leaf-800)", fontFamily: "var(--serif)", fontWeight: 700 }}>All Orders</summary>
            <div style={{ display: "grid", gap: 16, padding: 16, borderTop: "1px solid var(--line)" }}>
              {ordersError ? <p style={{ margin: 0, color: "var(--danger)" }}>{ordersError}</p> : null}
              {isLoadingOrders ? <p style={{ margin: 0, color: "var(--muted)" }}>Loading orders...</p> : null}
              {!isLoadingOrders ? (
                <div style={{ display: "grid", gap: 12 }}>
                  {orders.map((order) => (
                    <article key={order.orderNumber} style={{ display: "grid", gap: 8, padding: 16, border: "1px solid var(--line)", borderRadius: 8, background: "rgba(255, 253, 248, 0.86)", boxShadow: "0 10px 30px rgba(31, 51, 40, 0.08)" }}>
                      <p style={{ margin: 0, fontWeight: 700 }}>Order {order.orderNumber}</p>
                      <p style={{ margin: 0, color: "var(--muted)" }}>{order.customerName} · {order.categoryName}</p>
                      <p style={{ margin: 0, color: "var(--muted)" }}>Status: {order.status}</p>
                      <button type="button" onClick={() => onOpenOrder(order.orderNumber)} style={{ justifySelf: "start", border: "1px solid var(--leaf-800)", borderRadius: 8, padding: "10px 12px", background: "var(--leaf-800)", color: "var(--paper)", fontWeight: 800 }}>Open order</button>
                    </article>
                  ))}
                </div>
              ) : null}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                <button type="button" disabled={ordersPage === 1} onClick={() => setOrdersPage((current) => current - 1)} style={{ border: "1px solid rgba(63, 95, 72, 0.34)", borderRadius: 8, padding: "10px 12px", background: "rgba(255, 253, 248, 0.82)", color: "var(--leaf-900)", fontWeight: 800 }}>Previous</button>
                <p style={{ margin: 0, color: "var(--muted)" }}>Page {ordersPage} of {totalPages}</p>
                <button type="button" disabled={ordersPage >= totalPages} onClick={() => setOrdersPage((current) => current + 1)} style={{ border: "1px solid rgba(63, 95, 72, 0.34)", borderRadius: 8, padding: "10px 12px", background: "rgba(255, 253, 248, 0.82)", color: "var(--leaf-900)", fontWeight: 800 }}>Next</button>
              </div>
            </div>
          </details>
        </>
      ) : null}
    </section>
  );
}
