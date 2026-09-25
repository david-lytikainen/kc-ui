import { FormEvent, useState } from "react";

import { authApi, User } from "../api";
import { normalizeEmailInput } from "../inputFormatting";


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
    <section className="row g-3">
      <div className="col-12 col-lg-8">
        <p className="text-uppercase small fw-bold text-success">Admin Sign In</p>
        <h2 className="h2 mb-0">Open the admin profile</h2>
      </div>
      <form onSubmit={handleSubmit} className="col-12 col-lg-8 card p-3 p-md-4 d-grid gap-3">
        <input className="form-control" value={email} onChange={(event) => setEmail(normalizeEmailInput(event.target.value))} placeholder="Admin email" type="email" autoCapitalize="none" autoCorrect="off" inputMode="email" />
        <input className="form-control" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" type="password" />
        {error ? <p className="text-danger mb-0">{error}</p> : null}
        <button className="btn btn-primary" type="submit" disabled={isSubmitting}>{isSubmitting ? "Signing in..." : "Sign in"}</button>
      </form>
    </section>
  );
}
