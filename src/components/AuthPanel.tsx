import { FormEvent, useState } from "react";

import { authApi, User } from "../api";


type AuthPanelProps = {
  onAuthed: (token: string, user: User) => void;
};


export default function AuthPanel({ onAuthed }: AuthPanelProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setIsSubmitting(true);
      setError("");
      const response = await authApi.login(email, password);
      localStorage.setItem("token", response.token);
      onAuthed(response.token, response.user);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to continue.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gap: 8, maxWidth: 680 }}>
        <p style={{ margin: 0, color: "var(--leaf-700)", fontSize: "0.82rem", fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase" }}>Admin Sign In</p>
        <h2 style={{ margin: 0, color: "var(--leaf-800)", fontFamily: "var(--serif)", fontSize: "clamp(1.6rem, 4vw, 2.2rem)", fontWeight: 500 }}>Open the admin profile</h2>
      </div>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12, padding: 16, border: "1px solid var(--line)", borderRadius: 8, background: "rgba(255, 253, 248, 0.86)", boxShadow: "0 10px 30px rgba(31, 51, 40, 0.08)" }}>
        <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Admin email" type="email" style={{ width: "100%", padding: 14, border: "1px solid rgba(63, 95, 72, 0.28)", borderRadius: 8, background: "rgba(255, 253, 248, 0.94)", color: "var(--ink)", fontSize: "1rem" }} />
        <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" type="password" style={{ width: "100%", padding: 14, border: "1px solid rgba(63, 95, 72, 0.28)", borderRadius: 8, background: "rgba(255, 253, 248, 0.94)", color: "var(--ink)", fontSize: "1rem" }} />
        {error ? <p style={{ margin: 0, color: "var(--danger)" }}>{error}</p> : null}
        <button type="submit" disabled={isSubmitting} style={{ border: "1px solid var(--leaf-800)", borderRadius: 8, padding: "14px 16px", background: "var(--leaf-800)", color: "var(--paper)", fontWeight: 800, boxShadow: "0 12px 28px rgba(31, 51, 40, 0.18)" }}>{isSubmitting ? "Signing in..." : "Sign in"}</button>
      </form>
    </section>
  );
}
