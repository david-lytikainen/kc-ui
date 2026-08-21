type GalleryCheckoutFormProps = {
  email: string;
  isStartingCheckout: boolean;
  onCancel?: () => void;
  onEmailChange: (value: string) => void;
  onStartCheckout: () => void;
  helperText?: string;
  pendingLabel?: string;
  submitLabel?: string;
};


export default function GalleryCheckoutForm({ email, isStartingCheckout, onCancel, onEmailChange, onStartCheckout, helperText = "If this email has an unused 10% review reward, Stripe Checkout will show that the discount is already applied.", pendingLabel = "Starting...", submitLabel = "Start checkout" }: GalleryCheckoutFormProps) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <input value={email} onChange={(event) => onEmailChange(event.target.value)} placeholder="Email for checkout" type="email" autoCapitalize="none" autoCorrect="off" inputMode="email" style={{ width: "100%", padding: 12, border: "1px solid rgba(63, 95, 72, 0.28)", borderRadius: 8, background: "rgba(255, 253, 248, 0.94)", color: "var(--text-dark)", fontSize: "0.95rem" }} />
      <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.9rem" }}>{helperText}</p>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" onClick={onStartCheckout} disabled={isStartingCheckout} style={{ border: "1px solid var(--leaf-800)", borderRadius: 8, padding: "10px 12px", background: "var(--leaf-800)", color: "var(--text-light)", fontWeight: 800 }}>{isStartingCheckout ? pendingLabel : submitLabel}</button>
        {onCancel ? <button type="button" onClick={onCancel} style={{ border: "1px solid rgba(63, 95, 72, 0.34)", borderRadius: 8, padding: "10px 12px", background: "rgba(255, 253, 248, 0.82)", color: "var(--text-dark)", fontWeight: 800 }}>Cancel</button> : null}
      </div>
    </div>
  );
}
