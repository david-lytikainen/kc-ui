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
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);

  const formatCurrency = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
  const slideCount = Math.max(1, Math.ceil(items.length / itemsPerSlide));
  const visibleItems = mode === "full"
    ? items
    : items.length
    ? Array.from({ length: Math.min(itemsPerSlide, items.length) }, (_, index) => items[(currentSlide * itemsPerSlide + index) % items.length])
    : [];
  const handleBuy = async (itemId: number) => {
    try {
      setIsStartingCheckout(true);
      setError("");
      const response = await galleryApi.createCheckout(itemId);
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
    <section id="gallery" className="row g-3">
      <div className="col-12">
        <h2 className="h2 mb-0">Gallery</h2>
      </div>
      {isLoading ? <p className="text-muted">Loading gallery...</p> : null}
      {error ? <p className="text-danger">{error}</p> : null}
      {!isLoading && !error && items.length === 0 ? <p className="text-muted">No gallery items are published yet.</p> : null}
      {!isLoading && !error && items.length > 0 ? (
        <div className="col-12 d-grid gap-3">
          <div className={mode === "full" ? "row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3" : "row g-3"}>
          {visibleItems.map((item) => (
            <article key={item.id} className={mode === "full" ? "col" : itemsPerSlide === 1 ? "col-12" : "col-12 col-md-4"}>
              <div className="card h-100 overflow-hidden">
              <button className="p-0 border-0 bg-transparent" type="button" onClick={() => onOpenItem?.(item.id)}>
                <img className="gallery-cover" src={item.imageUrl} alt={item.title} />
              </button>
              <div className="card-body d-grid gap-2">
                <button className="btn btn-link p-0 text-start text-decoration-none fw-bold" type="button" onClick={() => onOpenItem?.(item.id)}>{item.title}</button>
                <p className="card-text text-muted mb-0">{item.description}</p>
                {item.priceCents !== null ? (
                  <div className="d-flex justify-content-between gap-2 align-items-center">
                    <p className="mb-0 fw-bold">{formatCurrency(item.priceCents)}</p>
                    <div className="d-flex gap-2 align-items-center">
                      <button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => setInquiryItemId((current) => current === item.id ? null : item.id)} aria-label="Ask a question" title="Ask a question">💬</button>
                      <button className="btn btn-primary btn-sm" type="button" onClick={() => setCheckoutItemId((current) => current === item.id ? null : item.id)}>Buy</button>
                    </div>
                  </div>
                ) : null}
                {checkoutItemId === item.id ? (
                  <GalleryCheckoutForm isStartingCheckout={isStartingCheckout} onStartCheckout={() => void handleBuy(item.id)} onCancel={() => setCheckoutItemId(null)} />
                ) : null}
                {inquiryItemId === item.id ? (
                  <div className="d-grid gap-2">
                    <input className="form-control" value={inquiryEmail} onChange={(event) => setInquiryEmail(normalizeEmailInput(event.target.value))} placeholder="Your email" type="email" autoCapitalize="none" autoCorrect="off" inputMode="email" />
                    <textarea className="form-control" value={inquiryBody} onChange={(event) => setInquiryBody(event.target.value)} placeholder="Ask a question" rows={3} />
                    <div className="d-flex gap-2 flex-wrap">
                      <button className="btn btn-primary btn-sm" type="button" onClick={() => void handleInquiry(item.id)} disabled={isSendingInquiry}>{isSendingInquiry ? "Sending..." : "Send question"}</button>
                      <button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => { setInquiryItemId(null); setInquiryEmail(""); setInquiryBody(""); }}>Cancel</button>
                    </div>
                  </div>
                ) : null}
              </div>
              </div>
            </article>
          ))}
          </div>
          {mode === "preview" && onOpenFullGallery ? <button className="btn btn-link p-0 text-start fw-bold" type="button" onClick={onOpenFullGallery}>View Full Gallery</button> : null}
        </div>
      ) : null}
    </section>
  );
}
