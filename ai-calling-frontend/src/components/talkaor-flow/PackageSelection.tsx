"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AuthBots from "@/components/AuthBots";
import { ArrowIcon, Frame, GuardMessage, Logo, StepIndicator } from "./FlowParts";
import { FLOW_ROUTES, readDraft, writeDraft, type BillingCycle } from "@/lib/talkaor-flow/flow-state";
import { PACKAGES, formatPrice } from "@/lib/talkaor-flow/packages";
import "./talkaor-flow.css";

export default function PackageSelection() {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "ready" | "blocked">("checking");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");

  useEffect(() => {
    const d = readDraft();
    /* Commented out for testing so package selection can be viewed directly:
    if (!d.signupCompleted) {
      setStatus("blocked");
      return;
    }
    */
    if (d.billingCycle) {
      setBillingCycle(d.billingCycle);
    }
    if (d.selectedPackageId && PACKAGES.some((p) => p.id === d.selectedPackageId)) {
      setSelectedId(d.selectedPackageId);
    }
    setStatus("ready");
  }, []);

  const selected = PACKAGES.find((p) => p.id === selectedId) ?? null;

  function handleCycleChange(cycle: BillingCycle) {
    setBillingCycle(cycle);
    writeDraft({ billingCycle: cycle });
  }

  function choose(id: string) {
    setSelectedId(id); // single value ensures only one package is selected
    writeDraft({ selectedPackageId: id, billingCycle });
  }

  function next() {
    if (!selected) return;
    writeDraft({ selectedPackageId: selected.id, billingCycle });
    router.push(FLOW_ROUTES.verifyEmail);
  }

  if (status === "checking") {
    return (
      <Frame>
        <p className="m-auto text-sm text-[var(--c-auth-muted)]" role="status">
          Loading packages&hellip;
        </p>
      </Frame>
    );
  }

  if (status === "blocked") {
    return (
      <Frame>
        <GuardMessage
          title="Create your account first"
          body="Please complete signup before choosing a package."
          href={FLOW_ROUTES.signup}
          label="Go to signup"
        />
      </Frame>
    );
  }

  return (
    <Frame maxWidth="max-w-[1040px]">
      <div className="tkf-package">
        <header className="tkf-topbar">
          <Logo />
          <StepIndicator current={2} />
          <div className="w-16 hidden sm:block" aria-hidden="true" />
        </header>

        <div className="tkf-package-bot">
          <AuthBots state="dancing" singleBot hidePill />
        </div>

        <div className="tkf-heading">
          <h1>Choose your package</h1>
          <p>Pick one plan for your account. No payment is taken on this step.</p>

          {/* Monthly / Yearly cycle selector */}
          <div className="mt-4 inline-flex items-center gap-1.5 bg-[rgba(255,255,255,0.06)] p-1 rounded-full border border-[var(--c-auth-line)]">
            <button
              type="button"
              onClick={() => handleCycleChange("monthly")}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                billingCycle === "monthly"
                  ? "bg-[var(--c-orange)] text-white shadow-sm"
                  : "text-[var(--c-auth-muted)] hover:text-[var(--c-auth-ink)]"
              }`}
              aria-pressed={billingCycle === "monthly"}
            >
              Monthly pack
            </button>
            <button
              type="button"
              onClick={() => handleCycleChange("yearly")}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                billingCycle === "yearly"
                  ? "bg-[var(--c-orange)] text-white shadow-sm"
                  : "text-[var(--c-auth-muted)] hover:text-[var(--c-auth-ink)]"
              }`}
              aria-pressed={billingCycle === "yearly"}
            >
              <span>Yearly pack</span>
              <span className="text-[10px] bg-[rgba(40,92,204,0.4)] text-[var(--c-offwhite)] px-1.5 py-0.5 rounded-full">
                Annual savings
              </span>
            </button>
          </div>
        </div>

        {PACKAGES.length === 0 ? (
          <p className="m-auto text-sm text-[var(--c-auth-muted)]">No packages are configured yet.</p>
        ) : (
          <div className="tkf-grid" role="group" aria-label="Subscription packages">
            {PACKAGES.map((p) => {
              const isSel = p.id === selectedId;
              const hasPrice = (billingCycle === "yearly" ? p.priceYearly : p.priceMonthly) !== null;
              return (
                <article
                  key={p.id}
                  className={`tkf-card ${isSel ? "tkf-card-sel" : ""}`}
                >
                  <div className="tkf-card-head">
                    <h2>{p.name}</h2>
                    {isSel && <span className="tkf-badge">Selected</span>}
                  </div>
                  <p className="tkf-price">
                    {formatPrice(p, billingCycle)}
                    {hasPrice && <span> {billingCycle === "yearly" ? "/year" : "/month"}</span>}
                  </p>
                  <ul className="tkf-feats">
                    {p.includedMinutes !== null && <li>{p.includedMinutes} minutes per month</li>}
                    {p.maxCallMinutes !== null && <li>Up to {p.maxCallMinutes} minutes per call</li>}
                    {p.extraMinutePacks && <li>Extra minute packs: {p.extraMinutePacks}</li>}
                    {p.features.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                    {p.limitations.map((f) => (
                      <li key={f} className="tkf-limit">{f}</li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className={`w-full h-[40px] rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
                      isSel
                        ? "bg-[var(--c-orange)] text-white shadow-sm"
                        : "border border-[var(--c-auth-line)] text-[var(--c-auth-ink)] hover:border-[var(--c-orange)] hover:text-[var(--c-orange)]"
                    }`}
                    aria-pressed={isSel}
                    aria-label={(isSel ? "Selected: " : "Select package: ") + p.name}
                    onClick={() => choose(p.id)}
                  >
                    {isSel ? "Selected \u2713" : "Select Package"}
                  </button>
                </article>
              );
            })}
          </div>
        )}

        <section className="tkf-summary" aria-live="polite" aria-label="Selected package">
          {selected ? (
            <dl>
              <div>
                <dt>Selected package</dt>
                <dd>{selected.name}</dd>
              </div>
              <div>
                <dt>Billing cycle</dt>
                <dd className="capitalize">{billingCycle}</dd>
              </div>
              <div>
                <dt>{billingCycle === "yearly" ? "Yearly price" : "Monthly price"}</dt>
                <dd>{formatPrice(selected, billingCycle)}</dd>
              </div>
              {selected.includedMinutes !== null && (
                <div>
                  <dt>Included minutes</dt>
                  <dd>{selected.includedMinutes} / month</dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="text-xs text-[var(--c-auth-muted)]">Select a package to continue.</p>
          )}

          <button
            type="button"
            className="tkf-continue-btn h-[46px] min-w-[190px] rounded-full flex items-center justify-between px-5 text-sm font-semibold text-white transition-all duration-200 cursor-pointer hover:brightness-110 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "var(--c-orange)" }}
            disabled={!selected}
            onClick={next}
          >
            <span>Continue</span>
            <ArrowIcon />
          </button>
        </section>

        <p className="tkf-back-row">
          <Link href={FLOW_ROUTES.signup} className="tkf-back">
            &larr; Back to signup
          </Link>
        </p>
      </div>
    </Frame>
  );
}
