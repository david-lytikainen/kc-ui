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
const galleryCropAspectRatio = 4 / 3;
const galleryCropExportWidth = 1600;
const galleryCropExportHeight = 1200;

type SelectedGalleryImage = {
  file: File;
  previewUrl: string;
  cropX: number;
  cropY: number;
  zoom: number;
};

function getOrderKindLabel(orderKind: string) {
  if (orderKind === "gallery_inquiry") {
    return "Gallery inquiry";
  }
  if (orderKind === "gallery") {
    return "Gallery order";
  }
  return "Commission";
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

function revokeObjectUrls(images: SelectedGalleryImage[]) {
  images.forEach((image) => {
    if (image.previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(image.previewUrl);
    }
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load image for cropping."));
    image.src = src;
  });
}

async function cropGalleryImage(image: SelectedGalleryImage) {
  const sourceImage = await loadImage(image.previewUrl);
  const canvas = document.createElement("canvas");
  canvas.width = galleryCropExportWidth;
  canvas.height = galleryCropExportHeight;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to prepare gallery image crop.");
  }

  const sourceAspectRatio = sourceImage.naturalWidth / sourceImage.naturalHeight;
  const coverWidth = sourceAspectRatio > galleryCropAspectRatio
    ? sourceImage.naturalHeight * galleryCropAspectRatio
    : sourceImage.naturalWidth;
  const coverHeight = sourceAspectRatio > galleryCropAspectRatio
    ? sourceImage.naturalHeight
    : sourceImage.naturalWidth / galleryCropAspectRatio;
  const cropWidth = coverWidth / image.zoom;
  const cropHeight = coverHeight / image.zoom;
  const maxX = Math.max(0, sourceImage.naturalWidth - cropWidth);
  const maxY = Math.max(0, sourceImage.naturalHeight - cropHeight);
  const sourceX = (image.cropX / 100) * maxX;
  const sourceY = (image.cropY / 100) * maxY;

  context.drawImage(
    sourceImage,
    sourceX,
    sourceY,
    cropWidth,
    cropHeight,
    0,
    0,
    galleryCropExportWidth,
    galleryCropExportHeight,
  );

  const fileType = image.file.type.startsWith("image/") ? image.file.type : "image/jpeg";
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, fileType, 0.92));
  if (!blob) {
    throw new Error("Unable to export cropped gallery image.");
  }

  return new File([blob], image.file.name, { type: fileType, lastModified: image.file.lastModified });
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
  const [activeCropIndex, setActiveCropIndex] = useState(0);
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
  const [galleryColumns, setGalleryColumns] = useState(getGalleryColumns);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  useEffect(() => {
    const handleResize = () => setGalleryColumns(getGalleryColumns());
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
  const activeSelectedImage = selectedImages[activeCropIndex] ?? null;
  const orderedEditingImages = editingItem
    ? editingImageIds.map((imageId) => editingItem.images.find((image) => image.id === imageId)).filter((image): image is NonNullable<typeof image> => Boolean(image))
    : [];

  const resetDraft = () => {
    revokeObjectUrls(selectedImages);
    setDraft(emptyDraft);
    setEditingId(null);
    setEditingImageIds([]);
    setSelectedImages([]);
    setActiveCropIndex(0);
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
      cropX: 50,
      cropY: 50,
      zoom: 1,
    }));
    setGalleryError("");
    setGalleryMessage(`${nextFiles.length} image${nextFiles.length === 1 ? "" : "s"} ready to crop and save.`);
    setSelectedImages(nextSelectedImages);
    setActiveCropIndex(0);
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
      const croppedFiles = selectedImages.length ? await Promise.all(selectedImages.map((image) => cropGalleryImage(image))) : [];
      if (isEditing && editingId !== null) {
        await galleryApi.update(token, editingId, draft, croppedFiles, editingImageIds);
      } else {
        await galleryApi.create(token, draft, croppedFiles);
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
      setIsSavingOrder(true);
      setGalleryError("");
      setGalleryMessage("");
      await galleryApi.reorder(token, orderedItems.map((item) => item.id));
      await refreshAdminItems(orderedItems.map((item, index) => ({ ...item, displayOrder: (index + 1) * 10 })));
      setGalleryMessage("Gallery order saved.");
    } catch (nextError) {
      setGalleryError(nextError instanceof Error ? nextError.message : "Unable to save order.");
    } finally {
      setIsSavingOrder(false);
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
  const editGalleryGridColumns = `repeat(${galleryColumns}, minmax(0, 1fr))`;

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
    <section style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gap: 8, maxWidth: 680 }}>
        <h3 style={{ margin: 0, color: "var(--text-dark)", fontFamily: "var(--serif)", fontSize: "clamp(1.6rem, 4vw, 2.2rem)", fontWeight: 500 }}>Profile</h3>
      </div>
      <div style={{ display: "grid", gap: 12, padding: 16, border: "1px solid var(--line)", borderRadius: 8, background: "var(--bg-panel)", boxShadow: "0 10px 30px rgba(31, 51, 40, 0.08)" }}>
        <p style={{ margin: 0, color: "var(--muted)" }}>Name: {user.name}</p>
        <p style={{ margin: 0, color: "var(--muted)" }}>Email: {user.email}</p>
        <p style={{ margin: 0, color: "var(--muted)" }}>Role: {user.role}</p>
      </div>

      {user.role === "admin" ? (
        <>
          <section style={{ display: "grid", gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, color: "var(--text-dark)", fontFamily: "var(--serif)", fontSize: "clamp(1.35rem, 3vw, 1.8rem)", fontWeight: 500 }}>Admin Tools</h3>
            </div>

            <details open={isEditing} style={{ overflow: "hidden", border: "1px solid var(--line)", borderRadius: 8, background: "var(--bg-panel)", boxShadow: "0 10px 30px rgba(31, 51, 40, 0.08)" }}>
              <summary style={{ padding: 16, cursor: "pointer", color: "var(--text-dark)", fontFamily: "var(--serif)", fontWeight: 700 }}>{isEditing ? "Edit Gallery Item" : "Create Gallery Item"}</summary>
              <div style={{ display: "grid", gap: 12, padding: 16, borderTop: "1px solid var(--line)" }}>
                <form onSubmit={handleGallerySubmit} style={{ display: "grid", gap: 12 }}>
                  <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Title" style={{ width: "100%", padding: 14, border: "1px solid rgba(63, 95, 72, 0.28)", borderRadius: 8, background: "rgba(255, 253, 248, 0.94)", color: "var(--text-dark)", fontSize: "1rem" }} />
                  <textarea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} placeholder="Description" rows={4} style={{ width: "100%", padding: 14, border: "1px solid rgba(63, 95, 72, 0.28)", borderRadius: 8, background: "rgba(255, 253, 248, 0.94)", color: "var(--text-dark)", fontSize: "1rem", resize: "vertical" }} />
                  <input value={draft.price} onChange={(event) => setDraft((current) => ({ ...current, price: event.target.value }))} placeholder="Optional price in dollars" inputMode="decimal" style={{ width: "100%", padding: 14, border: "1px solid rgba(63, 95, 72, 0.28)", borderRadius: 8, background: "rgba(255, 253, 248, 0.94)", color: "var(--text-dark)", fontSize: "1rem" }} />
                  <label style={{ display: "grid", gap: 8, color: "var(--muted)" }}>
                    <span>{isEditing ? "Replace artwork images" : "Artwork images"} (up to 5)</span>
                    <input type="file" accept="image/*" multiple onChange={handleUpload} />
                  </label>
                  {selectedImages.length ? (
                    <div style={{ display: "grid", gap: 12, padding: 14, border: "1px solid var(--line)", borderRadius: 8, background: "rgba(255, 253, 248, 0.82)" }}>
                      <div style={{ display: "grid", gap: 8 }}>
                        <p style={{ margin: 0, color: "var(--text-dark)", fontWeight: 700 }}>Crop before save</p>
                        <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.9rem" }}>The saved image uses a fixed 4:3 crop so gallery cards and detail views stay consistent.</p>
                      </div>
                      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(72px, 96px))" }}>
                        {selectedImages.map((image, index) => (
                          <button key={image.previewUrl} type="button" onClick={() => setActiveCropIndex(index)} style={{ overflow: "hidden", border: index === activeCropIndex ? "2px solid var(--leaf-800)" : "1px solid var(--line)", borderRadius: 8, padding: 0, background: "var(--paper)" }}>
                            <img src={image.previewUrl} alt={`Selected preview ${index + 1}`} style={{ display: "block", width: "100%", aspectRatio: "1 / 1", objectFit: "cover", background: "var(--linen)" }} />
                          </button>
                        ))}
                      </div>
                      {activeSelectedImage ? (
                        <div style={{ display: "grid", gap: 12 }}>
                          <div style={{ overflow: "hidden", border: "1px solid var(--line)", borderRadius: 8, background: "var(--linen)", aspectRatio: "4 / 3" }}>
                            <img
                              src={activeSelectedImage.previewUrl}
                              alt="Crop preview"
                              style={{
                                display: "block",
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                transform: `scale(${activeSelectedImage.zoom})`,
                                transformOrigin: `${activeSelectedImage.cropX}% ${activeSelectedImage.cropY}%`,
                              }}
                            />
                          </div>
                          <label style={{ display: "grid", gap: 6, color: "var(--muted)" }}>
                            <span>Zoom</span>
                            <input
                              type="range"
                              min="1"
                              max="3"
                              step="0.05"
                              value={activeSelectedImage.zoom}
                              onChange={(event) => {
                                const nextZoom = Number(event.target.value);
                                setSelectedImages((current) => current.map((image, index) => index === activeCropIndex ? { ...image, zoom: nextZoom } : image));
                              }}
                            />
                          </label>
                          <label style={{ display: "grid", gap: 6, color: "var(--muted)" }}>
                            <span>Horizontal crop</span>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              step="1"
                              value={activeSelectedImage.cropX}
                              onChange={(event) => {
                                const nextCropX = Number(event.target.value);
                                setSelectedImages((current) => current.map((image, index) => index === activeCropIndex ? { ...image, cropX: nextCropX } : image));
                              }}
                            />
                          </label>
                          <label style={{ display: "grid", gap: 6, color: "var(--muted)" }}>
                            <span>Vertical crop</span>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              step="1"
                              value={activeSelectedImage.cropY}
                              onChange={(event) => {
                                const nextCropY = Number(event.target.value);
                                setSelectedImages((current) => current.map((image, index) => index === activeCropIndex ? { ...image, cropY: nextCropY } : image));
                              }}
                            />
                          </label>
                        </div>
                      ) : null}
                    </div>
                  ) : orderedEditingImages.length ? (
                    <div style={{ display: "grid", gap: 10 }}>
                      <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.9rem" }}>The first image is the cover image across the gallery and order pages.</p>
                      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(132px, 1fr))" }}>
                        {orderedEditingImages.map((image, index) => (
                          <div key={image.id} style={{ display: "grid", gap: 8, padding: 10, border: "1px solid var(--line)", borderRadius: 8, background: "rgba(255, 253, 248, 0.82)" }}>
                            <img src={image.imageUrl} alt={`Selected preview ${index + 1}`} style={{ display: "block", width: "100%", aspectRatio: "1 / 1", objectFit: "cover", borderRadius: 8, background: "var(--linen)" }} />
                            <p style={{ margin: 0, color: "var(--text-dark)", fontSize: "0.85rem", fontWeight: 700 }}>Image {index + 1}{index === 0 ? " (Cover)" : ""}</p>
                            <div style={{ display: "flex", gap: 8 }}>
                              <button type="button" onClick={() => moveEditingImage(image.id, -1)} disabled={index === 0 || isSavingGallery} style={{ flex: 1, border: "1px solid rgba(63, 95, 72, 0.34)", borderRadius: 8, padding: "8px 10px", background: "rgba(255, 253, 248, 0.82)", color: "var(--text-dark)", fontWeight: 800, opacity: index === 0 || isSavingGallery ? 0.5 : 1 }}>Up</button>
                              <button type="button" onClick={() => moveEditingImage(image.id, 1)} disabled={index === orderedEditingImages.length - 1 || isSavingGallery} style={{ flex: 1, border: "1px solid rgba(63, 95, 72, 0.34)", borderRadius: 8, padding: "8px 10px", background: "rgba(255, 253, 248, 0.82)", color: "var(--text-dark)", fontWeight: 800, opacity: index === orderedEditingImages.length - 1 || isSavingGallery ? 0.5 : 1 }}>Down</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {galleryError ? <p style={{ margin: 0, color: "var(--danger)" }}>{galleryError}</p> : null}
                  {galleryMessage ? <p style={{ margin: 0, color: "var(--success)" }}>{galleryMessage}</p> : null}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                    <button type="submit" disabled={isSavingGallery} style={{ border: "1px solid var(--leaf-800)", borderRadius: 8, padding: "14px 16px", background: "var(--leaf-800)", color: "var(--text-light)", fontWeight: 800, boxShadow: "0 12px 28px rgba(31, 51, 40, 0.18)", opacity: isSavingGallery ? 0.7 : 1 }}>{isSavingGallery ? "Saving..." : isEditing ? "Update item" : "Create item"}</button>
                    {isEditing ? <button type="button" onClick={resetDraft} style={{ border: "1px solid rgba(63, 95, 72, 0.34)", borderRadius: 8, padding: "14px 16px", background: "rgba(255, 253, 248, 0.82)", color: "var(--text-dark)", fontWeight: 800 }}>Cancel edit</button> : null}
                  </div>
                </form>
              </div>
            </details>

            <details style={{ overflow: "hidden", border: "1px solid var(--line)", borderRadius: 8, background: "var(--bg-panel)", boxShadow: "0 10px 30px rgba(31, 51, 40, 0.08)" }}>
              <summary style={{ padding: 16, cursor: "pointer", color: "var(--text-dark)", fontFamily: "var(--serif)", fontWeight: 700 }}>Existing Gallery</summary>
              <div style={{ display: "grid", gap: 16, padding: 16, borderTop: "1px solid var(--line)" }}>
                {isLoadingItems ? <p style={{ margin: 0, color: "var(--muted)" }}>Loading admin gallery...</p> : null}
                {!isLoadingItems ? (
                  <div style={{ display: "grid", gap: 12 }}>
                    <div style={{ display: "grid", gap: 12, gridTemplateColumns: editGalleryGridColumns }}>
                      {items.map((item) => (
                        <article key={item.id} draggable onDragStart={() => setDraggingId(item.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => handleDrop(item.id)} style={{ position: "relative", display: "grid", gap: 10, minHeight: 148, padding: 14, border: "1px solid var(--line)", borderRadius: 8, background: "var(--bg-panel)", boxShadow: "0 10px 30px rgba(31, 51, 40, 0.08)" }}>
                          <span style={{ position: "absolute", top: 12, right: 12, color: "var(--leaf-700)", fontSize: "1rem", fontWeight: 700, letterSpacing: 1, cursor: "grab" }} aria-hidden="true">⋮⋮</span>
                          <div style={{ display: "grid", gap: 6, paddingRight: 24 }}>
                            <p style={{ margin: 0, fontWeight: 700 }}>{item.title}</p>
                            {item.isSold ? <p style={{ margin: 0, color: "var(--danger)", fontSize: "0.8rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>Sold</p> : null}
                            <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.85rem" }}>{isSavingOrder ? "Saving order..." : "Drag to reorder"}</p>
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignSelf: "end", alignItems: "center" }}>
                            <button type="button" onClick={() => { revokeObjectUrls(selectedImages); setEditingId(item.id); setEditingImageIds(item.images.map((image) => image.id)); setDraft({ title: item.title, description: item.description, price: item.priceCents !== null ? (item.priceCents / 100).toFixed(2) : "" }); setSelectedImages([]); setActiveCropIndex(0); }} style={{ border: "1px solid rgba(63, 95, 72, 0.34)", borderRadius: 8, padding: "10px 12px", background: "rgba(255, 253, 248, 0.82)", color: "var(--leaf-900)", fontWeight: 800 }}>Edit</button>
                            {pendingDeleteId === item.id ? (
                              <>
                                <button type="button" onClick={() => void handleDelete(item.id)} disabled={deletingId === item.id} style={{ border: "1px solid var(--danger)", borderRadius: 8, padding: "10px 12px", background: "var(--danger)", color: "var(--paper)", fontWeight: 800, opacity: deletingId === item.id ? 0.7 : 1 }}>{deletingId === item.id ? "Deleting..." : "Confirm delete"}</button>
                                <button type="button" onClick={() => setPendingDeleteId(null)} disabled={deletingId === item.id} style={{ border: "1px solid rgba(63, 95, 72, 0.34)", borderRadius: 8, padding: "10px 12px", background: "rgba(255, 253, 248, 0.82)", color: "var(--leaf-900)", fontWeight: 800 }}>Cancel</button>
                              </>
                            ) : (
                              <button type="button" onClick={() => setPendingDeleteId(item.id)} style={{ border: "1px solid rgba(63, 95, 72, 0.34)", borderRadius: 8, padding: "10px 12px", background: "rgba(255, 253, 248, 0.82)", color: "var(--danger)", fontWeight: 800 }}>Delete</button>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </details>

            <details style={{ overflow: "hidden", border: "1px solid var(--line)", borderRadius: 8, background: "var(--bg-panel)", boxShadow: "0 10px 30px rgba(31, 51, 40, 0.08)" }}>
              <summary style={{ padding: 16, cursor: "pointer", color: "var(--text-dark)", fontFamily: "var(--serif)", fontWeight: 700 }}>Services</summary>
              <div style={{ display: "grid", gap: 12, padding: 16, borderTop: "1px solid var(--line)" }}>
                <form onSubmit={handleCategorySubmit} style={{ display: "grid", gap: 12 }}>
                  <input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Service name" style={{ width: "100%", padding: 14, border: "1px solid rgba(63, 95, 72, 0.28)", borderRadius: 8, background: "rgba(255, 253, 248, 0.94)", color: "var(--text-dark)", fontSize: "1rem" }} />
                  {categoryError ? <p style={{ margin: 0, color: "var(--danger)" }}>{categoryError}</p> : null}
                  {categoryMessage ? <p style={{ margin: 0, color: "var(--success)" }}>{categoryMessage}</p> : null}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                    <button type="submit" style={{ border: "1px solid var(--leaf-800)", borderRadius: 8, padding: "14px 16px", background: "var(--leaf-800)", color: "var(--text-light)", fontWeight: 800, boxShadow: "0 12px 28px rgba(31, 51, 40, 0.18)" }}>{editingCategoryId !== null ? "Update service" : "Create service"}</button>
                    {editingCategoryId !== null ? <button type="button" onClick={() => { setEditingCategoryId(null); setCategoryName(""); }} style={{ border: "1px solid rgba(63, 95, 72, 0.34)", borderRadius: 8, padding: "14px 16px", background: "rgba(255, 253, 248, 0.82)", color: "var(--text-dark)", fontWeight: 800 }}>Cancel edit</button> : null}
                  </div>
                </form>
                <div style={{ display: "grid", gap: 12 }}>
                  {categories.map((category) => (
                    <div key={category.id} style={{ display: "grid", gap: 8, padding: 16, border: "1px solid var(--line)", borderRadius: 8, background: "var(--bg-panel)", boxShadow: "0 10px 30px rgba(31, 51, 40, 0.08)" }}>
                      <p style={{ margin: 0, fontWeight: 700 }}>{category.name}</p>
                      <p style={{ margin: 0, color: "var(--muted)" }}>{category.isArchived ? "Archived" : "Active"}</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                        <button type="button" onClick={() => { setEditingCategoryId(category.id); setCategoryName(category.name); }} style={{ border: "1px solid rgba(63, 95, 72, 0.34)", borderRadius: 8, padding: "10px 12px", background: "rgba(255, 253, 248, 0.82)", color: "var(--text-dark)", fontWeight: 800 }}>Edit</button>
                        <button type="button" onClick={() => void toggleArchiveCategory(category)} style={{ border: "1px solid rgba(63, 95, 72, 0.34)", borderRadius: 8, padding: "10px 12px", background: "rgba(255, 253, 248, 0.82)", color: "var(--text-dark)", fontWeight: 800 }}>{category.isArchived ? "Restore" : "Archive"}</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </details>
          </section>

          <details style={{ overflow: "hidden", border: "1px solid var(--line)", borderRadius: 8, background: "var(--bg-panel)", boxShadow: "0 10px 30px rgba(31, 51, 40, 0.08)" }}>
            <summary style={{ padding: 16, cursor: "pointer", color: "var(--text-dark)", fontFamily: "var(--serif)", fontWeight: 700 }}>All Orders</summary>
            <div style={{ display: "grid", gap: 16, padding: 16, borderTop: "1px solid var(--line)" }}>
              {ordersError ? <p style={{ margin: 0, color: "var(--danger)" }}>{ordersError}</p> : null}
              {isLoadingOrders ? <p style={{ margin: 0, color: "var(--muted)" }}>Loading orders...</p> : null}
              {!isLoadingOrders ? (
                <div style={{ display: "grid", gap: 12 }}>
                  {orders.map((order) => (
                    <article key={order.orderNumber} style={{ display: "grid", gap: 8, padding: 16, border: "1px solid var(--line)", borderRadius: 8, background: "var(--bg-panel)", boxShadow: "0 10px 30px rgba(31, 51, 40, 0.08)" }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
                        <p style={{ margin: 0, fontWeight: 700 }}>Order {order.orderNumber}</p>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto" }}>
                          <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.82rem", whiteSpace: "nowrap" }}>{formatRelativeAge(order.createdAt)}</p>
                          {order.customerConfirmedAt ? (
                            <span title="Customer confirmed receipt" aria-label="Customer confirmed receipt" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 28, height: 28, borderRadius: 999, background: "rgba(47, 133, 90, 0.16)", color: "var(--success)", fontWeight: 900 }}>
                              ✓
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <p style={{ margin: 0, color: "var(--leaf-700)", fontSize: "0.82rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>{getOrderKindLabel(order.orderKind)}</p>
                      <p style={{ margin: 0, color: "var(--muted)" }}>{order.customerName} · {order.categoryName}</p>
                      <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.85rem" }}>{order.customerEmail}</p>
                      <p style={{ margin: 0, color: "var(--muted)" }}>Status: {order.status}</p>
                      {order.amountCents !== null ? <p style={{ margin: 0, color: "var(--muted)" }}>Amount: {(order.amountCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })}</p> : null}
                      {order.canOpen ? <button type="button" onClick={() => onOpenOrder(order.orderNumber)} style={{ justifySelf: "start", border: "1px solid var(--leaf-800)", borderRadius: 8, padding: "10px 12px", background: "var(--leaf-800)", color: "var(--text-light)", fontWeight: 800 }}>Open order</button> : null}
                    </article>
                  ))}
                </div>
              ) : null}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                <button type="button" disabled={ordersPage === 1} onClick={() => setOrdersPage((current) => current - 1)} style={{ border: "1px solid rgba(63, 95, 72, 0.34)", borderRadius: 8, padding: "10px 12px", background: "rgba(255, 253, 248, 0.82)", color: "var(--text-dark)", fontWeight: 800 }}>Previous</button>
                <p style={{ margin: 0, color: "var(--muted)" }}>Page {ordersPage} of {totalPages}</p>
                <button type="button" disabled={ordersPage >= totalPages} onClick={() => setOrdersPage((current) => current + 1)} style={{ border: "1px solid rgba(63, 95, 72, 0.34)", borderRadius: 8, padding: "10px 12px", background: "rgba(255, 253, 248, 0.82)", color: "var(--text-dark)", fontWeight: 800 }}>Next</button>
              </div>
            </div>
          </details>
        </>
      ) : null}

      <button type="button" onClick={onLogout} style={{ justifySelf: "start", border: "1px solid rgba(63, 95, 72, 0.34)", borderRadius: 8, padding: "12px 14px", background: "rgba(255, 253, 248, 0.82)", color: "var(--text-dark)", fontWeight: 800 }}>Logout</button>
    </section>
  );
}
