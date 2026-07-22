import React from "react";


export default function GalleryPreview() {
  const cards = ["Recent portrait", "Pet commission", "Original study"];

  return (
    <section id="gallery" style={{ display: "grid", gap: 16 }}>
      <div>
        <p style={{ margin: 0, fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", color: "#9c6f63" }}>Gallery</p>
        <h2 style={{ margin: "8px 0 0", fontSize: "1.5rem" }}>Art preview</h2>
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        {cards.map((card) => (
          <article key={card} style={{ minHeight: 148, padding: 16, border: "1px solid #ead9d2", borderRadius: 14, background: "#ffffff" }}>
            <div style={{ height: 84, borderRadius: 10, background: "#f6e7e2" }} />
            <p style={{ margin: "12px 0 0", fontWeight: 600 }}>{card}</p>
            <p style={{ margin: "6px 0 0", color: "#6a4b43" }}>S3-backed gallery items will render here once the gallery source is decided.</p>
          </article>
        ))}
      </div>
    </section>
  );
}
