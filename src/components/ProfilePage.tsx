import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { Category, categoryApi, GalleryDraft, galleryApi, GalleryItem, orderApi, OrderSummary, User } from "../api";

type ProfilePageProps = {
  token: string;
  user: User;
  onGalleryChanged: () => void;
  onOpenOrder: (orderNumber: string) => void;
  onLogout: () => void;
};

const emptyDraft: GalleryDraft = { title: "", description: "", price: "" };
type SelectedGalleryImage = {
  file: File;
  previewUrl: string;
};

function getOrderKindLabel(orderKind: string) {
  return { gallery: "Gallery order", gallery_inquiry: "Gallery inquiry" }[orderKind] ?? "Commission";
}

function formatRelativeAge(value: string) {
  const createdAt = new Date(value);
  const createdAtTime = createdAt.getTime();
  if (Number.isNaN(createdAtTime)) {
    return "";
  }

  const diffMs = Date.now() - createdAtTime;
  if (diffMs < 60 * 1000) {
    return "just now";
  }

  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;

  if (diffMs < hourMs) {
    return `${Math.floor(diffMs / minuteMs)}m ago`;
  }
  if (diffMs < dayMs) {
    return `${Math.floor(diffMs / hourMs)}h ago`;
  }
  if (diffMs < 7 * dayMs) {
    return `${Math.floor(diffMs / dayMs)}d ago`;
  }
  return createdAt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function revokeObjectUrls(images: SelectedGalleryImage[]) {
  images.forEach((image) => {
    if (image.previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(image.previewUrl);
    }
  });
}

export default function ProfilePage({ token, user, onGalleryChanged, onOpenOrder, onLogout }: ProfilePageProps) {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [galleryError, setGalleryError] = useState("");
  const [galleryMessage, setGalleryMessage] = useState("");
  const [isLoadingItems, setIsLoadingItems] = useState(user.role === "admin");
  const [draft, setDraft] = useState<GalleryDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingImageIds, setEditingImageIds] = useState<number[]>([]);
  const [selectedImages, setSelectedImages] = useState<SelectedGalleryImage[]>([]);
  const [isSavingGallery, setIsSavingGallery] = useState(false);
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
    return () => {
      revokeObjectUrls(selectedImages);
    };
  }, [selectedImages]);

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
  const editingItem = editingId !== null ? items.find((item) => item.id === editingId) ?? null : null;
  const orderedEditingImages = editingItem
    ? editingImageIds.map((imageId) => editingItem.images.find((image) => image.id === imageId)).filter((image): image is NonNullable<typeof image> => Boolean(image))
    : [];

  const resetDraft = () => {
    revokeObjectUrls(selectedImages);
    setDraft(emptyDraft);
    setEditingId(null);
    setEditingImageIds([]);
    setSelectedImages([]);
  };

  const reloadCategories = async () => {
    setCategories(await categoryApi.listAdmin(token));
  };

  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFiles = Array.from(event.target.files ?? []);
    if (!nextFiles.length) {
      return;
    }
    if (nextFiles.length > 5) {
      setGalleryError("Choose up to 5 images per gallery item.");
      event.target.value = "";
      return;
    }
    revokeObjectUrls(selectedImages);
    const nextSelectedImages = nextFiles.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setGalleryError("");
    setGalleryMessage(`${nextFiles.length} image${nextFiles.length === 1 ? "" : "s"} ready to save.`);
    setSelectedImages(nextSelectedImages);
    event.target.value = "";
  };

  const refreshAdminItems = async (nextItems?: GalleryItem[]) => {
    setItems(nextItems ?? await galleryApi.listAdmin(token));
    setPendingDeleteId(null);
    onGalleryChanged();
  };

  const handleGallerySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setIsSavingGallery(true);
      setGalleryError("");
      setGalleryMessage("");
      if (!selectedImages.length && !isEditing) {
        throw new Error("Choose at least one image before saving this gallery item.");
      }
      const selectedFiles = selectedImages.map((image) => image.file);
      if (isEditing && editingId !== null) {
        await galleryApi.update(token, editingId, draft, selectedFiles, editingImageIds);
      } else {
        await galleryApi.create(token, draft, selectedFiles);
      }
      await refreshAdminItems();
      resetDraft();
      setGalleryMessage(isEditing ? "Gallery item updated." : "Gallery item created.");
    } catch (nextError) {
      setGalleryError(nextError instanceof Error ? nextError.message : "Unable to save gallery item.");
    } finally {
      setIsSavingGallery(false);
    }
  };

  const handleDelete = async (itemId: number) => {
    try {
      setDeletingId(itemId);
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
    } finally {
      setDeletingId(null);
    }
  };

  const saveOrder = async (orderedItems: GalleryItem[]) => {
    try {
      setGalleryError("");
      setGalleryMessage("");
      await galleryApi.reorder(token, orderedItems.map((item) => item.id));
      await refreshAdminItems(orderedItems.map((item, index) => ({ ...item, displayOrder: (index + 1) * 10 })));
      setGalleryMessage("Gallery order saved.");
    } catch (nextError) {
      setGalleryError(nextError instanceof Error ? nextError.message : "Unable to save order.");
    } finally {
    }
  };

  const handleDrop = async (targetId: number) => {
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
    await saveOrder(nextItems);
  };

  const handleCategorySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setCategoryError("");
      setCategoryMessage("");
      if (editingCategoryId !== null) {
        const category = categories.find((item) => item.id === editingCategoryId);
        if (!category) {
          throw new Error("Service not found.");
        }
        await categoryApi.update(token, editingCategoryId, categoryName, category.isArchived);
      } else {
        await categoryApi.create(token, categoryName);
      }
      setCategoryName("");
      setEditingCategoryId(null);
      await reloadCategories();
      setCategoryMessage(editingCategoryId !== null ? "Service updated." : "Service created.");
    } catch (nextError) {
      setCategoryError(nextError instanceof Error ? nextError.message : "Unable to save service.");
    }
  };

  const toggleArchiveCategory = async (category: Category) => {
    try {
      setCategoryError("");
      setCategoryMessage("");
      await categoryApi.update(token, category.id, category.name, !category.isArchived);
      await reloadCategories();
      setCategoryMessage(category.isArchived ? "Service restored." : "Service archived.");
    } catch (nextError) {
      setCategoryError(nextError instanceof Error ? nextError.message : "Unable to update service.");
    }
  };

  const totalPages = Math.max(1, Math.ceil(ordersTotal / 10));
  const moveEditingImage = (imageId: number, direction: -1 | 1) => {
    setEditingImageIds((current) => {
      const currentIndex = current.findIndex((id) => id === imageId);
      const nextIndex = currentIndex + direction;
      if (currentIndex === -1 || nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }
      const nextIds = [...current];
      const [movedId] = nextIds.splice(currentIndex, 1);
      nextIds.splice(nextIndex, 0, movedId);
      return nextIds;
    });
    setGalleryMessage("");
    setGalleryError("");
  };

  return (
    <section className="d-grid gap-4">
      <div>
        <h3 className="h2 mb-0">Profile</h3>
      </div>
      <div className="card p-3 d-grid gap-2">
        <p className="text-muted mb-0">Name: {user.name}</p>
        <p className="text-muted mb-0">Email: {user.email}</p>
        {/* <p style={{ margin: 0, color: "var(--muted)" }}>Role: {user.role}</p> */}
      </div>

      {user.role === "admin" ? (
        <>
          <section className="d-grid gap-3">
            <div>
              <h3 className="h4 mb-0">Admin Tools</h3>
            </div>

            <details open={isEditing} className="card overflow-hidden">
              <summary className="p-3 fw-bold">{isEditing ? "Edit Gallery Item" : "Create Gallery Item"}</summary>
              <div className="p-3 border-top">
                <form onSubmit={handleGallerySubmit} className="d-grid gap-3">
                  <input className="form-control" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Title" />
                  <textarea className="form-control" value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} placeholder="Description" rows={4} />
                  <input className="form-control" type="number" min="0" step="0.01" value={draft.price} onChange={(event) => { const value = event.target.value; if (/^\d*(\.\d{0,2})?$/.test(value)) { setDraft((current) => ({ ...current, price: value })); } }} placeholder="Optional price in dollars" inputMode="decimal" />
                  <label className="form-label text-muted mb-0">
                    <span className="d-block mb-2">{isEditing ? "Replace artwork images" : "Artwork images"} (up to 5)</span>
                    <input className="form-control" type="file" accept="image/*" multiple onChange={handleUpload} />
                  </label>
                  {selectedImages.length ? (
                    <div className="card p-3 d-grid gap-3">
                      <div>
                        <p className="fw-bold mb-1">Selected images</p>
                        <p className="text-muted small mb-0">Gallery cards use a 4:3 cover frame. The detail page shows the full image.</p>
                      </div>
                      <div className="row row-cols-2 row-cols-sm-4 row-cols-md-6 g-2">
                        {selectedImages.map((image, index) => (
                          <div key={image.previewUrl} className="col"><div className="border rounded overflow-hidden"><img className="gallery-cover" src={image.previewUrl} alt={`Selected preview ${index + 1}`} /></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : orderedEditingImages.length ? (
                    <div className="d-grid gap-2">
                      <p className="text-muted small mb-0">The first image is the cover image across the gallery and order pages.</p>
                      <div className="row row-cols-2 row-cols-sm-4 row-cols-md-6 g-2">
                        {orderedEditingImages.map((image, index) => (
                          <div key={image.id} className="col"><div className="card p-2 d-grid gap-2">
                            <img className="gallery-cover" src={image.imageUrl} alt={`Selected preview ${index + 1}`} />
                            <p className="small fw-bold mb-0">Image {index + 1}{index === 0 ? " (Cover)" : ""}</p>
                            <div className="d-flex gap-2">
                              <button className="btn btn-outline-secondary btn-sm flex-fill" type="button" onClick={() => moveEditingImage(image.id, -1)} disabled={index === 0 || isSavingGallery}>Up</button>
                              <button className="btn btn-outline-secondary btn-sm flex-fill" type="button" onClick={() => moveEditingImage(image.id, 1)} disabled={index === orderedEditingImages.length - 1 || isSavingGallery}>Down</button>
                            </div>
                          </div></div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {galleryError ? <p className="text-danger mb-0">{galleryError}</p> : null}
                  {galleryMessage ? <p className="text-success mb-0">{galleryMessage}</p> : null}
                  <div className="d-flex flex-wrap gap-2">
                    <button className="btn btn-primary" type="submit" disabled={isSavingGallery}>{isSavingGallery ? "Saving..." : isEditing ? "Update item" : "Create item"}</button>
                    {isEditing ? <button className="btn btn-outline-secondary" type="button" onClick={resetDraft}>Cancel edit</button> : null}
                  </div>
                </form>
              </div>
            </details>

            <details className="card overflow-hidden">
              <summary className="p-3 fw-bold">Existing Gallery</summary>
              <div className="p-3 border-top d-grid gap-3">
                {isLoadingItems ? <p className="text-muted">Loading admin gallery...</p> : null}
                {!isLoadingItems ? (
                  <div className="d-grid gap-3">
                    <div className="row row-cols-1 row-cols-md-3 row-cols-xl-5 g-3">
                      {items.map((item) => (
                        <article key={item.id} className="col"><div className="card h-100 p-3 d-grid gap-3" draggable onDragStart={() => setDraggingId(item.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => handleDrop(item.id)}>
                          <span style={{ position: "absolute", top: 12, right: 12, color: "var(--leaf-700)", fontSize: "1rem", fontWeight: 700, letterSpacing: 1, cursor: "grab" }} aria-hidden="true">⋮⋮</span>
                          <div style={{ display: "grid", gap: 6, paddingRight: 24 }}>
                            <p style={{ margin: 0, fontWeight: 700 }}>{item.title}</p>
                            {item.isSold ? <p style={{ margin: 0, color: "var(--danger)", fontSize: "0.8rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>Sold</p> : null}
                          </div>
                          <div className="d-flex flex-wrap gap-2 align-self-end align-items-center">
                            <button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => { revokeObjectUrls(selectedImages); setEditingId(item.id); setEditingImageIds(item.images.map((image) => image.id)); setDraft({ title: item.title, description: item.description, price: item.priceCents !== null ? (item.priceCents / 100).toFixed(2) : "" }); setSelectedImages([]); }}>Edit</button>
                            {pendingDeleteId === item.id ? (
                              <>
                                <button className="btn btn-danger btn-sm" type="button" onClick={() => void handleDelete(item.id)} disabled={deletingId === item.id}>{deletingId === item.id ? "Deleting..." : "Confirm delete"}</button>
                                <button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => setPendingDeleteId(null)} disabled={deletingId === item.id}>Cancel</button>
                              </>
                            ) : (
                              <button className="btn btn-outline-danger btn-sm" type="button" onClick={() => setPendingDeleteId(item.id)}>Delete</button>
                            )}
                          </div>
                        </div></article>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </details>

            <details className="card overflow-hidden">
              <summary className="p-3 fw-bold">Existing Services</summary>
              <div className="p-3 border-top d-grid gap-3">
                <form onSubmit={handleCategorySubmit} className="d-grid gap-3">
                  <input className="form-control" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Create a service" />
                  {categoryError ? <p className="text-danger mb-0">{categoryError}</p> : null}
                  {categoryMessage ? <p className="text-success mb-0">{categoryMessage}</p> : null}
                  <div className="d-flex flex-wrap gap-2">
                    <button className="btn btn-primary" type="submit">{editingCategoryId !== null ? "Update service" : "Create service"}</button>
                    {editingCategoryId !== null ? <button className="btn btn-outline-secondary" type="button" onClick={() => { setEditingCategoryId(null); setCategoryName(""); }}>Cancel edit</button> : null}
                  </div>
                </form>
                <div className="row row-cols-1 row-cols-md-2 g-3">
                  {categories.map((category) => (
                    <div key={category.id} className="col"><div className="card p-3 d-grid gap-2">
                      <p className="fw-bold mb-0">{category.name}</p>
                      <p className="text-muted mb-0">{category.isArchived ? "Archived" : "Active"}</p>
                      <div className="d-flex flex-wrap gap-2">
                        <button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => { setEditingCategoryId(category.id); setCategoryName(category.name); }}>Edit</button>
                        <button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => void toggleArchiveCategory(category)}>{category.isArchived ? "Restore" : "Archive"}</button>
                      </div>
                    </div></div>
                  ))}
                </div>
              </div>
            </details>
          </section>

          <details className="card overflow-hidden">
            <summary className="p-3 fw-bold">All Orders</summary>
            <div className="p-3 border-top d-grid gap-3">
              {ordersError ? <p className="text-danger">{ordersError}</p> : null}
              {isLoadingOrders ? <p className="text-muted">Loading orders...</p> : null}
              {!isLoadingOrders ? (
                <div className="row row-cols-1 row-cols-lg-2 g-3">
                  {orders.map((order) => (
                    <article key={order.orderNumber} className="col"><div className="card h-100 p-3 d-grid gap-2">
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
                        <p style={{ margin: 0, fontWeight: 700 }}>Order {order.orderNumber}</p>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 28, padding: "0 10px", border: "1px solid rgba(31, 51, 40, 0.16)", borderRadius: 999, background: "rgba(255, 253, 248, 0.92)", color: "var(--text-dark)", fontSize: "0.78rem", fontWeight: 700, whiteSpace: "nowrap" }}>
                            {getOrderKindLabel(order.orderKind)}
                          </span>
                          <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.82rem", whiteSpace: "nowrap" }}>{formatRelativeAge(order.createdAt)}</p>
                          {order.customerConfirmedAt ? (
                            <span title="Customer confirmed receipt" aria-label="Customer confirmed receipt" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 28, height: 28, borderRadius: 999, background: "rgba(47, 133, 90, 0.16)", color: "var(--success)", fontWeight: 900 }}>
                              ✓
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <p style={{ margin: 0, color: "var(--muted)" }}>{order.customerName} · {order.categoryName}</p>
                      <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.85rem" }}>{order.customerEmail}</p>
                      <p style={{ margin: 0, color: "var(--muted)" }}>Status: {order.status}</p>
                      {order.amountCents !== null ? <p style={{ margin: 0, color: "var(--muted)" }}>Amount: {(order.amountCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })}</p> : null}
                      {order.canOpen ? <button className="btn btn-primary btn-sm" type="button" onClick={() => onOpenOrder(order.orderNumber)}>Open order</button> : null}
                    </div></article>
                  ))}
                </div>
              ) : null}
              <div className="d-flex flex-wrap gap-2 align-items-center">
                <button className="btn btn-outline-secondary btn-sm" type="button" disabled={ordersPage === 1} onClick={() => setOrdersPage((current) => current - 1)}>Previous</button>
                <p className="text-muted mb-0">Page {ordersPage} of {totalPages}</p>
                <button className="btn btn-outline-secondary btn-sm" type="button" disabled={ordersPage >= totalPages} onClick={() => setOrdersPage((current) => current + 1)}>Next</button>
              </div>
            </div>
          </details>
        </>
      ) : null}

      <button className="btn btn-outline-secondary" type="button" onClick={onLogout}>Logout</button>
    </section>
  );
}
