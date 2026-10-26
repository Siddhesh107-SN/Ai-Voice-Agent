"use client";

import React, { useEffect, useState } from "react";

export type BotState = "idle" | "watching" | "typing" | "password" | "error" | "dancing";

interface AuthBotsProps {
  state: BotState;
  lineLengths?: number[];
  statusText?: string;
  singleBot?: boolean;
  hidePill?: boolean;
  className?: string;
}

export default function AuthBots({
  state,
  lineLengths = [0, 0, 0, 0],
  statusText,
  singleBot = false,
  hidePill = false,
  className = "",
}: AuthBotsProps) {
  const [internalStatus, setInternalStatus] = useState("Hi! We’ll take notes.");

  useEffect(() => {
    if (statusText) {
      setInternalStatus(statusText);
      return;
    }
    if (state === "dancing") {
      setInternalStatus("Almost there! Let’s dance.");
      return;
    }
    if (state === "error") {
      setInternalStatus("Oops. Something’s not right.");
      const timer = window.setTimeout(() => {
        setInternalStatus("Fix the highlighted fields.");
      }, 2200);
      return () => window.clearTimeout(timer);
    }
    if (state === "password") {
      setInternalStatus("We’re not looking.");
      return;
    }
    if (state === "watching" || state === "typing") {
      setInternalStatus("Taking notes…");
      return;
    }
    setInternalStatus("Hi! We’ll take notes.");
  }, [state, statusText]);

  // Map state to CSS classes
  const rootClass = [
    "auth-bots-root",
    state === "watching" ? "watch" : "",
    state === "typing" ? "watch write" : "",
    state === "password" ? "away" : "",
    state === "error" ? "fail" : "",
    state === "dancing" ? "dance" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  // Spiral path for dizzy error eyes
  const spiral = (x: number) => (
    <path
      d={`M${x} 57a2 2 0 0 1 4 0a4 4 0 0 1-8 0a6 6 0 0 1 12 0a8 8 0 0 1-16 0`}
      fill="none"
      stroke="#fff"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  );

  return (
    <div className={rootClass}>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <linearGradient id="gblue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#4A7BC0" />
            <stop offset="1" stopColor="#1E3D6B" />
          </linearGradient>
          <linearGradient id="gind" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5A5DCC" />
            <stop offset="1" stopColor="#26286E" />
          </linearGradient>
        </defs>
      </svg>

      <div className="scene relative h-[300px] mt-[18px] max-[720px]:h-[150px] max-[720px]:mt-[6px] z-[1]">
        {/* Bot 1: takes notes */}
        <div className="bw w1 absolute left-[6%] top-[90px] w-[48%] max-[720px]:left-[12%] max-[720px]:top-[26px] max-[720px]:w-[104px]">
          <svg
            viewBox="0 0 130 150"
            width="100%"
            aria-hidden="true"
            style={{ display: "block", overflow: "visible" }}
          >
            <g style={{ ["--turn" as string]: "-12deg", ["--d" as string]: "0s" }}>
              <ellipse cx="65" cy="143" rx="30" ry="4.5" fill="#000" fillOpacity="0.3" />
              <rect x="46" y="122" width="15" height="19" rx="7.5" fill="url(#gblue)" />
              <rect x="69" y="122" width="15" height="19" rx="7.5" fill="url(#gblue)" />
              <rect x="40" y="84" width="50" height="46" rx="20" fill="url(#gblue)" />
              <rect
                x="29"
                y="92"
                width="14"
                height="30"
                rx="7"
                fill="url(#gblue)"
                transform="rotate(8 36 96)"
              />

              {/* Notebook */}
              <g className="nb">
                <rect
                  x="46"
                  y="98"
                  width="38"
                  height="28"
                  rx="3"
                  fill="#F4EFE6"
                  stroke="#9FB4D6"
                  strokeWidth="1.5"
                />
                <rect
                  x="51"
                  y="104"
                  width={lineLengths[0] ?? 0}
                  height="2.6"
                  rx="1.3"
                  fill="var(--c-royal)"
                  fillOpacity="0.7"
                />
                <rect
                  x="51"
                  y="110"
                  width={lineLengths[1] ?? 0}
                  height="2.6"
                  rx="1.3"
                  fill="var(--c-royal)"
                  fillOpacity="0.7"
                />
                <rect
                  x="51"
                  y="116"
                  width={lineLengths[2] ?? 0}
                  height="2.6"
                  rx="1.3"
                  fill="var(--c-royal)"
                  fillOpacity="0.7"
                />
                <rect
                  x="51"
                  y="121"
                  width={lineLengths[3] ?? 0}
                  height="2.2"
                  rx="1.1"
                  fill="var(--c-orange)"
                />
                <g className="pen">
                  <line
                    x1="86"
                    y1="112"
                    x2="94"
                    y2="98"
                    stroke="var(--c-orange)"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </g>
              </g>

              {/* Right arm */}
              <g className="armr" style={{ transformOrigin: "91px 98px" }}>
                <rect x="84" y="92" width="14" height="30" rx="7" fill="url(#gblue)" />
              </g>

              {/* Head */}
              <g className="head" style={{ transformOrigin: "63px 88px" }}>
                <path d="M104 46L121 29Q127 54 108 66Z" fill="#2E5287" />
                <circle cx="106" cy="58" r="5.5" fill="#183257" />
                <rect x="17" y="20" width="92" height="68" rx="30" fill="url(#gblue)" />
                <rect x="25" y="28" width="76" height="50" rx="22" fill="#05050B" />
                <ellipse cx="42" cy="26" rx="16" ry="4.5" fill="#fff" fillOpacity="0.14" />

                {/* Normal eyes */}
                <g className="look">
                  <g className="eyes" style={{ ["--bd" as string]: "2s" }}>
                    <path d="M41 60a9 10 0 0 1 18 0Z" fill="#fff" />
                    <path d="M67 60a9 10 0 0 1 18 0Z" fill="#fff" />
                  </g>
                  <line
                    x1="41"
                    y1="60"
                    x2="85"
                    y2="60"
                    stroke="#fff"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </g>

                {/* Dizzy eyes */}
                <g className="dz">
                  <g>{spiral(50)}</g>
                  <g>{spiral(76)}</g>
                </g>
              </g>
            </g>
          </svg>
        </div>

        {/* Bot 2: hops and waves (hidden in singleBot mode) */}
        {!singleBot && (
          <div className="bw w2 absolute right-[4%] top-[20px] w-[42%] max-[720px]:right-[12%] max-[720px]:top-[4px] max-[720px]:w-[96px]">
            <svg
              viewBox="0 0 130 150"
              width="100%"
              aria-hidden="true"
              className="jump"
              style={{ display: "block", overflow: "visible" }}
            >
              <g style={{ ["--turn" as string]: "16deg", ["--d" as string]: "0.12s" }}>
                <ellipse cx="65" cy="143" rx="30" ry="4.5" fill="#000" fillOpacity="0.3" />
                <rect x="46" y="122" width="15" height="19" rx="7.5" fill="url(#gind)" />
                <rect x="69" y="122" width="15" height="19" rx="7.5" fill="url(#gind)" />
                <rect x="40" y="84" width="50" height="46" rx="20" fill="url(#gind)" />
                <rect
                  x="29"
                  y="92"
                  width="14"
                  height="30"
                  rx="7"
                  fill="url(#gind)"
                  transform="rotate(8 36 96)"
                />

                {/* Right arm (raises on write/jump) */}
                <g className="armr" style={{ transformOrigin: "91px 98px" }}>
                  <rect x="84" y="92" width="14" height="30" rx="7" fill="url(#gind)" />
                </g>

                {/* Head */}
                <g className="head" style={{ transformOrigin: "63px 88px" }}>
                  <path d="M104 46L121 29Q127 54 108 66Z" fill="var(--c-orange)" />
                  <circle cx="106" cy="58" r="5.5" fill="#183257" />
                  <rect x="17" y="20" width="92" height="68" rx="30" fill="url(#gind)" />
                  <rect x="25" y="28" width="76" height="50" rx="22" fill="#05050B" />
                  <ellipse cx="42" cy="26" rx="16" ry="4.5" fill="#fff" fillOpacity="0.14" />

                  {/* Normal eyes */}
                  <g className="look">
                    <g className="eyes" style={{ ["--bd" as string]: "3.4s" }}>
                      <path d="M41 60a9 10 0 0 1 18 0Z" fill="#fff" />
                      <path d="M67 60a9 10 0 0 1 18 0Z" fill="#fff" />
                    </g>
                    <line
                      x1="41"
                      y1="60"
                      x2="85"
                      y2="60"
                      stroke="#fff"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </g>

                  {/* Dizzy eyes */}
                  <g className="dz">
                    <g>{spiral(50)}</g>
                    <g>{spiral(76)}</g>
                  </g>
                </g>
              </g>
            </svg>
          </div>
        )}
      </div>

      {/* Status Pill */}
      {!hidePill && (
        <div className="flex justify-center mt-1">
          <div
            role="status"
            aria-live="polite"
            className="pill relative z-[2] text-xs font-medium rounded-full px-3.5 py-1.5"
            style={{
              color: "#E8ECFF",
              background: "var(--c-auth-pill-bg)",
              border: "1px solid var(--c-auth-pill-line)",
            }}
          >
            {internalStatus}
          </div>
        </div>
      )}
    </div>
  );
}
