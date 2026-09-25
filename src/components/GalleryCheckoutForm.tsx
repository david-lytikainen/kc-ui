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
    <div className="d-grid gap-2">
      <p className="text-muted small mb-0">{helperText}</p>
      <div className="d-flex flex-wrap align-items-center gap-2">
        <button className="btn btn-primary btn-sm" type="button" onClick={onStartCheckout} disabled={isStartingCheckout}>{isStartingCheckout ? pendingLabel : submitLabel}</button>
        {onCancel ? <button className="btn btn-outline-secondary btn-sm" type="button" onClick={onCancel}>Cancel</button> : null}
      </div>
    </div>
  );
}
