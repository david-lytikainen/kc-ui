import { useEffect, useState } from "react";

import { galleryApi, GalleryItem } from "../api";
import GalleryCheckoutForm from "./GalleryCheckoutForm";
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
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState("50% 50%");

  const formatCurrency = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
  const activeImage = item?.images[activeImageIndex] ?? null;

  const handleBuy = async () => {
    if (!item) {
      return;
    }
    try {
      setIsStartingCheckout(true);
      setError("");
      const response = await galleryApi.createCheckout(item.id);
      window.location.href = response.url;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to start checkout.");
    } finally {
      setIsStartingCheckout(false);
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
    <section className="d-grid gap-4">
      <button className="btn btn-outline-secondary" type="button" onClick={onBackToGallery}>Back to gallery</button>
      {isLoading ? <p className="text-muted">Loading gallery item...</p> : null}
      {error ? <p className="text-danger">{error}</p> : null}
      {!isLoading && !error && item ? (
        <div className="row g-4">
          <div className="col-12 col-lg-7 d-grid gap-3">
            <div className="card p-2 d-inline-block mw-100 overflow-hidden">
              {activeImage ? (
                <div
                  className="d-flex justify-content-center align-items-center d-inline-block mw-100 overflow-hidden p-2"
                  style={{ cursor: "zoom-in", minHeight: 240, maxHeight: "70vh" }}
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
                    className="d-block mw-100"
                    style={{ width: "auto", maxWidth: "100%", maxHeight: "70vh", objectFit: "contain", background: "var(--linen)", transition: "transform 220ms ease", transformOrigin: zoomOrigin }}
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
            {item.images.length > 1 ? (
              <div className="d-flex flex-wrap gap-2">
                {item.images.map((image, index) => (
                  <button key={image.id} className={`thumbnail-button ${index === activeImageIndex ? "active" : ""}`} type="button" onClick={() => setActiveImageIndex(index)}>
                    <img className="thumbnail-image" src={image.imageUrl} alt={`${item.title} preview ${index + 1}`} />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="col-12 col-lg-5 d-grid gap-3 align-content-start">
            <div className="d-grid gap-2">
              <h2 className="h2 mb-0">{item.title}</h2>
              <p className="text-muted lh-lg">{item.description}</p>
              {item.priceCents !== null ? <p className="fw-bold">{formatCurrency(item.priceCents)}</p> : null}
            </div>

            {item.priceCents !== null ? (
              <div className="d-grid gap-2" style={{ maxWidth: 420 }}>
                <GalleryCheckoutForm isStartingCheckout={isStartingCheckout} onStartCheckout={() => void handleBuy()} submitLabel="Buy" />
              </div>
            ) : null}

            {item.priceCents !== null ? (
              <div className="card p-3 d-grid gap-2">
                <p className="fw-bold mb-0">Ask a question</p>
                <input className="form-control" value={inquiryEmail} onChange={(event) => setInquiryEmail(normalizeEmailInput(event.target.value))} placeholder="Your email" type="email" autoCapitalize="none" autoCorrect="off" inputMode="email" />
                <textarea className="form-control" value={inquiryBody} onChange={(event) => setInquiryBody(event.target.value)} placeholder="Ask a question" rows={4} />
                <div className="d-flex flex-wrap gap-2 align-items-center">
                  <button className="btn btn-primary" type="button" onClick={() => void handleInquiry()} disabled={isSendingInquiry}>{isSendingInquiry ? "Sending..." : "Send question"}</button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
