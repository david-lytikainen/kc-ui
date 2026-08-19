import { ChangeEvent, FormEvent, useEffect, useState } from "react";

import { categoryApi, Category, CommissionDraft, orderApi } from "../api";
import { formatPhoneInput, normalizeEmailInput } from "../inputFormatting";


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
        setError(nextError instanceof Error ? nextError.message : "Unable to load services.");
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
      if (!draft.customerName.trim() || !draft.customerEmail.trim() || !draft.customerPhone.trim() || !draft.categoryId || !draft.instructions.trim() || !draft.medium.trim() || !draft.size.trim()) {
        throw new Error("Name, email, phone, service, instructions, medium, and size are required.");
      }
      if (isCustomCategory && !draft.customCategoryName.trim()) {
        throw new Error("Custom service name is required.");
      }
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
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12, padding: 16, border: "1px solid var(--line)", borderRadius: 8, background: "rgba(255, 253, 248, 0.86)", boxShadow: "0 10px 30px rgba(31, 51, 40, 0.08)" }}>
        <input required value={draft.customerName} onChange={(event) => setDraft((current) => ({ ...current, customerName: event.target.value }))} placeholder="Your name" style={{ width: "100%", padding: 14, border: "1px solid rgba(63, 95, 72, 0.28)", borderRadius: 8, background: "rgba(255, 253, 248, 0.94)", color: "var(--ink)", fontSize: "1rem" }} />
        <input required value={draft.customerEmail} onChange={(event) => setDraft((current) => ({ ...current, customerEmail: normalizeEmailInput(event.target.value) }))} placeholder="Email" type="email" autoCapitalize="none" autoCorrect="off" inputMode="email" style={{ width: "100%", padding: 14, border: "1px solid rgba(63, 95, 72, 0.28)", borderRadius: 8, background: "rgba(255, 253, 248, 0.94)", color: "var(--ink)", fontSize: "1rem" }} />
        <input required value={draft.customerPhone} onChange={(event) => setDraft((current) => ({ ...current, customerPhone: formatPhoneInput(event.target.value) }))} placeholder="Phone" type="tel" inputMode="tel" maxLength={14} style={{ width: "100%", padding: 14, border: "1px solid rgba(63, 95, 72, 0.28)", borderRadius: 8, background: "rgba(255, 253, 248, 0.94)", color: "var(--ink)", fontSize: "1rem" }} />
        <select required value={draft.categoryId} onChange={(event) => setDraft((current) => ({ ...current, categoryId: event.target.value }))} style={{ width: "100%", padding: 14, border: "1px solid rgba(63, 95, 72, 0.28)", borderRadius: 8, background: "rgba(255, 253, 248, 0.94)", color: "var(--ink)", fontSize: "1rem" }}>
          <option value="">Choose a service</option>
          {categories.map((category) => <option key={category.id} value={String(category.id)}>{category.name}</option>)}
          <option value="custom">Custom</option>
        </select>
        {isCustomCategory ? <input required value={draft.customCategoryName} onChange={(event) => setDraft((current) => ({ ...current, customCategoryName: event.target.value }))} placeholder="Custom service" style={{ width: "100%", padding: 14, border: "1px solid rgba(63, 95, 72, 0.28)", borderRadius: 8, background: "rgba(255, 253, 248, 0.94)", color: "var(--ink)", fontSize: "1rem" }} /> : null}
        <textarea required value={draft.instructions} onChange={(event) => setDraft((current) => ({ ...current, instructions: event.target.value }))} placeholder="Instructions" rows={5} style={{ width: "100%", padding: 14, border: "1px solid rgba(63, 95, 72, 0.28)", borderRadius: 8, background: "rgba(255, 253, 248, 0.94)", color: "var(--ink)", fontSize: "1rem", resize: "vertical" }} />
        <input required value={draft.medium} onChange={(event) => setDraft((current) => ({ ...current, medium: event.target.value }))} placeholder="Medium" style={{ width: "100%", padding: 14, border: "1px solid rgba(63, 95, 72, 0.28)", borderRadius: 8, background: "rgba(255, 253, 248, 0.94)", color: "var(--ink)", fontSize: "1rem" }} />
        <input required value={draft.size} onChange={(event) => setDraft((current) => ({ ...current, size: event.target.value }))} placeholder="Size" style={{ width: "100%", padding: 14, border: "1px solid rgba(63, 95, 72, 0.28)", borderRadius: 8, background: "rgba(255, 253, 248, 0.94)", color: "var(--ink)", fontSize: "1rem" }} />
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
