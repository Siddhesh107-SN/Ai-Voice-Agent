"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import {
  Terminal,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Server,
  Code,
  Lock,
  Layers,
  Sparkles,
} from "lucide-react";

export default function ApiSwaggerPage() {
  const { user, isSuperAdmin } = useAuth();
  const [embedIframe, setEmbedIframe] = useState(false);

  // Default FastAPI backend URL
  const backendBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:8000";
  const docsUrl = `${backendBaseUrl}/docs`;
  const redocUrl = `${backendBaseUrl}/redoc`;
  const openApiUrl = `${backendBaseUrl}/openapi.json`;

  const handleOpenDocs = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-3xl bg-gradient-to-r from-[#0d1017] via-[#121622] to-[#0a0d14] border border-white/10 shadow-2xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-glow-emerald shrink-0">
            <Terminal className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-white">
                FastAPI Swagger & API Docs
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                SWAGGER UI
              </span>
            </div>
            <p className="text-xs text-white/50 mt-0.5">
              Interactive OpenAPI documentation, schema contracts, and endpoint exploration for developers.
            </p>
          </div>
        </div>

        {/* OPEN FASTAPI DOCS Action Button (Requirement #5) */}
        <div className="flex items-center gap-2">
          <Button
            onClick={() => handleOpenDocs(docsUrl)}
            className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-glow-emerald font-semibold gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            OPEN FASTAPI DOCS
          </Button>
        </div>
      </div>

      {/* Security & Access Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-3xl bg-[#0c0e14]/90 border border-white/10 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>Super Admin Protected</span>
          </div>
          <p className="text-xs text-white/60 leading-relaxed">
            API documentation access is restricted to verified platform administrators. Production routes require Bearer token authorization.
          </p>
        </div>

        <div className="p-4 rounded-3xl bg-[#0c0e14]/90 border border-white/10 space-y-2">
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold">
            <Server className="w-4 h-4" />
            <span>FastAPI Server Endpoint</span>
          </div>
          <p className="text-xs font-mono text-white/80 truncate">
            {backendBaseUrl}
          </p>
          <div className="text-[11px] text-white/40">
            OpenAPI Spec: <span className="font-mono text-emerald-400">/openapi.json</span>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-[#0c0e14]/90 border border-white/10 space-y-2">
          <div className="flex items-center gap-2 text-purple-400 text-xs font-semibold">
            <Code className="w-4 h-4" />
            <span>Alternative ReDoc UI</span>
          </div>
          <p className="text-xs text-white/60">
            Clean three-panel static API documentation format.
          </p>
          <button
            type="button"
            onClick={() => handleOpenDocs(redocUrl)}
            className="text-xs text-purple-300 hover:text-purple-200 underline flex items-center gap-1 font-medium"
          >
            Open ReDoc <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Embedded Swagger Preview Option */}
      <div className="p-5 rounded-3xl bg-[#0c0e14]/90 border border-white/10 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-base">Direct Swagger UI Integration</h3>
            <p className="text-xs text-white/40">
              Launch the native FastAPI interactive Swagger docs in a new tab or preview inline below.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEmbedIframe(!embedIframe)}
              className="text-xs text-white/60 hover:text-white border border-white/10"
            >
              {embedIframe ? "Hide Inline Preview" : "Show Inline Preview"}
            </Button>
            <Button
              size="sm"
              onClick={() => handleOpenDocs(docsUrl)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs shadow-glow-emerald"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              Open In New Tab
            </Button>
          </div>
        </div>

        {embedIframe ? (
          <div className="rounded-2xl border border-white/10 overflow-hidden bg-white/5 h-[700px]">
            <iframe
              src={docsUrl}
              title="FastAPI Swagger Documentation"
              className="w-full h-full border-0 bg-white"
            />
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-black/40 border border-white/5 text-center space-y-3">
            <Terminal className="w-10 h-10 text-emerald-400/40 mx-auto" />
            <div className="text-sm font-semibold text-white">FastAPI Swagger UI Ready</div>
            <p className="text-xs text-white/50 max-w-md mx-auto">
              Click &quot;OPEN FASTAPI DOCS&quot; above to view live endpoints, test requests with Bearer tokens, and inspect Pydantic schemas at <span className="font-mono text-emerald-400">{docsUrl}</span>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
