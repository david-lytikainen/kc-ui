import { useEffect, useState } from "react";

import { galleryApi, GalleryItem } from "../api";


type GalleryPreviewProps = {
  refreshToken: number;
};


export default function GalleryPreview({ refreshToken }: GalleryPreviewProps) {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadGallery() {
      try {
        setIsLoading(true);
        setError("");

        const nextItems = await galleryApi.listPublic();
        if (isActive) {
          setItems(nextItems);
        }
      } catch (nextError) {
        if (isActive) {
          setError(nextError instanceof Error ? nextError.message : "Unable to load gallery.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadGallery();
    return () => {
      isActive = false;
    };
  }, [refreshToken]);

  return (
    <section id="gallery" style={{ display: "grid", gap: 16 }}>
      <div>
        <p style={{ margin: 0, fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", color: "#9c6f63" }}>Gallery</p>
        <h2 style={{ margin: "8px 0 0", fontSize: "1.5rem" }}>Published work</h2>
      </div>
      {isLoading ? <p style={{ margin: 0, color: "#6a4b43" }}>Loading gallery...</p> : null}
      {error ? <p style={{ margin: 0, color: "#8f2d1d" }}>{error}</p> : null}
      {!isLoading && !error && items.length === 0 ? <p style={{ margin: 0, color: "#6a4b43" }}>No gallery items are published yet.</p> : null}
      {!isLoading && !error && items.length > 0 ? (
        <div style={{ display: "grid", gap: 12 }}>
          {items.map((item) => (
            <article key={item.id} style={{ overflow: "hidden", border: "1px solid #ead9d2", borderRadius: 14, background: "#ffffff" }}>
              <img src={item.image_url} alt={item.title} style={{ display: "block", width: "100%", aspectRatio: "4 / 3", objectFit: "cover", background: "#f6e7e2" }} />
              <div style={{ display: "grid", gap: 6, padding: 16 }}>
                <p style={{ margin: 0, fontWeight: 600 }}>{item.title}</p>
                <p style={{ margin: 0, color: "#6a4b43", lineHeight: 1.5 }}>{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
