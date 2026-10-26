"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import StatusView from "@/components/onboarding-status/StatusView";
import { fetchOnboardingStatus } from "@/lib/onboardingStatusService";
import type { StatusViewState } from "@/lib/onboardingStatusTypes";

export default function OnboardingStatusPage() {
  const [state, setState] = useState<StatusViewState>({ kind: "loading" });
  const ctrl = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    setState({ kind: "loading" });
    try {
      const data = await fetchOnboardingStatus(c.signal);
      if (!c.signal.aborted) setState({ kind: "ready", data });
    } catch {
      if (!c.signal.aborted)
        setState({ kind: "error", message: "We could not load your current status." });
    }
  }, []);

  useEffect(() => {
    load();
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      ctrl.current?.abort();
    };
  }, [load]);

  return <StatusView state={state} onRetry={load} />;
}
