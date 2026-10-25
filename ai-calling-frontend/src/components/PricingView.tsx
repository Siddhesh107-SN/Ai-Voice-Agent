"use client";

import { useState } from "react";
import Link from "next/link";
import {
  billingRules,
  comparison,
  formatINR,
  minutePacks,
  plans,
  pricingHeader,
} from "@/data/plans";
import RollingPrice from "@/components/RollingPrice";

export default function PricingView() {
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      setCycle("yearly");
      document.getElementById("tab-yearly")?.focus();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setCycle("monthly");
      document.getElementById("tab-monthly")?.focus();
    }
  };

  return (
    <div>
      {/* Monthly / Yearly Segmented Toggle */}
      <div className="flex flex-col items-center justify-center gap-3">
        <div
          role="tablist"
          aria-label="Billing cycle"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          className="inline-flex items-center rounded-full p-1.5 focus-visible:outline-2"
          style={{
            background: "var(--c-surface)",
            border: "1px solid var(--c-line)",
          }}
        >
          <button
            type="button"
            role="tab"
            id="tab-monthly"
            aria-selected={cycle === "monthly"}
            aria-controls="pricing-cards"
            tabIndex={cycle === "monthly" ? 0 : -1}
            onClick={() => setCycle("monthly")}
            onKeyDown={handleKeyDown}
            className="rounded-full px-5 py-2 text-sm font-medium transition-all duration-200"
            style={
              cycle === "monthly"
                ? {
                    background: "var(--c-navy)",
                    color: "var(--c-offwhite)",
                    boxShadow: "0 2px 8px -2px var(--c-shadow)",
                  }
                : { color: "var(--c-ink-soft)" }
            }
          >
            Monthly
          </button>
          <button
            type="button"
            role="tab"
            id="tab-yearly"
            aria-selected={cycle === "yearly"}
            aria-controls="pricing-cards"
            tabIndex={cycle === "yearly" ? 0 : -1}
            onClick={() => setCycle("yearly")}
            onKeyDown={handleKeyDown}
            className="flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-all duration-200"
            style={
              cycle === "yearly"
                ? {
                    background: "var(--c-navy)",
                    color: "var(--c-offwhite)",
                    boxShadow: "0 2px 8px -2px var(--c-shadow)",
                  }
                : { color: "var(--c-ink-soft)" }
            }
          >
            <span>Yearly</span>
            <span
              className="rounded-full px-2 py-0.5 text-xs font-semibold"
              style={{
                background: "var(--c-blue-soft)",
                color: "var(--c-blue)",
              }}
            >
              Save up to ₹6,000
            </span>
          </button>
        </div>
      </div>

      {/* Plan Cards Grid */}
      <div
        id="pricing-cards"
        role="region"
        aria-live="polite"
        className="mt-10 grid gap-6 md:grid-cols-3"
      >
        {plans.map((p) => {
          const isYearly = cycle === "yearly";
          const data = isYearly ? p.yearly : p.monthly;

          return (
            <article
              key={p.id}
              className="card flex flex-col p-6 sm:p-7 transition-all duration-300"
              style={
                p.featured
                  ? { borderColor: "var(--c-blue)", borderWidth: 2 }
                  : undefined
              }
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="h-md" style={{ fontSize: "1.45rem" }}>
                  {p.name}
                </h3>
                {p.featured && (
                  <span
                    className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    style={{
                      background: "var(--c-blue)",
                      color: "var(--c-offwhite)",
                    }}
                  >
                    Most Popular
                  </span>
                )}
              </div>

              {/* Price & Savings Block with calm opacity/transform transition */}
              <div className="mt-4 min-h-[4.8rem]">
                <div className="flex items-baseline gap-2 flex-wrap">
                  {isYearly && (
                    <span
                      className="struck-price text-base line-through font-normal"
                      style={{ color: "var(--c-ink-soft)" }}
                    >
                      {p.yearly.standardPriceLabel}
                    </span>
                  )}
                  <div className="flex items-baseline text-[2rem] font-semibold leading-none">
                    <RollingPrice
                      value={formatINR(isYearly ? p.yearly.price : p.monthly.price)}
                    />
                    <div className="relative inline-block ml-1.5 text-base font-normal text-[var(--c-ink-soft)] select-none">
                      <span
                        aria-hidden={isYearly}
                        className="inline-block"
                        style={{
                          opacity: isYearly ? 0 : 1,
                          transform: isYearly ? "translate3d(0, 4px, 0)" : "none",
                          transition: "opacity 0.4s var(--ease), transform 0.4s var(--ease)",
                          pointerEvents: isYearly ? "none" : "auto",
                        }}
                      >
                        /month
                      </span>
                      <span
                        aria-hidden={!isYearly}
                        className="absolute left-0 top-0 inline-block"
                        style={{
                          opacity: isYearly ? 1 : 0,
                          transform: isYearly ? "none" : "translate3d(0, -4px, 0)",
                          transition: "opacity 0.4s var(--ease), transform 0.4s var(--ease)",
                          pointerEvents: isYearly ? "auto" : "none",
                        }}
                      >
                        /year
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-2 min-h-[1.5rem]">
                  {isYearly ? (
                    <span
                      data-savings-badge
                      className="badge-pop inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold"
                      style={{
                        background: "var(--c-blue-soft)",
                        color: "var(--c-blue)",
                      }}
                    >
                      {p.yearly.savingsLabel}
                    </span>
                  ) : (
                    <p
                      className="text-xs font-medium"
                      style={{ color: "var(--c-ink-soft)" }}
                    >
                      Billed monthly
                    </p>
                  )}
                </div>
              </div>

              <p className="muted mt-3 text-[.94rem] leading-snug">{p.blurb}</p>

              <div
                className="mt-5 rounded-lg p-3 text-xs"
                style={{
                  background: "var(--c-surface-2)",
                  border: "1px solid var(--c-line)",
                }}
              >
                <div className="font-semibold text-[.88rem]" style={{ color: "var(--c-navy)" }}>
                  {data.minutesLabel}
                </div>
                <div className="mt-1" style={{ color: "var(--c-ink-soft)" }}>
                  Max {data.perCall} per call • Est. {data.estimatedCalls}
                </div>
              </div>

              <ul className="mt-5 flex-1 space-y-2.5 text-[.92rem]">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <span
                      aria-hidden
                      className="mt-0.5 font-bold"
                      style={{ color: "var(--c-blue)" }}
                    >
                      ✓
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <p className="muted mt-6 text-[.84rem]">
                <b className="font-medium" style={{ color: "var(--c-navy)" }}>
                  Ideal for:
                </b>{" "}
                {p.ideal}
              </p>

              <Link
                href="/signup"
                className={`btn mt-6 w-full ${
                  p.featured ? "btn-primary" : "btn-ghost"
                }`}
              >
                Get Started
              </Link>
            </article>
          );
        })}
      </div>

      {/* Yearly view note under the cards */}
      {cycle === "yearly" && (
        <p
          className="muted mt-4 text-center text-xs sm:text-sm transition-opacity duration-300"
          style={{ color: "var(--c-ink-soft)" }}
        >
          {pricingHeader.yearlyNote}
        </p>
      )}

      {/* Contact us for a custom plan callout */}
      <div className="card mt-8 flex flex-col items-center justify-between gap-4 p-6 sm:flex-row sm:text-left text-center">
        <div>
          <h3 className="h-md" style={{ fontSize: "1.25rem" }}>
            Need a tailored setup?
          </h3>
          <p className="muted mt-1 text-sm">
            Need custom minutes, dedicated calling capacity, or specialized workflows?
          </p>
        </div>
        <Link href="/contact" className="btn btn-ghost flex-none text-sm">
          Contact us for a custom plan
        </Link>
      </div>

      {/* Comparison Table */}
      <section className="mt-20" aria-labelledby="compare-h">
        <h2 id="compare-h" className="h-md">
          Compare plans
        </h2>
        <div className="card mt-6 overflow-hidden p-2 md:p-4">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[540px] table-fixed text-left text-[.82rem] md:text-[.94rem]">
              <thead>
                <tr>
                  <th scope="col" className="w-[30%] p-2.5 md:p-3">
                    <span className="sr-only">Feature</span>
                  </th>
                  {comparison.columns.map((c) => (
                    <th key={c} scope="col" className="p-2.5 font-semibold md:p-3">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparison.rows.map((r) => {
                  const values =
                    "values" in r
                      ? (r.values as string[])
                      : cycle === "yearly"
                      ? r.yearly
                      : r.monthly;

                  return (
                    <tr
                      key={r.label}
                      className="border-t"
                      style={{ borderColor: "var(--c-line)" }}
                    >
                      <th scope="row" className="p-2.5 font-medium md:p-3">
                        {r.label}
                      </th>
                      {values.map((v, i) => (
                        <td key={i} className="break-words p-2.5 md:p-3">
                          {v}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Additional Calling Packs */}
      <section className="mt-20" aria-labelledby="packs-h">
        <div className="max-w-2xl">
          <p className="muted text-sm font-medium">{minutePacks.heading}</p>
          <h2 id="packs-h" className="h-md mt-1">
            {minutePacks.title}
          </h2>
          <p className="muted mt-3 text-[.95rem]">{minutePacks.body}</p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {minutePacks.packs.map((pk) => (
            <div
              key={pk.minutes}
              className="card flex flex-col justify-between p-5"
            >
              <div>
                <span
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--c-blue)" }}
                >
                  Calling pack
                </span>
                <h3 className="h-md mt-1" style={{ fontSize: "1.35rem" }}>
                  {pk.minutes} minutes
                </h3>
              </div>
              <div
                className="mt-6 pt-4 border-t flex items-baseline justify-between"
                style={{ borderColor: "var(--c-line)" }}
              >
                <p className="text-[1.75rem] font-semibold leading-none">
                  {pk.priceLabel}
                </p>
                <span className="muted text-xs">top-up</span>
              </div>
            </div>
          ))}
        </div>
        <p className="muted mt-4 text-xs">{minutePacks.note}</p>
      </section>

      {/* How billing works */}
      <section className="mt-20" aria-labelledby="billing-h">
        <h2 id="billing-h" className="h-md">
          How billing works
        </h2>
        <dl
          className="card mt-6 grid gap-6 p-6 sm:grid-cols-2 md:p-8"
          style={{ borderColor: "var(--c-line)" }}
        >
          {billingRules.map((rule) => (
            <div key={rule.k} className="flex flex-col gap-1">
              <dt
                className="font-semibold text-[.96rem]"
                style={{ color: "var(--c-navy)" }}
              >
                {rule.k}
              </dt>
              <dd className="muted text-[.92rem] leading-relaxed">{rule.v}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Footnote */}
      <p className="muted mt-16 text-xs sm:text-sm">{pricingHeader.footnote}</p>
    </div>
  );
}
