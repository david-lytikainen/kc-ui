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
    <section id="commission" className="row g-3">
      <div className="col-12 col-lg-8">
        <h2 className="h2 mb-0">Request a Commission</h2>
      </div>
      <form onSubmit={handleSubmit} className="col-12 card p-3 p-md-4 row g-3">
        <div className="col-12 col-md-6"><input className="form-control" required value={draft.customerName} onChange={(event) => setDraft((current) => ({ ...current, customerName: event.target.value }))} placeholder="Your name" /></div>
        <div className="col-12 col-md-6"><input className="form-control" required value={draft.customerEmail} onChange={(event) => setDraft((current) => ({ ...current, customerEmail: normalizeEmailInput(event.target.value) }))} placeholder="Email" type="email" autoCapitalize="none" autoCorrect="off" inputMode="email" /></div>
        <div className="col-12 col-md-6"><input className="form-control" required value={draft.customerPhone} onChange={(event) => setDraft((current) => ({ ...current, customerPhone: formatPhoneInput(event.target.value) }))} placeholder="Phone" type="tel" inputMode="tel" maxLength={14} /></div>
        <div className="col-12 col-md-6"><select className="form-select" required value={draft.categoryId} onChange={(event) => setDraft((current) => ({ ...current, categoryId: event.target.value }))}>
          <option value="">Choose a service</option>
          {categories.map((category) => <option key={category.id} value={String(category.id)}>{category.name}</option>)}
          <option value="custom">Custom</option>
        </select></div>
        {isCustomCategory ? <div className="col-12"><input className="form-control" required value={draft.customCategoryName} onChange={(event) => setDraft((current) => ({ ...current, customCategoryName: event.target.value }))} placeholder="Custom service" /></div> : null}
        <div className="col-12"><textarea className="form-control" required value={draft.instructions} onChange={(event) => setDraft((current) => ({ ...current, instructions: event.target.value }))} placeholder="Instructions" rows={5} /></div>
        <div className="col-12 col-md-6"><input className="form-control" required value={draft.medium} onChange={(event) => setDraft((current) => ({ ...current, medium: event.target.value }))} placeholder="Medium" /></div>
        <div className="col-12 col-md-6"><input className="form-control" required value={draft.size} onChange={(event) => setDraft((current) => ({ ...current, size: event.target.value }))} placeholder="Size" /></div>
        <div className="col-12"><label className="form-label text-muted">Reference images, up to 5</label><input className="form-control" type="file" accept="image/*" multiple onChange={handleFileChange} />
        {draft.files.length ? <p className="text-muted mb-0">{draft.files.length} file(s) ready to upload.</p> : null}</div>
        {error ? <p className="text-danger mb-0">{error}</p> : null}
        <div className="col-12"><button className="btn btn-primary" type="submit" disabled={isSubmitting}>{isSubmitting ? "Submitting..." : "Create order"}</button></div>
      </form>
    </section>
  );
}
