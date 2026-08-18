import { FormEvent, useEffect, useState } from "react";

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
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [quoteAmount, setQuoteAmount] = useState("");
  const authToken = token || undefined;

  const viewerIsAdmin = Boolean(order?.viewerIsAdmin);
  const isGalleryOrder = order?.orderKind === "gallery";

  const applyOrder = (nextOrder: Order) => {
    setOrder(nextOrder);
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

  const reloadOrder = async () => {
    applyOrder(await orderApi.get(orderNumber, authToken));
  };

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
  }, [order?.paymentPending]);

  const ownRole = viewerIsAdmin ? "admin" : "customer";

  const editableCommentIds = new Set((order?.comments ?? []).filter((comment) => comment.authorRole === ownRole).map((comment) => comment.id));

  const handleCommentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      clearFeedback();
      await orderApi.createComment(orderNumber, commentBody, authToken);
      setCommentBody("");
      await reloadOrder();
      setMessage("Comment added.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to add comment.");
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
      const response = await orderApi.createCheckout(orderNumber);
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

  if (isLoading) {
    return <p style={{ margin: 0, color: "var(--muted)" }}>Loading order...</p>;
  }

  if (!order) {
    return <p style={{ margin: 0, color: "var(--danger)" }}>Order not found.</p>;
  }

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <button type="button" onClick={onBackHome} style={{ justifySelf: "start", border: 0, background: "transparent", color: "var(--leaf-800)", padding: 0, fontWeight: 700 }}>Back home</button>
      <div style={{ display: "grid", gap: 8, maxWidth: 680 }}>
        <p style={{ margin: 0, color: "var(--leaf-700)", fontSize: "0.82rem", fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase" }}>Order {order.orderNumber}</p>
        <h2 style={{ margin: 0, color: "var(--leaf-800)", fontFamily: "var(--serif)", fontSize: "clamp(1.6rem, 4vw, 2.2rem)", fontWeight: 500 }}>{order.customerName}</h2>
      </div>
      <div style={{ display: "grid", gap: 8, padding: 16, border: "1px solid var(--line)", borderRadius: 8, background: "rgba(255, 253, 248, 0.86)", boxShadow: "0 10px 30px rgba(31, 51, 40, 0.08)" }}>
        <p style={{ margin: 0 }}>Status: <strong>{order.status}</strong></p>
        <p style={{ margin: 0 }}>Category: {order.categoryName}</p>
        <p style={{ margin: 0 }}>Email: {order.customerEmail}</p>
        {!isGalleryOrder ? <p style={{ margin: 0 }}>Phone: {order.customerPhone}</p> : null}
        {!isGalleryOrder ? <p style={{ margin: 0 }}>Medium: {order.medium}</p> : null}
        {!isGalleryOrder ? <p style={{ margin: 0 }}>Size: {order.size}</p> : null}
        {!isGalleryOrder ? <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.5 }}>{order.instructions}</p> : null}
        <p style={{ margin: 0 }}>{isGalleryOrder ? "Amount" : "Quote"}: {formatCurrency(order.quoteAmountCents)}</p>
        {isGalleryOrder && order.galleryImageUrl ? <img src={order.galleryImageUrl} alt={order.categoryName} style={{ display: "block", width: "min(100%, 420px)", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 8, background: "var(--linen)" }} /> : null}
        {order.files.length ? (
          <div style={{ display: "grid", gap: 8 }}>
            <p style={{ margin: 0, fontWeight: 700 }}>{isGalleryOrder ? "Artwork" : "Reference images"}</p>
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
      </div>

      {!viewerIsAdmin && !isGalleryOrder && order.status === "quoted" ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <button type="button" onClick={() => void handleDecline()} style={{ border: "1px solid rgba(63, 95, 72, 0.34)", borderRadius: 8, padding: "14px 16px", background: "rgba(255, 253, 248, 0.82)", color: "var(--danger)", fontWeight: 800 }}>Decline quote</button>
          <button type="button" onClick={() => void handleCreateCheckout()} style={{ border: "1px solid var(--leaf-800)", borderRadius: 8, padding: "14px 16px", background: "var(--leaf-800)", color: "var(--paper)", fontWeight: 800, boxShadow: "0 12px 28px rgba(31, 51, 40, 0.18)" }}>Pay quote</button>
        </div>
      ) : null}

      {viewerIsAdmin ? (
        <div style={{ display: "grid", gap: 12, padding: 16, border: "1px solid var(--line)", borderRadius: 8, background: "rgba(255, 253, 248, 0.86)", boxShadow: "0 10px 30px rgba(31, 51, 40, 0.08)" }}>
          <p style={{ margin: 0, color: "var(--leaf-800)", fontFamily: "var(--serif)", fontWeight: 700 }}>Admin controls</p>
          {!isGalleryOrder ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
              <input value={quoteAmount} onChange={(event) => setQuoteAmount(event.target.value)} placeholder="Quote amount" style={{ flex: "1 1 180px", padding: 14, border: "1px solid rgba(63, 95, 72, 0.28)", borderRadius: 8, background: "rgba(255, 253, 248, 0.94)", color: "var(--ink)", fontSize: "1rem" }} />
              <button type="button" onClick={() => void handleQuote()} style={{ border: "1px solid var(--leaf-800)", borderRadius: 8, padding: "14px 16px", background: "var(--leaf-800)", color: "var(--paper)", fontWeight: 800, boxShadow: "0 12px 28px rgba(31, 51, 40, 0.18)" }}>Save quote</button>
              <button type="button" onClick={() => void handleDecline()} style={{ border: "1px solid rgba(63, 95, 72, 0.34)", borderRadius: 8, padding: "14px 16px", background: "rgba(255, 253, 248, 0.82)", color: "var(--danger)", fontWeight: 800 }}>Decline order</button>
              {order.status !== "accepted" ? <button type="button" onClick={() => void handleStatusUpdate("accepted")} style={{ border: "1px solid rgba(63, 95, 72, 0.34)", borderRadius: 8, padding: "14px 16px", background: "rgba(255, 253, 248, 0.82)", color: "var(--leaf-900)", fontWeight: 800 }}>Mark accepted</button> : null}
            </div>
          ) : null}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
            <button type="button" onClick={() => void handleStatusUpdate("in_progress")} style={{ border: "1px solid rgba(63, 95, 72, 0.34)", borderRadius: 8, padding: "10px 12px", background: "rgba(255, 253, 248, 0.82)", color: "var(--leaf-900)", fontWeight: 800 }}>Mark in progress</button>
            <button type="button" onClick={() => void handleStatusUpdate("shipped")} style={{ border: "1px solid rgba(63, 95, 72, 0.34)", borderRadius: 8, padding: "10px 12px", background: "rgba(255, 253, 248, 0.82)", color: "var(--leaf-900)", fontWeight: 800 }}>Mark shipped</button>
            <button type="button" onClick={() => void handleStatusUpdate("delivered")} style={{ border: "1px solid rgba(63, 95, 72, 0.34)", borderRadius: 8, padding: "10px 12px", background: "rgba(255, 253, 248, 0.82)", color: "var(--leaf-900)", fontWeight: 800 }}>Mark delivered</button>
          </div>
        </div>
      ) : null}

      {!isGalleryOrder ? <section style={{ display: "grid", gap: 12, padding: 16, border: "1px solid var(--line)", borderRadius: 8, background: "rgba(255, 253, 248, 0.86)", boxShadow: "0 10px 30px rgba(31, 51, 40, 0.08)" }}>
        <p style={{ margin: 0, color: "var(--leaf-800)", fontFamily: "var(--serif)", fontWeight: 700 }}>Comments</p>
        {order.comments.map((comment) => (
          <article key={comment.id} id={`comment-${comment.id}`} style={{ display: "grid", gap: 8, padding: 12, border: "1px solid var(--line)", borderRadius: 8, background: comment.authorRole === "admin" ? "rgba(247, 241, 231, 0.92)" : "rgba(255, 253, 248, 0.86)" }}>
            <p style={{ margin: 0, fontWeight: 700 }}>{comment.authorRole === "admin" ? "Admin" : "Customer"} comment</p>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.85rem" }}>{new Date(comment.updatedAt).toLocaleString()}</p>
            {editingCommentId === comment.id ? (
              <div style={{ display: "grid", gap: 8 }}>
                <textarea value={editingBody} onChange={(event) => setEditingBody(event.target.value)} rows={4} style={{ width: "100%", padding: 14, border: "1px solid rgba(63, 95, 72, 0.28)", borderRadius: 8, background: "rgba(255, 253, 248, 0.94)", color: "var(--ink)", fontSize: "1rem", resize: "vertical" }} />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                  <button type="button" onClick={() => void handleCommentSave(comment.id)} style={{ border: "1px solid var(--leaf-800)", borderRadius: 8, padding: "10px 12px", background: "var(--leaf-800)", color: "var(--paper)", fontWeight: 800 }}>Save comment</button>
                  <button type="button" onClick={() => { setEditingCommentId(null); setEditingBody(""); }} style={{ border: "1px solid rgba(63, 95, 72, 0.34)", borderRadius: 8, padding: "10px 12px", background: "rgba(255, 253, 248, 0.82)", color: "var(--leaf-900)", fontWeight: 800 }}>Cancel</button>
                </div>
              </div>
            ) : <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.5 }}>{comment.body}</p>}
            {editableCommentIds.has(comment.id) && editingCommentId !== comment.id ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                <button type="button" onClick={() => { setEditingCommentId(comment.id); setEditingBody(comment.body); }} style={{ border: "1px solid rgba(63, 95, 72, 0.34)", borderRadius: 8, padding: "10px 12px", background: "rgba(255, 253, 248, 0.82)", color: "var(--leaf-900)", fontWeight: 800 }}>Edit</button>
                <button type="button" onClick={() => void handleCommentDelete(comment.id)} style={{ border: "1px solid rgba(63, 95, 72, 0.34)", borderRadius: 8, padding: "10px 12px", background: "rgba(255, 253, 248, 0.82)", color: "var(--danger)", fontWeight: 800 }}>Delete</button>
              </div>
            ) : null}
          </article>
        ))}
        <form onSubmit={handleCommentSubmit} style={{ display: "grid", gap: 12 }}>
          <textarea value={commentBody} onChange={(event) => setCommentBody(event.target.value)} placeholder={viewerIsAdmin ? "Add an admin comment" : "Add a customer comment"} rows={4} style={{ width: "100%", padding: 14, border: "1px solid rgba(63, 95, 72, 0.28)", borderRadius: 8, background: "rgba(255, 253, 248, 0.94)", color: "var(--ink)", fontSize: "1rem", resize: "vertical" }} />
          <button type="submit" style={{ border: "1px solid var(--leaf-800)", borderRadius: 8, padding: "14px 16px", background: "var(--leaf-800)", color: "var(--paper)", fontWeight: 800, boxShadow: "0 12px 28px rgba(31, 51, 40, 0.18)" }}>Add comment</button>
        </form>
      </section> : null}

      {error ? <p style={{ margin: 0, color: "var(--danger)" }}>{error}</p> : null}
      {message ? <p style={{ margin: 0, color: "var(--success)" }}>{message}</p> : null}
    </section>
  );
}
