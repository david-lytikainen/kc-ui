import { useEffect, useState } from "react";

import { galleryApi, GalleryItem } from "../api";
import { normalizeEmailInput } from "../inputFormatting";


type GalleryItemPageProps = {
  itemId: number;
  onBackToGallery: () => void;
  onOpenOrder: (orderNumber: string) => void;
};


export default function GalleryItemPage({ itemId, onBackToGallery, onOpenOrder }: GalleryItemPageProps) {
  const [item, setItem] = useState<GalleryItem | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [inquiryEmail, setInquiryEmail] = useState("");
  const [inquiryBody, setInquiryBody] = useState("");
  const [isSendingInquiry, setIsSendingInquiry] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState("50% 50%");

  const formatCurrency = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
  const activeImage = item?.images[activeImageIndex] ?? null;

  const handleBuy = async () => {
    if (!item) {
      return;
    }
    try {
      const response = await galleryApi.createCheckout(item.id);
      window.location.href = response.url;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to start checkout.");
    }
  };

  const handleInquiry = async () => {
    if (!item) {
      return;
    }
    try {
      setIsSendingInquiry(true);
      setError("");
      const customerEmail = normalizeEmailInput(inquiryEmail);
      if (!customerEmail || !inquiryBody.trim()) {
        setError("Email and question message are required.");
        return;
      }
      const order = await galleryApi.createInquiry(item.id, customerEmail, inquiryBody);
      setInquiryEmail("");
      setInquiryBody("");
      onOpenOrder(order.orderNumber);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to send question.");
    } finally {
      setIsSendingInquiry(false);
    }
  };

  useEffect(() => {
    let isActive = true;

    async function loadItem() {
      try {
        setIsLoading(true);
        setError("");
        const nextItem = await galleryApi.getItem(itemId);
        if (!isActive) {
          return;
        }
        setItem(nextItem);
        setActiveImageIndex(0);
        setZoomOrigin("50% 50%");
      } catch (nextError) {
        if (isActive) {
          setError(nextError instanceof Error ? nextError.message : "Unable to load gallery item.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadItem();
    return () => {
      isActive = false;
    };
  }, [itemId]);

  return (
    <section style={{ display: "grid", gap: 18 }}>
      <button type="button" onClick={onBackToGallery} style={{ justifySelf: "start", border: "1px solid rgba(63, 95, 72, 0.34)", borderRadius: 8, padding: "10px 12px", background: "rgba(255, 253, 248, 0.82)", color: "var(--text-dark)", fontWeight: 800 }}>Back to gallery</button>
      {isLoading ? <p style={{ margin: 0, color: "var(--muted)" }}>Loading gallery item...</p> : null}
      {error ? <p style={{ margin: 0, color: "var(--danger)" }}>{error}</p> : null}
      {!isLoading && !error && item ? (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ overflow: "hidden", border: "1px solid var(--line)", borderRadius: 8, background: "var(--bg-gallery-item)", boxShadow: "0 10px 30px rgba(31, 51, 40, 0.08)" }}>
              {activeImage ? (
                <div
                  style={{ overflow: "hidden", cursor: "zoom-in" }}
                  onMouseMove={(event) => {
                    const bounds = event.currentTarget.getBoundingClientRect();
                    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
                    const y = ((event.clientY - bounds.top) / bounds.height) * 100;
                    setZoomOrigin(`${Math.min(100, Math.max(0, x))}% ${Math.min(100, Math.max(0, y))}%`);
                  }}
                  onMouseLeave={() => {
                    setZoomOrigin("50% 50%");
                  }}
                >
                  <img
                    src={activeImage.imageUrl}
                    alt={item.title}
                    style={{ display: "block", width: "100%", aspectRatio: "4 / 3", objectFit: "cover", background: "var(--linen)", transition: "transform 220ms ease", transformOrigin: zoomOrigin }}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.transform = "scale(1.9)";
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.transform = "scale(1)";
                    }}
                  />
                </div>
              ) : null}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(64px, 84px))", gap: 10 }}>
              {item.images.map((image, index) => (
                <button key={image.id} type="button" onClick={() => setActiveImageIndex(index)} style={{ overflow: "hidden", border: index === activeImageIndex ? "2px solid var(--leaf-800)" : "1px solid var(--line)", borderRadius: 8, padding: 0, background: "var(--bg-panel)" }}>
                  <img src={image.imageUrl} alt={`${item.title} preview ${index + 1}`} style={{ display: "block", width: "100%", aspectRatio: "1 / 1", objectFit: "cover", background: "var(--linen)" }} />
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gap: 8 }}>
              <h2 style={{ margin: 0, color: "var(--text-dark)", fontFamily: "var(--serif)", fontSize: "clamp(1.8rem, 5vw, 2.6rem)", fontWeight: 500 }}>{item.title}</h2>
              <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>{item.description}</p>
              {item.priceCents !== null ? <p style={{ margin: 0, color: "var(--text-dark)", fontSize: "1.05rem", fontWeight: 700 }}>{formatCurrency(item.priceCents)}</p> : null}
            </div>

            {item.priceCents !== null ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                <button type="button" onClick={handleBuy} style={{ border: "1px solid var(--leaf-800)", borderRadius: 8, padding: "12px 14px", background: "var(--leaf-800)", color: "var(--text-light)", fontWeight: 800 }}>Buy</button>
              </div>
            ) : null}

            {item.priceCents !== null ? (
              <div style={{ display: "grid", gap: 8, padding: 16, border: "1px solid var(--line)", borderRadius: 8, background: "var(--bg-panel)", boxShadow: "0 10px 30px rgba(31, 51, 40, 0.08)" }}>
                <p style={{ margin: 0, fontWeight: 700 }}>Ask a question</p>
                <input value={inquiryEmail} onChange={(event) => setInquiryEmail(normalizeEmailInput(event.target.value))} placeholder="Your email" type="email" autoCapitalize="none" autoCorrect="off" inputMode="email" style={{ width: "100%", padding: 12, border: "1px solid rgba(63, 95, 72, 0.28)", borderRadius: 8, background: "rgba(255, 253, 248, 0.94)", color: "var(--text-dark)", fontSize: "0.95rem" }} />
                <textarea value={inquiryBody} onChange={(event) => setInquiryBody(event.target.value)} placeholder="Ask a question" rows={4} style={{ width: "100%", padding: 12, border: "1px solid rgba(63, 95, 72, 0.28)", borderRadius: 8, background: "rgba(255, 253, 248, 0.94)", color: "var(--text-dark)", fontSize: "0.95rem", resize: "vertical" }} />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                  <button type="button" onClick={() => void handleInquiry()} disabled={isSendingInquiry} style={{ border: "1px solid var(--leaf-800)", borderRadius: 8, padding: "12px 14px", background: "var(--leaf-800)", color: "var(--text-light)", fontWeight: 800, opacity: isSendingInquiry ? 0.7 : 1 }}>{isSendingInquiry ? "Sending..." : "Send question"}</button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
