"use client";

/**
 * SystemStatus component
 *
 * Polls GET /api/health once on mount and displays a colour-coded badge
 * showing whether the backend is reachable.
 *
 * Phase 1 scope: infrastructure health only — no emergency-care logic.
 */

import { useEffect, useState } from "react";
import { fetchHealth, type HealthResponse } from "@/lib/api";

type Status = "checking" | "connected" | "unavailable";

export default function SystemStatus() {
  const [status, setStatus] = useState<Status>("checking");
  const [detail, setDetail] = useState<HealthResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const result = await fetchHealth();

      if (cancelled) return;

      if (result.ok) {
        setStatus("connected");
        setDetail(result.data);
        setErrorMsg(null);
      } else {
        setStatus("unavailable");
        setErrorMsg(result.error);
      }
    }

    check();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      id="system-status-card"
      className="status-card"
      role="status"
      aria-live="polite"
    >
      <div className="status-header">
        <span className="status-label">System Status</span>
        <StatusBadge status={status} />
      </div>

      {status === "checking" && (
        <p className="status-body status-checking">
          Contacting backend…
        </p>
      )}

      {status === "connected" && detail && (
        <div className="status-body status-connected">
          <p>
            <strong>Backend:</strong> Connected
          </p>
          <p>
            <strong>Service:</strong> {detail.service}
          </p>
          <p>
            <strong>Version:</strong> {detail.version}
          </p>
          <p>
            <strong>Environment:</strong> {detail.environment}
          </p>
        </div>
      )}

      {status === "unavailable" && (
        <div className="status-body status-unavailable">
          <p>
            <strong>Backend:</strong> Unavailable
          </p>
          {errorMsg && (
            <p className="status-error-msg">
              {errorMsg}
            </p>
          )}
          <p className="status-hint">
            Ensure the FastAPI server is running on{" "}
            <code>{process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}</code>.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Inline sub-component ───────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Status }) {
  const classMap: Record<Status, string> = {
    checking: "badge badge-checking",
    connected: "badge badge-connected",
    unavailable: "badge badge-unavailable",
  };

  const labelMap: Record<Status, string> = {
    checking: "Checking…",
    connected: "Connected",
    unavailable: "Unavailable",
  };

  return (
    <span
      id={`status-badge-${status}`}
      className={classMap[status]}
      aria-label={`Backend status: ${labelMap[status]}`}
    >
      <span className="badge-dot" aria-hidden="true" />
      {labelMap[status]}
    </span>
  );
}
