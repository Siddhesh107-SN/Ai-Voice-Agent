"use client";

import { FormEvent, ReactNode, useState } from "react";

export const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

export function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="field">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      {children}
      {error && <p id={`${id}-err`} className="err" role="alert">{error}</p>}
    </div>
  );
}

type Spec = { name: string; label: string; type?: string; autoComplete?: string; textarea?: boolean; validate: (v: string, all: Record<string, string>) => string };

/** Small mocked form: validates on submit, then shows a success state. Nothing is sent anywhere. */
export function MockForm({ fields, submit, success, onValid }: { fields: Spec[]; submit: string; success: ReactNode; onValid?: () => void }) {
  const [vals, setVals] = useState<Record<string, string>>({});
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    fields.forEach((f) => {
      const m = f.validate(vals[f.name] ?? "", vals);
      if (m) next[f.name] = m;
    });
    setErrs(next);
    if (Object.keys(next).length) {
      const first = fields.find((f) => next[f.name]);
      if (first) document.getElementById(first.name)?.focus();
      return;
    }
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      setDone(true);
      onValid?.();
    }, 700);
  };

  if (done) return <div role="status" className="card p-8">{success}</div>;

  return (
    <form onSubmit={onSubmit} noValidate className="card space-y-5 p-6 md:p-8">
      {fields.map((f) => {
        const common = {
          id: f.name, name: f.name, className: "input", autoComplete: f.autoComplete,
          "aria-invalid": errs[f.name] ? true : undefined,
          "aria-describedby": errs[f.name] ? `${f.name}-err` : undefined,
          value: vals[f.name] ?? "",
          onChange: (e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => setVals((v) => ({ ...v, [f.name]: e.target.value })),
        } as const;
        return (
          <Field key={f.name} id={f.name} label={f.label} error={errs[f.name]}>
            {f.textarea ? <textarea rows={5} {...common} /> : <input type={f.type ?? "text"} {...common} />}
          </Field>
        );
      })}
      <button type="submit" className="btn btn-primary w-full" disabled={busy}>{busy ? "Please wait…" : submit}</button>
    </form>
  );
}

export const req = (msg: string) => (v: string) => (v.trim() ? "" : msg);
