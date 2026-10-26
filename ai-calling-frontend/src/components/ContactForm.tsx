"use client";

import { useState, type FormEvent } from "react";
import { Field, emailOk, req } from "@/components/forms";

export default function ContactForm() {
  const [vals, setVals] = useState({ name: "", email: "", phone: "", message: "", website: "" });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState("");

  const validate = () => {
    const next: Record<string, string> = {};
    if (!vals.name.trim()) next.name = "Enter your name.";
    if (!vals.email.trim()) {
      next.email = "Enter your email.";
    } else if (!emailOk(vals.email)) {
      next.email = "Enter a valid email address.";
    }
    if (vals.message.trim().length < 10) {
      next.message = "Write at least 10 characters.";
    }
    return next;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setServerError("");

    const validationErrors = validate();
    setErrs(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      const first = Object.keys(validationErrors)[0];
      document.getElementById(first)?.focus();
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/v1/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vals),
        signal: typeof AbortSignal !== "undefined" && "timeout" in AbortSignal ? AbortSignal.timeout(10000) : undefined,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.detail || errJson?.error || "Failed to submit message.");
      }

      setDone(true);
    } catch (err: any) {
      setServerError(err.message || "An error occurred. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div role="status" className="card p-8">
        <h2 className="h-md">Message sent</h2>
        <p className="muted mt-2">
          Thanks. Our team will get back to you about your requirements.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="card space-y-5 p-6 md:p-8">
      {serverError && (
        <div className="err mb-3" role="alert">
          {serverError}
        </div>
      )}
      <Field id="name" label="Name" error={errs.name}>
        <input
          id="name"
          name="name"
          className="input"
          autoComplete="name"
          aria-invalid={errs.name ? true : undefined}
          aria-describedby={errs.name ? "name-err" : undefined}
          value={vals.name}
          onChange={(e) => setVals((v) => ({ ...v, name: e.target.value }))}
        />
      </Field>
      <Field id="email" label="Email" error={errs.email}>
        <input
          id="email"
          name="email"
          type="email"
          className="input"
          autoComplete="email"
          aria-invalid={errs.email ? true : undefined}
          aria-describedby={errs.email ? "email-err" : undefined}
          value={vals.email}
          onChange={(e) => setVals((v) => ({ ...v, email: e.target.value }))}
        />
      </Field>
      <Field id="message" label="Message" error={errs.message}>
        <textarea
          id="message"
          name="message"
          rows={5}
          className="input"
          aria-invalid={errs.message ? true : undefined}
          aria-describedby={errs.message ? "message-err" : undefined}
          value={vals.message}
          onChange={(e) => setVals((v) => ({ ...v, message: e.target.value }))}
        />
      </Field>
      <button type="submit" className="btn btn-primary w-full" disabled={busy}>
        {busy ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
