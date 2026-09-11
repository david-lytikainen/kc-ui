import { FormEvent, useCallback, useEffect, useState } from "react";
import { Order, orderApi } from "../api";

type OrderPageProps = {
  orderNumber: string;
  token: string;
  onBackHome: () => void;
};

function formatCurrency(cents: number | null) {
  if (cents === null) {
    return "Not quoted yet";
  }

  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export default function OrderPage({ orderNumber, token, onBackHome }: OrderPageProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [commentSubmitError, setCommentSubmitError] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [pendingEmailCommentIds, setPendingEmailCommentIds] = useState<number[]>([]);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [quoteAmount, setQuoteAmount] = useState("");
  const [isConfirmingReceived, setIsConfirmingReceived] = useState(false);
  const [reviewRating, setReviewRating] = useState("5");
  const [reviewBody, setReviewBody] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const authToken = token || undefined;

  const viewerIsAdmin = Boolean(order?.viewerIsAdmin);
  const isGalleryOrder = order?.orderKind === "gallery";
  const isGalleryInquiry = order?.orderKind === "gallery_inquiry";

  const applyOrder = (nextOrder: Order) => {
    setOrder(nextOrder);
    setPendingEmailCommentIds((current) => current.filter((commentId) => {
      const comment = nextOrder.comments.find((entry) => entry.id === commentId);
      return Boolean(comment) && !comment?.emailSentAt && !comment?.emailError;
    }));
    if (nextOrder.orderKind === "commission" && nextOrder.quoteAmountCents !== null) {
      setQuoteAmount((nextOrder.quoteAmountCents / 100).toFixed(2));
      return;
    }
    setQuoteAmount("");
  };

  const clearFeedback = () => {
    setError("");
    setMessage("");
  };

  const reloadOrder = useCallback(async () => {
    applyOrder(await orderApi.get(orderNumber, authToken));
  }, [authToken, orderNumber]);

  useEffect(() => {
    async function loadOrder() {
      try {
        setIsLoading(true);
        clearFeedback();
        applyOrder(await orderApi.get(orderNumber, authToken));
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Unable to load order.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadOrder();
  }, [authToken, orderNumber]);

  useEffect(() => {
    const checkoutSessionId = new URLSearchParams(window.location.search).get("checkout_session_id");
    if (!checkoutSessionId) {
      return;
    }
    const sessionId = checkoutSessionId;

    async function confirmPayment() {
      try {
        applyOrder(await orderApi.confirmCheckout(orderNumber, sessionId));
        setMessage("Payment confirmed.");
        window.history.replaceState({}, "", `/order/${orderNumber}`);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Unable to confirm payment.");
      }
    }

    void confirmPayment();
  }, [orderNumber]);

  useEffect(() => {
    if (!order?.paymentPending) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      void reloadOrder();
    }, 3000);
    return () => window.clearTimeout(timeoutId);
  }, [order?.paymentPending, reloadOrder]);

  useEffect(() => {
    if (!pendingEmailCommentIds.length) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void reloadOrder();
    }, 1500);

    return () => window.clearTimeout(timeoutId);
  }, [pendingEmailCommentIds, reloadOrder]);

  const ownRole = viewerIsAdmin ? "admin" : "customer";

  const editableCommentIds = new Set((order?.comments ?? []).filter((comment) => comment.authorRole === ownRole).map((comment) => comment.id));

  const handleCommentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextBody = commentBody.trim();
    if (!nextBody || !order) {
      return;
    }
    const tempCommentId = -Date.now();
    const now = new Date().toISOString();
    const tempComment = {
      id: tempCommentId,
      authorRole: ownRole,
      body: nextBody,
      emailSentAt: null,
      emailError: null,
      createdAt: now,
      updatedAt: now,
    };

    try {
      clearFeedback();
      setCommentSubmitError("");
      setIsSubmittingComment(true);
      setOrder((current) => current ? { ...current, comments: [...current.comments, tempComment] } : current);
      setCommentBody("");
      const savedComment = await orderApi.createComment(orderNumber, nextBody, authToken);
      setOrder((current) => current ? {
        ...current,
        comments: current.comments.map((comment) => comment.id === tempCommentId ? savedComment : comment),
      } : current);
      setPendingEmailCommentIds((current) => [...current, savedComment.id]);
    } catch (nextError) {
      setOrder((current) => current ? {
        ...current,
        comments: current.comments.filter((comment) => comment.id !== tempCommentId),
      } : current);
      setCommentBody(nextBody);
      setCommentSubmitError(nextError instanceof Error ? nextError.message : "Unable to add comment.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleCommentSave = async (commentId: number) => {
    try {
      clearFeedback();
      await orderApi.updateComment(orderNumber, commentId, editingBody, authToken);
      setEditingCommentId(null);
      setEditingBody("");
      await reloadOrder();
      setMessage("Comment updated.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to update comment.");
    }
  };

  const handleCommentDelete = async (commentId: number) => {
    try {
      clearFeedback();
      await orderApi.deleteComment(orderNumber, commentId, authToken);
      await reloadOrder();
      setMessage("Comment deleted.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to delete comment.");
    }
  };

  const handleDecline = async () => {
    try {
      clearFeedback();
      const nextOrder = viewerIsAdmin ? await orderApi.declineAdmin(token, orderNumber) : await orderApi.decline(orderNumber);
      applyOrder(nextOrder);
      setMessage("Order declined.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to decline order.");
    }
  };

  const handleCreateCheckout = async () => {
    try {
      clearFeedback();
      const response = isGalleryInquiry ? await orderApi.createGalleryInquiryCheckout(orderNumber) : await orderApi.createCheckout(orderNumber);
      window.location.href = response.url;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to start checkout.");
    }
  };

  const handleQuote = async () => {
    try {
      clearFeedback();
      const nextOrder = await orderApi.setQuote(token, orderNumber, quoteAmount);
      applyOrder(nextOrder);
      setMessage("Quote saved.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to save quote.");
    }
  };

  const handleStatusUpdate = async (status: string) => {
    try {
      clearFeedback();
      const nextOrder = await orderApi.updateStatus(token, orderNumber, status);
      applyOrder(nextOrder);
      setMessage("Status updated.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to update status.");
    }
  };

  const handleConfirmReceived = async () => {
    try {
      clearFeedback();
      const nextOrder = await orderApi.confirmReceived(orderNumber);
      applyOrder(nextOrder);
      setIsConfirmingReceived(false);
      setMessage("Receipt confirmed.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to confirm receipt.");
    }
  };

  const handleReviewSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextBody = reviewBody.trim();
    if (!nextBody) {
      setReviewError("Review text is required.");
      return;
    }
    try {
      clearFeedback();
      setReviewError("");
      setIsSubmittingReview(true);
      const nextOrder = await orderApi.submitReview(orderNumber, Number(reviewRating), nextBody);
      applyOrder(nextOrder);
      setReviewBody("");
      setReviewRating("5");
      setMessage(nextOrder.review?.discountAwarded ? "Review submitted. Your 10% reward code is below." : "Review submitted.");
    } catch (nextError) {
      setReviewError(nextError instanceof Error ? nextError.message : "Unable to submit review.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (isLoading) {
    return <p style={{ margin: 0, color: "var(--muted)" }}>Loading order...</p>;
  }

  if (!order) {
    return <p style={{ margin: 0, color: "var(--danger)" }}>Order not found.</p>;
  }

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <button type="button" onClick={onBackHome} style={{ justifySelf: "start", border: 0, background: "transparent", color: "var(--text-dark)", padding: 0, fontWeight: 700 }}>Back home</button>
      <div style={{ display: "grid", gap: 8, maxWidth: 680 }}>
        <p style={{ margin: 0, color: "var(--leaf-700)", fontSize: "0.82rem", fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase" }}>Order {order.orderNumber}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <h2 style={{ margin: 0, color: "var(--text-dark)", fontFamily: "var(--serif)", fontSize: "clamp(1.6rem, 4vw, 2.2rem)", fontWeight: 500 }}>{order.customerName}</h2>
          {order.customerConfirmedAt ? (
            <span title="Customer confirmed receipt" aria-label="Customer confirmed receipt" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 28, height: 28, borderRadius: 999, background: "rgba(47, 133, 90, 0.16)", color: "var(--success)", fontWeight: 900 }}>
              ✓
            </span>
          ) : null}
        </div>
      </div>
      <div style={{ display: "grid", gap: 8, padding: 16, border: "1px solid var(--line)", borderRadius: 8, background: "var(--bg-panel)", boxShadow: "0 10px 30px rgba(31, 51, 40, 0.08)" }}>
        <p style={{ margin: 0 }}>Status: <strong>{order.status}</strong></p>
        <p style={{ margin: 0 }}>{isGalleryOrder || isGalleryInquiry ? "Artwork" : "Service"}: {order.categoryName}</p>
        {!isGalleryInquiry ? <p style={{ margin: 0 }}>Email: {order.customerEmail}</p> : null}
        {!isGalleryOrder && !isGalleryInquiry ? <p style={{ margin: 0 }}>Phone: {order.customerPhone}</p> : null}
        {!isGalleryOrder && !isGalleryInquiry ? <p style={{ margin: 0 }}>Medium: {order.medium}</p> : null}
        {!isGalleryOrder && !isGalleryInquiry ? <p style={{ margin: 0 }}>Size: {order.size}</p> : null}
        {!isGalleryOrder && !isGalleryInquiry ? <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.5 }}>{order.instructions}</p> : null}
        <p style={{ margin: 0 }}>{isGalleryOrder || isGalleryInquiry ? "Amount" : "Quote"}: {formatCurrency(order.quoteAmountCents)}</p>
        {order.appliedReviewDiscountCents > 0 ? <p style={{ margin: 0, color: "var(--success)" }}>Review discount: -{formatCurrency(order.appliedReviewDiscountCents)}</p> : null}
        {order.payableAmountCents !== null ? <p style={{ margin: 0, fontWeight: 700 }}>{order.paymentPending || order.status === "accepted" || order.status === "in_progress" || order.status === "shipped" || order.status === "delivered" ? "Paid total" : "Total due"}: {formatCurrency(order.payableAmountCents)}</p> : null}
        {!viewerIsAdmin && (order.status === "quoted" || isGalleryInquiry) ? <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.95rem" }}>Enter a 10% review reward code in Stripe Checkout when you have one.</p> : null}
        {(isGalleryOrder || isGalleryInquiry) && order.galleryImageUrl ? <img src={order.galleryImageUrl} alt={order.categoryName} style={{ display: "block", width: "min(100%, 420px)", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 8, background: "var(--linen)" }} /> : null}
        {order.files.length ? (
          <div style={{ display: "grid", gap: 8 }}>
            <p style={{ margin: 0, fontWeight: 700 }}>{isGalleryOrder || isGalleryInquiry ? "Artwork" : "Reference images"}</p>
            {order.files.map((file) => <a key={file.id} href={file.fileUrl} target="_blank" rel="noreferrer">{file.fileName}</a>)}
          </div>
        ) : null}
        {isGalleryOrder ? (
          <div style={{ display: "grid", gap: 4 }}>
            <p style={{ margin: 0, fontWeight: 700 }}>Shipping</p>
            <p style={{ margin: 0 }}>{order.shippingName || order.customerName}</p>
            {order.shippingLine1 ? <p style={{ margin: 0 }}>{order.shippingLine1}</p> : null}
            {order.shippingLine2 ? <p style={{ margin: 0 }}>{order.shippingLine2}</p> : null}
            {(order.shippingCity || order.shippingState || order.shippingPostalCode) ? <p style={{ margin: 0 }}>{[order.shippingCity, order.shippingState, order.shippingPostalCode].filter(Boolean).join(", ")}</p> : null}
            {order.shippingCountry ? <p style={{ margin: 0 }}>{order.shippingCountry}</p> : null}
          </div>
        ) : null}
        {isGalleryOrder && order.paymentPending ? <p style={{ margin: 0, color: "var(--muted)" }}>Payment is still processing. This page will refresh automatically.</p> : null}
        {order.customerConfirmedAt ? <p style={{ margin: 0, color: "var(--success)" }}>Customer confirmed receipt on {new Date(order.customerConfirmedAt).toLocaleString()}.</p> : null}
      </div>

      {!viewerIsAdmin && !isGalleryOrder && !isGalleryInquiry && order.status === "quoted" ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <button type="button" onClick={() => void handleDecline()} style={{ border: "1px solid rgba(63, 95, 72, 0.34)", borderRadius: 8, padding: "14px 16px", background: "rgba(255, 253, 248, 0.82)", color: "var(--danger)", fontWeight: 800 }}>Decline quote</button>
          <button type="button" onClick={() => void handleCreateCheckout()} style={{ border: "1px solid var(--leaf-800)", borderRadius: 8, padding: "14px 16px", background: "var(--leaf-800)", color: "var(--text-light)", fontWeight: 800, boxShadow: "0 12px 28px rgba(31, 51, 40, 0.18)" }}>Pay quote</button>
        </div>
      ) : null}
      {!viewerIsAdmin && isGalleryInquiry && order.quoteAmountCents !== null ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <button type="button" onClick={() => void handleCreateCheckout()} style={{ border: "1px solid var(--leaf-800)", borderRadius: 8, padding: "14px 16px", background: "var(--leaf-800)", color: "var(--text-light)", fontWeight: 800, boxShadow: "0 12px 28px rgba(31, 51, 40, 0.18)" }}>Buy artwork</button>
        </div>
      ) : null}
      {!viewerIsAdmin && !isGalleryInquiry && order.status === "delivered" && !order.customerConfirmedAt ? (
        <div style={{ display: "grid", gap: 12, padding: 16, border: "1px solid var(--line)", borderRadius: 8, background: "var(--bg-panel)", boxShadow: "0 10px 30px rgba(31, 51, 40, 0.08)" }}>
          <p style={{ margin: 0, fontWeight: 700 }}>Did you receive this order?</p>
          {isConfirmingReceived ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
              <button type="button" onClick={() => void handleConfirmReceived()} style={{ border: "1px solid var(--leaf-800)", borderRadius: 8, padding: "14px 16px", background: "var(--leaf-800)", color: "var(--text-light)", fontWeight: 800, boxShadow: "0 12px 28px rgba(31, 51, 40, 0.18)" }}>Yes, confirm</button>
              <button type="button" onClick={() => setIsConfirmingReceived(false)} style={{ border: "1px solid rgba(63, 95, 72, 0.34)", borderRadius: 8, padding: "14px 16px", background: "rgba(255, 253, 248, 0.82)", color: "var(--text-dark)", fontWeight: 800 }}>No</button>
            </div>
          ) : (
            <button type="button" onClick={() => setIsConfirmingReceived(true)} style={{ justifySelf: "start", border: "1px solid var(--leaf-800)", borderRadius: 8, padding: "14px 16px", background: "var(--leaf-800)", color: "var(--text-light)", fontWeight: 800, boxShadow: "0 12px 28px rgba(31, 51, 40, 0.18)" }}>Confirm received</button>
          )}
        </div>
      ) : null}

      {viewerIsAdmin ? (
        <div style={{ display: "grid", gap: 12, padding: 16, border: "1px solid var(--line)", borderRadius: 8, background: "var(--bg-panel)", boxShadow: "0 10px 30px rgba(31, 51, 40, 0.08)" }}>
          <p style={{ margin: 0, color: "var(--text-dark)", fontFamily: "var(--serif)", fontWeight: 700 }}>Admin controls</p>
          {!isGalleryOrder && !isGalleryInquiry ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
              <input value={quoteAmount} onChange={(event) => setQuoteAmount(event.target.value)} placeholder="Quote amount" style={{ flex: "1 1 180px", padding: 14, border: "1px solid rgba(63, 95, 72, 0.28)", borderRadius: 8, background: "rgba(255, 253, 248, 0.94)", color: "var(--text-dark)", fontSize: "1rem" }} />
              <button type="button" onClick={() => void handleQuote()} style={{ border: "1px solid var(--leaf-800)", borderRadius: 8, padding: "14px 16px", background: "var(--leaf-800)", color: "var(--text-light)", fontWeight: 800, boxShadow: "0 12px 28px rgba(31, 51, 40, 0.18)" }}>Save quote</button>
              <button type="button" onClick={() => void handleDecline()} style={{ border: "1px solid rgba(63, 95, 72, 0.34)", borderRadius: 8, padding: "14px 16px", background: "rgba(255, 253, 248, 0.82)", color: "var(--danger)", fontWeight: 800 }}>Decline order</button>
              {order.status !== "accepted" ? <button type="button" onClick={() => void handleStatusUpdate("accepted")} style={{ border: "1px solid rgba(63, 95, 72, 0.34)", borderRadius: 8, padding: "14px 16px", background: "rgba(255, 253, 248, 0.82)", color: "var(--text-dark)", fontWeight: 800 }}>Mark accepted</button> : null}
            </div>
          ) : null}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
            <button type="button" onClick={() => void handleStatusUpdate("in_progress")} style={{ border: "1px solid rgba(63, 95, 72, 0.34)", borderRadius: 8, padding: "10px 12px", background: "rgba(255, 253, 248, 0.82)", color: "var(--text-dark)", fontWeight: 800 }}>Mark in progress</button>
            <button type="button" onClick={() => void handleStatusUpdate("shipped")} style={{ border: "1px solid rgba(63, 95, 72, 0.34)", borderRadius: 8, padding: "10px 12px", background: "rgba(255, 253, 248, 0.82)", color: "var(--text-dark)", fontWeight: 800 }}>Mark shipped</button>
            <button type="button" onClick={() => void handleStatusUpdate("delivered")} style={{ border: "1px solid rgba(63, 95, 72, 0.34)", borderRadius: 8, padding: "10px 12px", background: "rgba(255, 253, 248, 0.82)", color: "var(--text-dark)", fontWeight: 800 }}>Mark delivered</button>
          </div>
        </div>
      ) : null}

      {(!isGalleryOrder || !order.paymentPending) ? <section style={{ display: "grid", gap: 12, padding: 16, border: "1px solid var(--line)", borderRadius: 8, background: "var(--bg-panel)", boxShadow: "0 10px 30px rgba(31, 51, 40, 0.08)" }}>
        <p style={{ margin: 0, color: "var(--text-dark)", fontFamily: "var(--serif)", fontWeight: 700 }}>Comments</p>
        {order.comments.map((comment) => (
          <article key={comment.id} id={`comment-${comment.id}`} style={{ display: "grid", gap: 8, padding: 12, border: "1px solid var(--line)", borderRadius: 8, background: comment.authorRole === "admin" ? "var(--bg-navbar)" : "var(--bg-panel)" }}>
            <p style={{ margin: 0, fontWeight: 700 }}>{comment.authorRole === "admin" ? "Admin" : "Customer"} comment</p>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.85rem" }}>{new Date(comment.updatedAt).toLocaleString()}</p>
            {editingCommentId === comment.id ? (
              <div style={{ display: "grid", gap: 8 }}>
                <textarea value={editingBody} onChange={(event) => setEditingBody(event.target.value)} rows={4} style={{ width: "100%", padding: 14, border: "1px solid rgba(63, 95, 72, 0.28)", borderRadius: 8, background: "rgba(255, 253, 248, 0.94)", color: "var(--text-dark)", fontSize: "1rem", resize: "vertical" }} />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                  <button type="button" onClick={() => void handleCommentSave(comment.id)} style={{ border: "1px solid var(--leaf-800)", borderRadius: 8, padding: "10px 12px", background: "var(--leaf-800)", color: "var(--text-light)", fontWeight: 800 }}>Save comment</button>
                  <button type="button" onClick={() => { setEditingCommentId(null); setEditingBody(""); }} style={{ border: "1px solid rgba(63, 95, 72, 0.34)", borderRadius: 8, padding: "10px 12px", background: "rgba(255, 253, 248, 0.82)", color: "var(--text-dark)", fontWeight: 800 }}>Cancel</button>
                </div>
              </div>
            ) : <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.5 }}>{comment.body}</p>}
            {"emailError" in comment && comment.emailError ? <p style={{ margin: 0, color: "var(--danger)", fontSize: "0.85rem" }}>{comment.emailError}</p> : null}
            {"emailSentAt" in comment && comment.emailSentAt ? <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.85rem" }}>Email has been sent.</p> : null}
            {comment.id < 0 ? <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.85rem" }}>Saving...</p> : null}
            {comment.id > 0 && editableCommentIds.has(comment.id) && editingCommentId !== comment.id ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                <button type="button" onClick={() => { setEditingCommentId(comment.id); setEditingBody(comment.body); }} style={{ border: "1px solid rgba(63, 95, 72, 0.34)", borderRadius: 8, padding: "10px 12px", background: "rgba(255, 253, 248, 0.82)", color: "var(--text-dark)", fontWeight: 800 }}>Edit</button>
                <button type="button" onClick={() => void handleCommentDelete(comment.id)} style={{ border: "1px solid rgba(63, 95, 72, 0.34)", borderRadius: 8, padding: "10px 12px", background: "rgba(255, 253, 248, 0.82)", color: "var(--danger)", fontWeight: 800 }}>Delete</button>
              </div>
            ) : null}
          </article>
        ))}
        <form onSubmit={handleCommentSubmit} style={{ display: "grid", gap: 12 }}>
          <textarea value={commentBody} onChange={(event) => setCommentBody(event.target.value)} placeholder={viewerIsAdmin ? "Add an admin comment" : "Add a customer comment"} rows={4} style={{ width: "100%", padding: 14, border: "1px solid rgba(63, 95, 72, 0.28)", borderRadius: 8, background: "rgba(255, 253, 248, 0.94)", color: "var(--text-dark)", fontSize: "1rem", resize: "vertical" }} />
          {commentSubmitError ? <p style={{ margin: 0, color: "var(--danger)", fontSize: "0.9rem" }}>{commentSubmitError}</p> : null}
          <button type="submit" disabled={isSubmittingComment} style={{ border: "1px solid var(--leaf-800)", borderRadius: 8, padding: "14px 16px", background: "var(--leaf-800)", color: "var(--text-light)", fontWeight: 800, boxShadow: "0 12px 28px rgba(31, 51, 40, 0.18)" }}>{isSubmittingComment ? "Posting..." : "Add comment"}</button>
        </form>
      </section> : null}

      {!viewerIsAdmin && !isGalleryInquiry && order.status === "delivered" ? (
        <section style={{ display: "grid", gap: 12, padding: 16, border: "1px solid var(--line)", borderRadius: 8, background: "var(--bg-panel)", boxShadow: "0 10px 30px rgba(31, 51, 40, 0.08)" }}>
          <p style={{ margin: 0, color: "var(--text-dark)", fontFamily: "var(--serif)", fontWeight: 700 }}>Leave a review</p>
          {order.review ? (
            <article style={{ display: "grid", gap: 8, padding: 12, border: "1px solid var(--line)", borderRadius: 8, background: "var(--bg-panel)" }}>
              <p style={{ margin: 0, fontWeight: 700 }}>{"★".repeat(order.review.rating)}{"☆".repeat(5 - order.review.rating)}</p>
              <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.5 }}>{order.review.body}</p>
              {order.review.discountAwarded && order.review.discountCode ? <p style={{ margin: 0, color: "var(--success)", fontSize: "0.9rem" }}>Your 10% reward code: <strong>{order.review.discountCode}</strong>. Enter it in Stripe Checkout.</p> : null}
            </article>
          ) : order.canLeaveReview ? (
            <form onSubmit={handleReviewSubmit} style={{ display: "grid", gap: 12 }}>
              <p style={{ margin: 0, color: "var(--muted)" }}>
                {order.reviewDiscountEligible ? "Leave a review to earn 10% off your next purchase." : "Leave a review about this order."}
              </p>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ color: "var(--muted)" }}>Stars</span>
                <select value={reviewRating} onChange={(event) => setReviewRating(event.target.value)} style={{ width: "100%", padding: 14, border: "1px solid rgba(63, 95, 72, 0.28)", borderRadius: 8, background: "rgba(255, 253, 248, 0.94)", color: "var(--text-dark)", fontSize: "1rem" }}>
                  <option value="5">5 stars</option>
                  <option value="4">4 stars</option>
                  <option value="3">3 stars</option>
                  <option value="2">2 stars</option>
                  <option value="1">1 star</option>
                </select>
              </label>
              <textarea value={reviewBody} onChange={(event) => setReviewBody(event.target.value)} placeholder="Write your review" rows={4} style={{ width: "100%", padding: 14, border: "1px solid rgba(63, 95, 72, 0.28)", borderRadius: 8, background: "rgba(255, 253, 248, 0.94)", color: "var(--text-dark)", fontSize: "1rem", resize: "vertical" }} />
              {reviewError ? <p style={{ margin: 0, color: "var(--danger)", fontSize: "0.9rem" }}>{reviewError}</p> : null}
              <button type="submit" disabled={isSubmittingReview} style={{ border: "1px solid var(--leaf-800)", borderRadius: 8, padding: "14px 16px", background: "var(--leaf-800)", color: "var(--text-light)", fontWeight: 800, boxShadow: "0 12px 28px rgba(31, 51, 40, 0.18)" }}>{isSubmittingReview ? "Submitting..." : "Submit review"}</button>
            </form>
          ) : null}
        </section>
      ) : null}

      {error ? <p style={{ margin: 0, color: "var(--danger)" }}>{error}</p> : null}
      {message ? <p style={{ margin: 0, color: "var(--success)" }}>{message}</p> : null}
    </section>
  );
}
