import { useEffect, useState } from "react";

import { galleryApi, GalleryItem } from "../api";
import GalleryCheckoutForm from "./GalleryCheckoutForm";
import { normalizeEmailInput } from "../inputFormatting";


type GalleryPreviewProps = {
  mode?: "preview" | "full";
  refreshToken?: number;
  onOpenItem?: (itemId: number) => void;
  onOpenOrder: (orderNumber: string) => void;
  onOpenFullGallery?: () => void;
};


function getItemsPerSlide() {
  if (typeof window === "undefined") {
    return 3;
  }
  return window.innerWidth >= 768 ? 3 : 1;
}


export default function GalleryPreview({ mode = "preview", refreshToken = 0, onOpenFullGallery, onOpenItem, onOpenOrder }: GalleryPreviewProps) {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [itemsPerSlide, setItemsPerSlide] = useState(getItemsPerSlide);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [inquiryItemId, setInquiryItemId] = useState<number | null>(null);
  const [inquiryEmail, setInquiryEmail] = useState("");
  const [inquiryBody, setInquiryBody] = useState("");
  const [isSendingInquiry, setIsSendingInquiry] = useState(false);
  const [checkoutItemId, setCheckoutItemId] = useState<number | null>(null);
  const [checkoutEmail, setCheckoutEmail] = useState("");
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);

  const formatCurrency = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
  const slideCount = Math.max(1, Math.ceil(items.length / itemsPerSlide));
  const visibleItems = mode === "full"
    ? items
    : items.length
    ? Array.from({ length: Math.min(itemsPerSlide, items.length) }, (_, index) => items[(currentSlide * itemsPerSlide + index) % items.length])
    : [];
  const galleryColumns = mode === "full" ? "repeat(auto-fit, minmax(min(100%, 260px), 1fr))" : `repeat(${Math.min(itemsPerSlide, Math.max(visibleItems.length, 1))}, minmax(0, 1fr))`;

  const handleBuy = async (itemId: number) => {
    try {
      setIsStartingCheckout(true);
      setError("");
      const customerEmail = normalizeEmailInput(checkoutEmail);
      if (!customerEmail) {
        setError("Email is required to start checkout.");
        return;
      }
      const response = await galleryApi.createCheckout(itemId, customerEmail);
      window.location.href = response.url;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to start checkout.");
    } finally {
      setIsStartingCheckout(false);
    }
  };

  const handleInquiry = async (itemId: number) => {
    try {
      setIsSendingInquiry(true);
      setError("");
      const customerEmail = normalizeEmailInput(inquiryEmail);
      if (!customerEmail || !inquiryBody.trim()) {
        setError("Email and question message are required.");
        return;
      }
      const order = await galleryApi.createInquiry(itemId, customerEmail, inquiryBody);
      setInquiryEmail("");
      setInquiryBody("");
      setInquiryItemId(null);
      onOpenOrder(order.orderNumber);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to send question.");
    } finally {
      setIsSendingInquiry(false);
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
          setCurrentSlide(0);
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

  useEffect(() => {
    if (mode === "full") {
      return;
    }

    const handleResize = () => {
      setItemsPerSlide(getItemsPerSlide());
      setCurrentSlide(0);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [mode]);

  useEffect(() => {
    if (mode === "full") {
      return;
    }

    if (items.length <= itemsPerSlide) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setCurrentSlide((current) => (current + 1) % slideCount);
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [items.length, itemsPerSlide, mode, slideCount]);

  return (
    <section id="gallery" style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gap: 8, maxWidth: 680 }}>
        <p style={{ margin: 0, color: "var(--text-dark)", fontFamily: "var(--serif)", fontSize: "clamp(1.65rem, 5vw, 2.55rem)", fontWeight: 500 }}>Gallery</p>
      </div>
      {isLoading ? <p style={{ margin: 0, color: "var(--muted)" }}>Loading gallery...</p> : null}
      {error ? <p style={{ margin: 0, color: "var(--danger)" }}>{error}</p> : null}
      {!isLoading && !error && items.length === 0 ? <p style={{ margin: 0, color: "var(--muted)" }}>No gallery items are published yet.</p> : null}
      {!isLoading && !error && items.length > 0 ? (
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: galleryColumns, gap: 12 }}>
          {visibleItems.map((item) => (
            <article key={item.id} style={{ overflow: "hidden", border: "1px solid var(--line)", borderRadius: 8, background: "var(--bg-gallery-item)", boxShadow: "0 10px 30px rgba(31, 51, 40, 0.08)" }}>
              <button type="button" onClick={() => onOpenItem?.(item.id)} style={{ display: "block", width: "100%", padding: 0, border: 0, background: "transparent", cursor: onOpenItem ? "pointer" : "default" }}>
                <img src={item.imageUrl} alt={item.title} style={{ display: "block", width: "100%", aspectRatio: "4 / 3", objectFit: "cover", background: "var(--linen)" }} />
              </button>
              <div style={{ display: "grid", gap: 10, padding: 16 }}>
                <button type="button" onClick={() => onOpenItem?.(item.id)} style={{ width: "fit-content", padding: 0, border: 0, background: "transparent", color: "var(--text-dark)", fontWeight: 700, fontSize: "1rem", textAlign: "left", cursor: onOpenItem ? "pointer" : "default" }}>{item.title}</button>
                <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.5 }}>{item.description}</p>
                {item.priceCents !== null ? (
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                    <p style={{ margin: 0, color: "var(--text-dark)", fontWeight: 700 }}>{formatCurrency(item.priceCents)}</p>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <button type="button" onClick={() => setInquiryItemId((current) => current === item.id ? null : item.id)} aria-label="Ask a question" title="Ask a question" style={{ border: "1px solid rgba(63, 95, 72, 0.34)", borderRadius: 8, padding: "10px 12px", background: "rgba(255, 253, 248, 0.82)", color: "var(--text-dark)", fontWeight: 800 }}>💬</button>
                      <button type="button" onClick={() => setCheckoutItemId((current) => current === item.id ? null : item.id)} style={{ border: "1px solid var(--leaf-800)", borderRadius: 8, padding: "10px 12px", background: "var(--leaf-800)", color: "var(--text-light)", fontWeight: 800 }}>Buy</button>
                    </div>
                  </div>
                ) : null}
                {checkoutItemId === item.id ? (
                  <GalleryCheckoutForm email={checkoutEmail} isStartingCheckout={isStartingCheckout} onEmailChange={(value) => setCheckoutEmail(normalizeEmailInput(value))} onStartCheckout={() => void handleBuy(item.id)} onCancel={() => { setCheckoutItemId(null); setCheckoutEmail(""); }} />
                ) : null}
                {inquiryItemId === item.id ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    <input value={inquiryEmail} onChange={(event) => setInquiryEmail(normalizeEmailInput(event.target.value))} placeholder="Your email" type="email" autoCapitalize="none" autoCorrect="off" inputMode="email" style={{ width: "100%", padding: 12, border: "1px solid rgba(63, 95, 72, 0.28)", borderRadius: 8, background: "rgba(255, 253, 248, 0.94)", color: "var(--text-dark)", fontSize: "0.95rem" }} />
                    <textarea value={inquiryBody} onChange={(event) => setInquiryBody(event.target.value)} placeholder="Ask a question" rows={3} style={{ width: "100%", padding: 12, border: "1px solid rgba(63, 95, 72, 0.28)", borderRadius: 8, background: "rgba(255, 253, 248, 0.94)", color: "var(--text-dark)", fontSize: "0.95rem", resize: "vertical" }} />
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <button type="button" onClick={() => void handleInquiry(item.id)} disabled={isSendingInquiry} style={{ border: "1px solid var(--leaf-800)", borderRadius: 8, padding: "10px 12px", background: "var(--leaf-800)", color: "var(--text-light)", fontWeight: 800 }}>{isSendingInquiry ? "Sending..." : "Send question"}</button>
                      <button type="button" onClick={() => { setInquiryItemId(null); setInquiryEmail(""); setInquiryBody(""); }} style={{ border: "1px solid rgba(63, 95, 72, 0.34)", borderRadius: 8, padding: "10px 12px", background: "rgba(255, 253, 248, 0.82)", color: "var(--text-dark)", fontWeight: 800 }}>Cancel</button>
                    </div>
                  </div>
                ) : null}
              </div>
            </article>
          ))}
          </div>
          {mode === "preview" && onOpenFullGallery ? <button type="button" onClick={onOpenFullGallery} style={{ justifySelf: "start", border: 0, background: "transparent", color: "var(--text-dark)", padding: 0, marginBottom: 16, fontWeight: 800, textDecoration: "underline", textDecorationColor: "rgba(85, 116, 91, 0.35)", textUnderlineOffset: 4 }}>View Full Gallery</button> : null}
        </div>
      ) : null}
    </section>
  );
}
