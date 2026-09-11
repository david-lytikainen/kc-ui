type GalleryCheckoutFormProps = {
  isStartingCheckout: boolean;
  onCancel?: () => void;
  onStartCheckout: () => void;
  helperText?: string;
  pendingLabel?: string;
  submitLabel?: string;
};


export default function GalleryCheckoutForm({ isStartingCheckout, onCancel, onStartCheckout, helperText = "Stripe Checkout will collect your email. Enter a 10% review reward code there when you have one.", pendingLabel = "Starting...", submitLabel = "Start checkout" }: GalleryCheckoutFormProps) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.9rem" }}>{helperText}</p>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" onClick={onStartCheckout} disabled={isStartingCheckout} style={{ border: "1px solid var(--leaf-800)", borderRadius: 8, padding: "10px 12px", background: "var(--leaf-800)", color: "var(--text-light)", fontWeight: 800 }}>{isStartingCheckout ? pendingLabel : submitLabel}</button>
        {onCancel ? <button type="button" onClick={onCancel} style={{ border: "1px solid rgba(63, 95, 72, 0.34)", borderRadius: 8, padding: "10px 12px", background: "rgba(255, 253, 248, 0.82)", color: "var(--text-dark)", fontWeight: 800 }}>Cancel</button> : null}
      </div>
    </div>
  );
}
