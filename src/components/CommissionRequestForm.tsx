import React from "react";


export default function CommissionRequestForm() {
  return (
    <section id="commission" style={{ display: "grid", gap: 16 }}>
      <div>
        <p style={{ margin: 0, fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", color: "#9c6f63" }}>Commission</p>
        <h2 style={{ margin: "8px 0 0", fontSize: "1.5rem" }}>Request a piece</h2>
      </div>
      <form style={{ display: "grid", gap: 12, padding: 16, border: "1px solid #ead9d2", borderRadius: 14, background: "#ffffff" }}>
        <input placeholder="Your name" style={{ width: "100%", padding: 14, border: "1px solid #d9c4bd", borderRadius: 10, fontSize: "1rem" }} />
        <input placeholder="Email" style={{ width: "100%", padding: 14, border: "1px solid #d9c4bd", borderRadius: 10, fontSize: "1rem" }} />
        <textarea placeholder="Describe what you want commissioned" rows={5} style={{ width: "100%", padding: 14, border: "1px solid #d9c4bd", borderRadius: 10, fontSize: "1rem", resize: "vertical" }} />
        <button type="button" style={{ border: "none", borderRadius: 10, padding: "14px 16px", background: "#2f1712", color: "#ffffff", fontSize: "1rem", fontWeight: 700, cursor: "pointer" }}>Commission flow placeholder</button>
      </form>
    </section>
  );
}
