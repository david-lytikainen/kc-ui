import { ChangeEvent, FormEvent, useEffect, useState } from "react";

import { authApi, GalleryDraft, galleryApi, GalleryItem, User } from "../api";


type ProfilePageProps = {
  token: string;
  user: User;
  onUserChange: (user: User) => void;
  onGalleryChanged: () => void;
};


const emptyDraft: GalleryDraft = { title: "", description: "", image_url: "", s3_key: "" };


export default function ProfilePage({ token, user, onUserChange, onGalleryChanged }: ProfilePageProps) {
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

  useEffect(() => {
    setName(user.name);
  }, [user.name]);

  useEffect(() => {
    if (user.role !== "admin") {
      return;
    }

    async function loadAdminItems() {
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

    void loadAdminItems();
  }, [token, user.role]);

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

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setIsUploading(true);
      setGalleryError("");
      const uploaded = await galleryApi.upload(token, file);
      setDraft((current) => ({ ...current, s3_key: uploaded.s3_key }));
      setUploadedPreviewUrl(uploaded.preview_url);
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
              <input value={draft.image_url} onChange={(event) => setDraft((current) => ({ ...current, image_url: event.target.value }))} placeholder="Signed or fallback image URL" style={{ width: "100%", padding: 14, border: "1px solid #d9c4bd", borderRadius: 10, fontSize: "1rem" }} />
              <input value={draft.s3_key} onChange={(event) => setDraft((current) => ({ ...current, s3_key: event.target.value }))} placeholder="S3 key" style={{ width: "100%", padding: 14, border: "1px solid #d9c4bd", borderRadius: 10, fontSize: "1rem" }} />
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
                    <img src={item.image_url} alt={item.title} style={{ display: "block", width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 10, background: "#f6e7e2" }} />
                    <div style={{ display: "grid", gap: 6 }}>
                      <p style={{ margin: 0, fontWeight: 700 }}>{item.title}</p>
                      <p style={{ margin: 0, color: "#6a4b43", lineHeight: 1.5 }}>{item.description}</p>
                      <p style={{ margin: 0, color: "#9c6f63", fontSize: "0.85rem" }}>Drag to reorder</p>
                    </div>
                    <div style={{ display: "flex", gap: 12 }}>
                      <button type="button" onClick={() => { setEditingId(item.id); setDraft({ title: item.title, description: item.description, image_url: item.source_image_url, s3_key: item.s3_key ?? "" }); setUploadedPreviewUrl(item.image_url); }} style={{ border: "1px solid #d9c4bd", borderRadius: 10, padding: "12px 14px", background: "#ffffff", color: "#2f1712", fontSize: "0.95rem", fontWeight: 700, cursor: "pointer" }}>Edit</button>
                      <button type="button" onClick={() => void handleDelete(item.id)} style={{ border: "1px solid #d9c4bd", borderRadius: 10, padding: "12px 14px", background: "#ffffff", color: "#8f2d1d", fontSize: "0.95rem", fontWeight: 700, cursor: "pointer" }}>Delete</button>
                    </div>
                  </article>
                ))}
                {items.length > 1 ? <button type="button" onClick={() => void saveOrder()} style={{ border: "none", borderRadius: 10, padding: "14px 16px", background: "#2f1712", color: "#ffffff", fontSize: "1rem", fontWeight: 700, cursor: "pointer" }}>Save gallery order</button> : null}
              </div>
            ) : null}
          </div>
        </details>
      ) : null}
    </section>
  );
}
