"use client";

import Link from "next/link";
import { MockForm, emailOk, req } from "@/components/forms";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const signup = mode === "signup";
  const email = { name: "email", label: "Email", type: "email", autoComplete: "email", validate: (v: string) => (!v.trim() ? "Enter your email." : emailOk(v) ? "" : "Enter a valid email address.") };
  const password = { name: "password", label: "Password", type: "password", autoComplete: signup ? "new-password" : "current-password", validate: (v: string) => (v.length >= 8 ? "" : "Use at least 8 characters.") };
  const fields = signup
    ? [
        { name: "name", label: "Name", autoComplete: "name", validate: req("Enter your name.") },
        email,
        password,
        { name: "confirm", label: "Confirm password", type: "password", autoComplete: "new-password", validate: (v: string, all: Record<string, string>) => (v === all.password && v ? "" : "Passwords do not match.") },
      ]
    : [email, password];

  return (
    <div>
      <MockForm
        fields={fields}
        submit={signup ? "Create account" : "Log in"}
        success={<><h2 className="h-md">{signup ? "Account created" : "Logged in"}</h2><p className="muted mt-2">This is a demo: nothing was sent.</p></>}
      />
      <p className="muted mt-5 text-sm">
        {signup ? "Already have an account? " : "New to talkaor? "}
        <Link href={signup ? "/login" : "/signup"} className="underline underline-offset-4" style={{ color: "var(--c-blue)" }}>{signup ? "Log in" : "Sign up"}</Link>
      </p>
    </div>
  );
}
