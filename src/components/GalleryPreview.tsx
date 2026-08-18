import { useEffect, useState } from "react";

import { galleryApi, GalleryItem } from "../api";


type GalleryPreviewProps = {
  refreshToken: number;
};


export default function GalleryPreview({ refreshToken }: GalleryPreviewProps) {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const formatCurrency = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

  const handleBuy = async (itemId: number) => {
    try {
      const response = await galleryApi.createCheckout(itemId);
      window.location.href = response.url;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to start checkout.");
    }
  };

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
      <div style={{ display: "grid", gap: 8, maxWidth: 680 }}>
        <p style={{ margin: 0, color: "var(--leaf-800)", fontFamily: "var(--serif)", fontSize: "clamp(1.65rem, 5vw, 2.55rem)", fontWeight: 500 }}>Gallery</p>
      </div>
      {isLoading ? <p style={{ margin: 0, color: "var(--muted)" }}>Loading gallery...</p> : null}
      {error ? <p style={{ margin: 0, color: "var(--danger)" }}>{error}</p> : null}
      {!isLoading && !error && items.length === 0 ? <p style={{ margin: 0, color: "var(--muted)" }}>No gallery items are published yet.</p> : null}
      {!isLoading && !error && items.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", gap: 12 }}>
          {items.map((item) => (
            <article key={item.id} style={{ overflow: "hidden", border: "1px solid var(--line)", borderRadius: 8, background: "rgba(255, 253, 248, 0.86)", boxShadow: "0 10px 30px rgba(31, 51, 40, 0.08)" }}>
              <img src={item.imageUrl} alt={item.title} style={{ display: "block", width: "100%", aspectRatio: "4 / 3", objectFit: "cover", background: "var(--linen)" }} />
              <div style={{ display: "grid", gap: 10, padding: 16 }}>
                <p style={{ margin: 0, fontWeight: 700 }}>{item.title}</p>
                <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.5 }}>{item.description}</p>
                {item.priceCents !== null ? (
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                    <p style={{ margin: 0, color: "var(--leaf-900)", fontWeight: 700 }}>{formatCurrency(item.priceCents)}</p>
                    <button type="button" onClick={() => void handleBuy(item.id)} style={{ border: "1px solid var(--leaf-800)", borderRadius: 8, padding: "10px 12px", background: "var(--leaf-800)", color: "var(--paper)", fontWeight: 800 }}>Buy</button>
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
