import { ChangeEvent, FormEvent, useEffect, useState } from "react";

import { categoryApi, Category, CommissionDraft, orderApi } from "../api";


type CommissionRequestFormProps = {
  onOrderCreated: (orderNumber: string) => void;
};


const emptyDraft: CommissionDraft = {
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  categoryId: "",
  customCategoryName: "",
  instructions: "",
  medium: "",
  size: "",
  files: [],
};


export default function CommissionRequestForm({ onOrderCreated }: CommissionRequestFormProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [draft, setDraft] = useState<CommissionDraft>(emptyDraft);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadCategories() {
      try {
        setCategories(await categoryApi.listPublic());
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Unable to load categories.");
      }
    }

    void loadCategories();
  }, []);

  const isCustomCategory = draft.categoryId === "custom";

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setDraft((current) => ({ ...current, files: Array.from(event.target.files ?? []).slice(0, 5) }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setIsSubmitting(true);
      setError("");
      const order = await orderApi.submit(draft);
      setDraft(emptyDraft);
      onOrderCreated(order.orderNumber);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to submit commission request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="commission" style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gap: 8, maxWidth: 680 }}>
        <p style={{ margin: 0, color: "var(--text-dark)", fontFamily: "var(--serif)", fontSize: "clamp(1.65rem, 5vw, 2.55rem)", fontWeight: 500 }}>Request a Commission</p>
      </div>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12, padding: 16, border: "1px solid var(--line)", borderRadius: 8, background: "var(--bg-panel)", boxShadow: "0 10px 30px rgba(31, 51, 40, 0.08)" }}>
        <input value={draft.customerName} onChange={(event) => setDraft((current) => ({ ...current, customerName: event.target.value }))} placeholder="Your name" style={{ width: "100%", padding: 14, border: "1px solid rgba(63, 95, 72, 0.28)", borderRadius: 8, background: "rgba(255, 253, 248, 0.94)", color: "var(--text-dark)", fontSize: "1rem" }} />
        <input value={draft.customerEmail} onChange={(event) => setDraft((current) => ({ ...current, customerEmail: event.target.value }))} placeholder="Email" type="email" style={{ width: "100%", padding: 14, border: "1px solid rgba(63, 95, 72, 0.28)", borderRadius: 8, background: "rgba(255, 253, 248, 0.94)", color: "var(--text-dark)", fontSize: "1rem" }} />
        <input value={draft.customerPhone} onChange={(event) => setDraft((current) => ({ ...current, customerPhone: event.target.value }))} placeholder="Phone" style={{ width: "100%", padding: 14, border: "1px solid rgba(63, 95, 72, 0.28)", borderRadius: 8, background: "rgba(255, 253, 248, 0.94)", color: "var(--text-dark)", fontSize: "1rem" }} />
        <select value={draft.categoryId} onChange={(event) => setDraft((current) => ({ ...current, categoryId: event.target.value }))} style={{ width: "100%", padding: 14, border: "1px solid rgba(63, 95, 72, 0.28)", borderRadius: 8, background: "rgba(255, 253, 248, 0.94)", color: "var(--text-dark)", fontSize: "1rem" }}>
          <option value="">Choose a category</option>
          {categories.map((category) => <option key={category.id} value={String(category.id)}>{category.name}</option>)}
          <option value="custom">Custom</option>
        </select>
        {isCustomCategory ? <input value={draft.customCategoryName} onChange={(event) => setDraft((current) => ({ ...current, customCategoryName: event.target.value }))} placeholder="Custom category" style={{ width: "100%", padding: 14, border: "1px solid rgba(63, 95, 72, 0.28)", borderRadius: 8, background: "rgba(255, 253, 248, 0.94)", color: "var(--text-dark)", fontSize: "1rem" }} /> : null}
        <textarea value={draft.instructions} onChange={(event) => setDraft((current) => ({ ...current, instructions: event.target.value }))} placeholder="Instructions" rows={5} style={{ width: "100%", padding: 14, border: "1px solid rgba(63, 95, 72, 0.28)", borderRadius: 8, background: "rgba(255, 253, 248, 0.94)", color: "var(--text-dark)", fontSize: "1rem", resize: "vertical" }} />
        <input value={draft.medium} onChange={(event) => setDraft((current) => ({ ...current, medium: event.target.value }))} placeholder="Medium" style={{ width: "100%", padding: 14, border: "1px solid rgba(63, 95, 72, 0.28)", borderRadius: 8, background: "rgba(255, 253, 248, 0.94)", color: "var(--text-dark)", fontSize: "1rem" }} />
        <input value={draft.size} onChange={(event) => setDraft((current) => ({ ...current, size: event.target.value }))} placeholder="Size" style={{ width: "100%", padding: 14, border: "1px solid rgba(63, 95, 72, 0.28)", borderRadius: 8, background: "rgba(255, 253, 248, 0.94)", color: "var(--text-dark)", fontSize: "1rem" }} />
        <label style={{ display: "grid", gap: 8, color: "var(--muted)" }}>
          <span>Reference images, up to 5</span>
          <input type="file" accept="image/*" multiple onChange={handleFileChange} />
        </label>
        {draft.files.length ? <p style={{ margin: 0, color: "var(--muted)" }}>{draft.files.length} file(s) ready to upload.</p> : null}
        {error ? <p style={{ margin: 0, color: "var(--danger)" }}>{error}</p> : null}
        <button type="submit" disabled={isSubmitting} style={{ border: "1px solid var(--leaf-800)", borderRadius: 8, padding: "14px 16px", background: "var(--leaf-800)", color: "var(--text-light)", fontWeight: 800, boxShadow: "0 12px 28px rgba(31, 51, 40, 0.18)" }}>{isSubmitting ? "Submitting..." : "Create order"}</button>
      </form>
    </section>
  );
}
