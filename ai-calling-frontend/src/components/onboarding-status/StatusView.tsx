import Link from "next/link";
import {
  DASHBOARD_PATH,
  HOME_PATH,
  PAYMENT_PAGE_PATH,
  SUPPORT_HREF,
} from "@/config/onboardingStatus";
import { maskReference } from "@/lib/onboardingStatusService";
import {
  STAGES,
  type OnboardingStatus,
  type PaymentStatus,
  type StatusViewState,
} from "@/lib/onboardingStatusTypes";
import s from "./onboarding-status.module.css";

const PAYMENT_COPY: Record<PaymentStatus, { label: string; message: string; tone: string }> = {
  awaiting_submission: {
    label: "Awaiting payment submission",
    message:
      "You have selected your Talkaor package. Complete your payment and submit the transaction details so our team can review them.",
    tone: s.toneNeutral,
  },
  pending_verification: {
    label: "Payment verification pending",
    message:
      "We have received your payment details. Our team will manually review the transaction. Your payment is not yet verified, and onboarding will begin after verification.",
    tone: s.toneWarn,
  },
  verified: {
    label: "Payment verified",
    message:
      "Your payment has been verified. Our onboarding process will commence within 24 hours. Our team will contact you to understand your business requirements and configure your AI voice agent.",
    tone: s.toneOk,
  },
  rejected: {
    label: "Action required",
    message:
      "Our team could not confirm your payment details. Please review the instructions provided and contact Talkaor support if you need assistance.",
    tone: s.toneBad,
  },
};

function formatAmount(d: OnboardingStatus) {
  if (d.amount == null) return undefined;
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: d.currency || "INR",
      maximumFractionDigits: 0,
    }).format(d.amount);
  } catch {
    return String(d.amount);
  }
}

function formatDate(iso?: string) {
  if (!iso) return undefined;
  const t = new Date(iso);
  return isNaN(t.getTime())
    ? undefined
    : t.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function Row({ k, v }: { k: string; v?: string }) {
  if (!v) return null;
  return (
    <div className={s.row}>
      <dt>{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}

function Progress({ d }: { d: OnboardingStatus }) {
  const current = d.onboardingStage ? STAGES.findIndex((x) => x.id === d.onboardingStage) : -1;
  return (
    <ol className={s.steps}>
      {STAGES.map((st, i) => {
        const state = current < 0 ? "upcoming" : i < current ? "done" : i === current ? "current" : "upcoming";
        const label = state === "done" ? "Done" : state === "current" ? "Current step" : "Upcoming";
        return (
          <li
            key={st.id}
            className={`${s.step} ${s[state]}`}
            aria-current={state === "current" ? "step" : undefined}
          >
            <span className={s.dot} aria-hidden="true">
              {state === "done" ? "✓" : i + 1}
            </span>
            <div>
              <div className={s.stepTitle}>
                {st.title} <span className={s.stepTag}>{label}</span>
              </div>
              <div className={s.stepDesc}>{st.description}</div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default function StatusView({
  state,
  onRetry,
}: {
  state: StatusViewState;
  onRetry: () => void;
}) {
  return (
    <div className={s.page}>
      <nav className={s.nav}>
        <span className={s.logo}>
          talkaor<span>.</span>
        </span>
        <Link href={HOME_PATH} className={s.navLink}>
          Back to home
        </Link>
      </nav>
      <section className={s.main}>
        {state.kind === "ready" && state.isPreview && (
          <p className={s.previewTag}>Preview with sample data. This is not a live status.</p>
        )}
        <h1 className={s.h1}>Your Talkaor Onboarding Status</h1>

        {state.kind === "loading" && (
          <p role="status" aria-live="polite" className={s.lead}>
            Loading your current status…
          </p>
        )}

        {state.kind === "error" && (
          <section className={s.card} role="alert">
            <h2 className={s.h2}>{state.message}</h2>
            <p className={s.msg}>
              Your payment status is unknown right now. Please try again in a moment.
            </p>
            <div className={s.actions}>
              <button className={s.primary} onClick={onRetry}>
                Try again
              </button>
              <Link href={HOME_PATH} className={s.secondary}>
                Back to home
              </Link>
              {SUPPORT_HREF && (
                <a className={s.secondary} href={SUPPORT_HREF}>
                  Contact support
                </a>
              )}
            </div>
          </section>
        )}

        {state.kind === "ready" &&
          (() => {
            const d = state.data;
            const c = PAYMENT_COPY[d.paymentStatus];
            const canOpenDashboard = d.dashboardAccessGranted === true && !!DASHBOARD_PATH;
            return (
              <div className={s.grid}>
                <section className={s.card} aria-labelledby="pay-h">
                  <h2 id="pay-h" className={s.h3}>
                    Payment status
                  </h2>
                  <p className={`${s.pill} ${c.tone}`}>{c.label}</p>
                  <p className={s.msg}>{c.message}</p>
                  {d.paymentStatus === "rejected" && d.rejectionReason && (
                    <p className={s.reason}>
                      <strong>Reason from our team:</strong> {d.rejectionReason}
                    </p>
                  )}
                  <dl className={s.rows}>
                    <Row k="Business name" v={d.businessName} />
                    <Row k="Package" v={d.packageName} />
                    <Row k="Amount submitted" v={formatAmount(d)} />
                    <Row k="Submitted on" v={formatDate(d.submittedAt)} />
                    <Row k="Transaction reference" v={maskReference(d.transactionRef)} />
                  </dl>
                  <div className={s.actions}>
                    {(d.paymentStatus === "awaiting_submission" || d.paymentStatus === "rejected") &&
                      PAYMENT_PAGE_PATH && (
                        <Link href={PAYMENT_PAGE_PATH} className={s.primary}>
                          Go to payment page
                        </Link>
                      )}
                    <button
                      className={
                        d.paymentStatus === "pending_verification" || d.paymentStatus === "verified"
                          ? s.primary
                          : s.secondary
                      }
                      onClick={onRetry}
                    >
                      Refresh status
                    </button>
                    <Link href={HOME_PATH} className={s.secondary}>
                      Back to home
                    </Link>
                    {SUPPORT_HREF && (
                      <a className={s.secondary} href={SUPPORT_HREF}>
                        Contact support
                      </a>
                    )}
                  </div>
                </section>

                <section className={s.card} aria-labelledby="prog-h">
                  <h2 id="prog-h" className={s.h3}>
                    Onboarding progress
                  </h2>
                  <Progress d={d} />
                  {canOpenDashboard ? (
                    <Link href={DASHBOARD_PATH} className={s.primary}>
                      Open your dashboard
                    </Link>
                  ) : (
                    <p className={s.note}>
                      Dashboard access is switched on by Talkaor after setup is complete. It is not
                      unlocked by this page.
                    </p>
                  )}
                </section>
              </div>
            );
          })()}
      </section>
    </div>
  );
}
