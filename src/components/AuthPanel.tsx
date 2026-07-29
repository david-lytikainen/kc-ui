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
      <div>
        <p style={{ margin: 0, fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", color: "#9c6f63" }}>Admin Sign In</p>
        <h2 style={{ margin: "8px 0 0", fontSize: "1.5rem" }}>Open the admin profile</h2>
      </div>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12, padding: 16, border: "1px solid #ead9d2", borderRadius: 14, background: "#ffffff" }}>
        <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Admin email" type="email" style={{ width: "100%", padding: 14, border: "1px solid #d9c4bd", borderRadius: 10, fontSize: "1rem" }} />
        <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" type="password" style={{ width: "100%", padding: 14, border: "1px solid #d9c4bd", borderRadius: 10, fontSize: "1rem" }} />
        {error ? <p style={{ margin: 0, color: "#8f2d1d" }}>{error}</p> : null}
        <button type="submit" disabled={isSubmitting} style={{ border: "none", borderRadius: 10, padding: "14px 16px", background: "#2f1712", color: "#ffffff", fontSize: "1rem", fontWeight: 700, cursor: "pointer", opacity: isSubmitting ? 0.7 : 1 }}>{isSubmitting ? "Signing in..." : "Sign in"}</button>
      </form>
    </section>
  );
}
