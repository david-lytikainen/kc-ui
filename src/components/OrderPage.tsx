import { FormEvent, useEffect, useMemo, useState } from "react";

import { Order, OrderComment, orderApi, User } from "../api";


type OrderPageProps = {
  orderNumber: string;
  token: string;
  user: User | null;
  onBackHome: () => void;
};


function formatCurrency(cents: number | null) {
  if (cents === null) {
    return "Not quoted yet";
  }

  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}


export default function OrderPage({ orderNumber, token, user, onBackHome }: OrderPageProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [quoteAmount, setQuoteAmount] = useState("");

  const viewerIsAdmin = Boolean(user && token && order?.viewerIsAdmin);

  const reloadOrder = async () => {
    setOrder(await orderApi.get(orderNumber, token || undefined));
  };

  useEffect(() => {
    async function loadOrder() {
      try {
        setIsLoading(true);
        setError("");
        setMessage("");
        const nextOrder = await orderApi.get(orderNumber, token || undefined);
        setOrder(nextOrder);
        if (nextOrder.quoteAmountCents !== null) {
          setQuoteAmount((nextOrder.quoteAmountCents / 100).toFixed(2));
        }
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Unable to load order.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadOrder();
  }, [orderNumber, token]);

  useEffect(() => {
    const checkoutSessionId = new URLSearchParams(window.location.search).get("checkout_session_id");
    if (!checkoutSessionId) {
      return;
    }

    async function confirmPayment() {
      try {
        const nextOrder = await orderApi.confirmCheckout(orderNumber, checkoutSessionId);
        setOrder(nextOrder);
        setMessage("Payment confirmed.");
        window.history.replaceState({}, "", `/order/${orderNumber}`);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Unable to confirm payment.");
      }
    }

    void confirmPayment();
  }, [orderNumber]);

  const ownRole = viewerIsAdmin ? "admin" : "customer";

  const editableCommentIds = useMemo(() => new Set((order?.comments ?? []).filter((comment) => comment.authorRole === ownRole).map((comment) => comment.id)), [order?.comments, ownRole]);

  const handleCommentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setError("");
      setMessage("");
      await orderApi.createComment(orderNumber, commentBody, token || undefined);
      setCommentBody("");
      await reloadOrder();
      setMessage("Comment added.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to add comment.");
    }
  };

  const handleCommentSave = async (commentId: number) => {
    try {
      setError("");
      setMessage("");
      await orderApi.updateComment(orderNumber, commentId, editingBody, token || undefined);
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
      setError("");
      setMessage("");
      await orderApi.deleteComment(orderNumber, commentId, token || undefined);
      await reloadOrder();
      setMessage("Comment deleted.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to delete comment.");
    }
  };

  const handleCommentEmail = async (comment: OrderComment) => {
    try {
      setError("");
      setMessage("");
      await orderApi.sendCommentEmail(orderNumber, comment.id, token || undefined);
      await reloadOrder();
      setMessage("Email sent.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to send email.");
    }
  };

  const handleDecline = async () => {
    try {
      setError("");
      setMessage("");
      const nextOrder = viewerIsAdmin ? await orderApi.declineAdmin(token, orderNumber) : await orderApi.decline(orderNumber);
      setOrder(nextOrder);
      setMessage("Order declined.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to decline order.");
    }
  };

  const handleCreateCheckout = async () => {
    try {
      setError("");
      const response = await orderApi.createCheckout(orderNumber);
      window.location.href = response.url;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to start checkout.");
    }
  };

  const handleQuote = async () => {
    try {
      setError("");
      setMessage("");
      const nextOrder = await orderApi.setQuote(token, orderNumber, quoteAmount);
      setOrder(nextOrder);
      setMessage("Quote saved.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to save quote.");
    }
  };

  const handleStatusUpdate = async (status: string) => {
    try {
      setError("");
      setMessage("");
      const nextOrder = await orderApi.updateStatus(token, orderNumber, status);
      setOrder(nextOrder);
      setMessage("Status updated.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to update status.");
    }
  };

  if (isLoading) {
    return <p style={{ margin: 0, color: "#6a4b43" }}>Loading order...</p>;
  }

  if (!order) {
    return <p style={{ margin: 0, color: "#8f2d1d" }}>Order not found.</p>;
  }

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <button type="button" onClick={onBackHome} style={{ justifySelf: "start", border: "none", background: "transparent", padding: 0, color: "#6a4b43", fontWeight: 700, cursor: "pointer" }}>Back home</button>
      <div>
        <p style={{ margin: 0, fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", color: "#9c6f63" }}>Order {order.orderNumber}</p>
        <h2 style={{ margin: "8px 0 0", fontSize: "1.5rem" }}>{order.customerName}</h2>
      </div>
      <div style={{ display: "grid", gap: 8, padding: 16, border: "1px solid #ead9d2", borderRadius: 14, background: "#ffffff" }}>
        <p style={{ margin: 0 }}>Status: <strong>{order.status}</strong></p>
        <p style={{ margin: 0 }}>Category: {order.categoryName}</p>
        <p style={{ margin: 0 }}>Medium: {order.medium}</p>
        <p style={{ margin: 0 }}>Size: {order.size}</p>
        <p style={{ margin: 0 }}>Phone: {order.customerPhone}</p>
        <p style={{ margin: 0 }}>Email: {order.customerEmail}</p>
        <p style={{ margin: 0, color: "#6a4b43", lineHeight: 1.5 }}>{order.instructions}</p>
        <p style={{ margin: 0 }}>Quote: {formatCurrency(order.quoteAmountCents)}</p>
        {order.files.length ? (
          <div style={{ display: "grid", gap: 8 }}>
            <p style={{ margin: 0, fontWeight: 700 }}>Reference images</p>
            {order.files.map((file) => <a key={file.id} href={file.fileUrl} target="_blank" rel="noreferrer" style={{ color: "#2f1712" }}>{file.fileName}</a>)}
          </div>
        ) : null}
      </div>

      {!viewerIsAdmin && order.status === "quoted" ? (
        <div style={{ display: "flex", gap: 12 }}>
          <button type="button" onClick={() => void handleDecline()} style={{ border: "1px solid #d9c4bd", borderRadius: 10, padding: "14px 16px", background: "#ffffff", color: "#8f2d1d", fontWeight: 700, cursor: "pointer" }}>Decline quote</button>
          <button type="button" onClick={() => void handleCreateCheckout()} style={{ border: "none", borderRadius: 10, padding: "14px 16px", background: "#2f1712", color: "#ffffff", fontWeight: 700, cursor: "pointer" }}>Pay quote</button>
        </div>
      ) : null}

      {viewerIsAdmin ? (
        <div style={{ display: "grid", gap: 12, padding: 16, border: "1px solid #ead9d2", borderRadius: 14, background: "#ffffff" }}>
          <p style={{ margin: 0, fontWeight: 700 }}>Admin controls</p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <input value={quoteAmount} onChange={(event) => setQuoteAmount(event.target.value)} placeholder="Quote amount" style={{ flex: "1 1 180px", padding: 14, border: "1px solid #d9c4bd", borderRadius: 10, fontSize: "1rem" }} />
            <button type="button" onClick={() => void handleQuote()} style={{ border: "none", borderRadius: 10, padding: "14px 16px", background: "#2f1712", color: "#ffffff", fontWeight: 700, cursor: "pointer" }}>Save quote</button>
            <button type="button" onClick={() => void handleDecline()} style={{ border: "1px solid #d9c4bd", borderRadius: 10, padding: "14px 16px", background: "#ffffff", color: "#8f2d1d", fontWeight: 700, cursor: "pointer" }}>Decline order</button>
            {order.status !== "accepted" ? <button type="button" onClick={() => void handleStatusUpdate("accepted")} style={{ border: "1px solid #d9c4bd", borderRadius: 10, padding: "14px 16px", background: "#ffffff", color: "#2f1712", fontWeight: 700, cursor: "pointer" }}>Mark accepted</button> : null}
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button type="button" onClick={() => void handleStatusUpdate("in_progress")} style={{ border: "1px solid #d9c4bd", borderRadius: 10, padding: "12px 14px", background: "#ffffff", color: "#2f1712", fontWeight: 700, cursor: "pointer" }}>Mark in progress</button>
            <button type="button" onClick={() => void handleStatusUpdate("shipped")} style={{ border: "1px solid #d9c4bd", borderRadius: 10, padding: "12px 14px", background: "#ffffff", color: "#2f1712", fontWeight: 700, cursor: "pointer" }}>Mark shipped</button>
            <button type="button" onClick={() => void handleStatusUpdate("delivered")} style={{ border: "1px solid #d9c4bd", borderRadius: 10, padding: "12px 14px", background: "#ffffff", color: "#2f1712", fontWeight: 700, cursor: "pointer" }}>Mark delivered</button>
          </div>
        </div>
      ) : null}

      <section style={{ display: "grid", gap: 12, padding: 16, border: "1px solid #ead9d2", borderRadius: 14, background: "#ffffff" }}>
        <p style={{ margin: 0, fontWeight: 700 }}>Comments</p>
        {order.comments.map((comment) => (
          <article key={comment.id} id={`comment-${comment.id}`} style={{ display: "grid", gap: 8, padding: 12, border: "1px solid #ead9d2", borderRadius: 12, background: comment.authorRole === "admin" ? "#fff7f0" : "#fffaf8" }}>
            <p style={{ margin: 0, fontWeight: 700 }}>{comment.authorRole === "admin" ? "Admin" : "Customer"} comment</p>
            <p style={{ margin: 0, color: "#6a4b43", fontSize: "0.85rem" }}>{new Date(comment.updatedAt).toLocaleString()}</p>
            {editingCommentId === comment.id ? (
              <div style={{ display: "grid", gap: 8 }}>
                <textarea value={editingBody} onChange={(event) => setEditingBody(event.target.value)} rows={4} style={{ width: "100%", padding: 14, border: "1px solid #d9c4bd", borderRadius: 10, fontSize: "1rem", resize: "vertical" }} />
                <div style={{ display: "flex", gap: 12 }}>
                  <button type="button" onClick={() => void handleCommentSave(comment.id)} style={{ border: "none", borderRadius: 10, padding: "12px 14px", background: "#2f1712", color: "#ffffff", fontWeight: 700, cursor: "pointer" }}>Save comment</button>
                  <button type="button" onClick={() => { setEditingCommentId(null); setEditingBody(""); }} style={{ border: "1px solid #d9c4bd", borderRadius: 10, padding: "12px 14px", background: "#ffffff", color: "#2f1712", fontWeight: 700, cursor: "pointer" }}>Cancel</button>
                </div>
              </div>
            ) : <p style={{ margin: 0, color: "#2f1712", lineHeight: 1.5 }}>{comment.body}</p>}
            {editableCommentIds.has(comment.id) && editingCommentId !== comment.id ? (
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button type="button" onClick={() => { setEditingCommentId(comment.id); setEditingBody(comment.body); }} style={{ border: "1px solid #d9c4bd", borderRadius: 10, padding: "10px 12px", background: "#ffffff", color: "#2f1712", fontWeight: 700, cursor: "pointer" }}>Edit</button>
                <button type="button" onClick={() => void handleCommentDelete(comment.id)} style={{ border: "1px solid #d9c4bd", borderRadius: 10, padding: "10px 12px", background: "#ffffff", color: "#8f2d1d", fontWeight: 700, cursor: "pointer" }}>Delete</button>
              </div>
            ) : null}
            {comment.canSendEmail && comment.authorRole === ownRole ? (
              <button type="button" disabled={Boolean(comment.emailSentAt)} onClick={() => void handleCommentEmail(comment)} style={{ justifySelf: "start", border: "1px solid #d9c4bd", borderRadius: 10, padding: "10px 12px", background: "#ffffff", color: "#2f1712", fontWeight: 700, cursor: "pointer", opacity: comment.emailSentAt ? 0.6 : 1 }}>Email {viewerIsAdmin ? "customer" : "admin"}</button>
            ) : null}
          </article>
        ))}
        <form onSubmit={handleCommentSubmit} style={{ display: "grid", gap: 12 }}>
          <textarea value={commentBody} onChange={(event) => setCommentBody(event.target.value)} placeholder={viewerIsAdmin ? "Add an admin comment" : "Add a customer comment"} rows={4} style={{ width: "100%", padding: 14, border: "1px solid #d9c4bd", borderRadius: 10, fontSize: "1rem", resize: "vertical" }} />
          <button type="submit" style={{ border: "none", borderRadius: 10, padding: "14px 16px", background: "#2f1712", color: "#ffffff", fontWeight: 700, cursor: "pointer" }}>Add comment</button>
        </form>
      </section>

      {error ? <p style={{ margin: 0, color: "#8f2d1d" }}>{error}</p> : null}
      {message ? <p style={{ margin: 0, color: "#2c6e49" }}>{message}</p> : null}
    </section>
  );
}
