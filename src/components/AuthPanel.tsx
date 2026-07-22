import { FormEvent, useState } from "react";

import { authApi, User } from "../api";


type AuthPanelProps = {
  mode: "login" | "signup";
  onAuthed: (token: string, user: User) => void;
};


export default function AuthPanel({ mode, onAuthed }: AuthPanelProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setIsSubmitting(true);
      setError("");

      const response = mode === "signup" ? await authApi.signup(name, email, password) : await authApi.login(email, password);
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
        <p style={{ margin: 0, fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", color: "#9c6f63" }}>{mode === "signup" ? "Sign Up" : "Sign In"}</p>
        <h2 style={{ margin: "8px 0 0", fontSize: "1.5rem" }}>{mode === "signup" ? "Create your account" : "Open your profile"}</h2>
      </div>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12, padding: 16, border: "1px solid #ead9d2", borderRadius: 14, background: "#ffffff" }}>
        {mode === "signup" ? <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" style={{ width: "100%", padding: 14, border: "1px solid #d9c4bd", borderRadius: 10, fontSize: "1rem" }} /> : null}
        <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" type="email" style={{ width: "100%", padding: 14, border: "1px solid #d9c4bd", borderRadius: 10, fontSize: "1rem" }} />
        <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" type="password" style={{ width: "100%", padding: 14, border: "1px solid #d9c4bd", borderRadius: 10, fontSize: "1rem" }} />
        {error ? <p style={{ margin: 0, color: "#8f2d1d" }}>{error}</p> : null}
        <button type="submit" disabled={isSubmitting} style={{ border: "none", borderRadius: 10, padding: "14px 16px", background: "#2f1712", color: "#ffffff", fontSize: "1rem", fontWeight: 700, cursor: "pointer", opacity: isSubmitting ? 0.7 : 1 }}>
          {isSubmitting ? "Submitting..." : mode === "signup" ? "Create account" : "Sign in"}
        </button>
      </form>
    </section>
  );
}
