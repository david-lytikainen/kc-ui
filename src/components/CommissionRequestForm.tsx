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
      <div>
        <p style={{ margin: 0, fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", color: "#9c6f63" }}>Commission</p>
        <h2 style={{ margin: "8px 0 0", fontSize: "1.5rem" }}>Request a piece</h2>
      </div>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12, padding: 16, border: "1px solid #ead9d2", borderRadius: 14, background: "#ffffff" }}>
        <input value={draft.customerName} onChange={(event) => setDraft((current) => ({ ...current, customerName: event.target.value }))} placeholder="Your name" style={{ width: "100%", padding: 14, border: "1px solid #d9c4bd", borderRadius: 10, fontSize: "1rem" }} />
        <input value={draft.customerEmail} onChange={(event) => setDraft((current) => ({ ...current, customerEmail: event.target.value }))} placeholder="Email" type="email" style={{ width: "100%", padding: 14, border: "1px solid #d9c4bd", borderRadius: 10, fontSize: "1rem" }} />
        <input value={draft.customerPhone} onChange={(event) => setDraft((current) => ({ ...current, customerPhone: event.target.value }))} placeholder="Phone" style={{ width: "100%", padding: 14, border: "1px solid #d9c4bd", borderRadius: 10, fontSize: "1rem" }} />
        <select value={draft.categoryId} onChange={(event) => setDraft((current) => ({ ...current, categoryId: event.target.value }))} style={{ width: "100%", padding: 14, border: "1px solid #d9c4bd", borderRadius: 10, fontSize: "1rem", background: "#ffffff" }}>
          <option value="">Choose a category</option>
          {categories.map((category) => <option key={category.id} value={String(category.id)}>{category.name}</option>)}
          <option value="custom">Custom</option>
        </select>
        {isCustomCategory ? <input value={draft.customCategoryName} onChange={(event) => setDraft((current) => ({ ...current, customCategoryName: event.target.value }))} placeholder="Custom category" style={{ width: "100%", padding: 14, border: "1px solid #d9c4bd", borderRadius: 10, fontSize: "1rem" }} /> : null}
        <textarea value={draft.instructions} onChange={(event) => setDraft((current) => ({ ...current, instructions: event.target.value }))} placeholder="Instructions" rows={5} style={{ width: "100%", padding: 14, border: "1px solid #d9c4bd", borderRadius: 10, fontSize: "1rem", resize: "vertical" }} />
        <input value={draft.medium} onChange={(event) => setDraft((current) => ({ ...current, medium: event.target.value }))} placeholder="Medium" style={{ width: "100%", padding: 14, border: "1px solid #d9c4bd", borderRadius: 10, fontSize: "1rem" }} />
        <input value={draft.size} onChange={(event) => setDraft((current) => ({ ...current, size: event.target.value }))} placeholder="Size" style={{ width: "100%", padding: 14, border: "1px solid #d9c4bd", borderRadius: 10, fontSize: "1rem" }} />
        <label style={{ display: "grid", gap: 8, color: "#6a4b43" }}>
          <span>Reference images, up to 5</span>
          <input type="file" accept="image/*" multiple onChange={handleFileChange} />
        </label>
        {draft.files.length ? <p style={{ margin: 0, color: "#6a4b43" }}>{draft.files.length} file(s) ready to upload.</p> : null}
        {error ? <p style={{ margin: 0, color: "#8f2d1d" }}>{error}</p> : null}
        <button type="submit" disabled={isSubmitting} style={{ border: "none", borderRadius: 10, padding: "14px 16px", background: "#2f1712", color: "#ffffff", fontSize: "1rem", fontWeight: 700, cursor: "pointer", opacity: isSubmitting ? 0.7 : 1 }}>{isSubmitting ? "Submitting..." : "Create order"}</button>
      </form>
    </section>
  );
}
