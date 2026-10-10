"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity, Ambulance, ArrowRight, Building2, CheckCircle2, ClipboardList,
  FileText, MapPin, ShieldAlert, Stethoscope,
} from "lucide-react";
import { getHospitals, getDoctors, getAmbulances, listEmergencyCases } from "@/lib/api";

type MetricValue = number | null;

export default function HomePage() {
  const [metrics, setMetrics] = useState<{ cases: MetricValue; hospitals: MetricValue; doctors: MetricValue; ambulances: MetricValue; }>({
    cases: null, hospitals: null, doctors: null, ambulances: null,
  });
  const [loading, setLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchMetrics() {
      try {
        const results = await Promise.allSettled([listEmergencyCases(), getHospitals(), getDoctors(), getAmbulances()]);
        if (cancelled) return;
        const [casesResult, hospitalsResult, doctorsResult, ambulancesResult] = results;
        const cases = casesResult.status === "fulfilled" && casesResult.value.ok ? casesResult.value.data.cases.length : null;
        const hospitals = hospitalsResult.status === "fulfilled" && hospitalsResult.value.ok ? hospitalsResult.value.data.length : null;
        const doctors = doctorsResult.status === "fulfilled" && doctorsResult.value.ok ? doctorsResult.value.data.length : null;
        const ambulances = ambulancesResult.status === "fulfilled" && ambulancesResult.value.ok ? ambulancesResult.value.data.length : null;
        setMetrics({ cases, hospitals, doctors, ambulances });
        setHasLoadError([cases, hospitals, doctors, ambulances].some((value) => value === null));
      } catch {
        if (!cancelled) setHasLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchMetrics();
    return () => { cancelled = true; };
  }, []);

  const metricCards = [
    { label: "Cases recorded", value: metrics.cases, icon: ClipboardList },
    { label: "Hospitals listed", value: metrics.hospitals, icon: Building2 },
    { label: "Doctors listed", value: metrics.doctors, icon: Stethoscope },
    { label: "Ambulances listed", value: metrics.ambulances, icon: Ambulance },
  ];
  const workflows = [
    { eyebrow: "PATIENT INTAKE", title: "Report an emergency", description: "Record emergency details, symptoms and patient location in the guided intake flow.", href: "/intake", action: "Start emergency intake", icon: ShieldAlert, iconClass: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300" },
    { eyebrow: "OPERATIONS", title: "Review incidents", description: "Open existing cases and continue to triage, resource matching and care coordination.", href: "/cases", action: "View incidents", icon: ClipboardList, iconClass: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" },
    { eyebrow: "RESOURCE DIRECTORY", title: "Explore resources", description: "Review hospital, doctor and ambulance records in the resource registry.", href: "/resources", action: "Open resource registry", icon: MapPin, iconClass: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200" },
  ];

  return <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
    <section className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)] lg:gap-12">
      <div className="max-w-3xl">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border-subtle bg-bg-surface px-3 py-1.5 text-xs font-semibold text-text-secondary">
          <span className="h-2 w-2 rounded-full bg-brand-primary" />Emergency care coordination platform
        </div>
        <h1 className="max-w-3xl text-3xl font-bold leading-tight tracking-tight text-text-primary sm:text-4xl lg:text-[46px]">
          Get the right emergency care, with less delay.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-text-secondary sm:text-lg">
          Record an emergency, review available resources and coordinate the next steps from one workspace.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Link href="/intake" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-status-danger px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700">
            <ShieldAlert size={18} aria-hidden="true" />Report an emergency<ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link href="/cases" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border-strong bg-bg-surface px-5 py-3 text-sm font-semibold text-text-primary transition-colors hover:bg-bg-elevated">
            <ClipboardList size={18} aria-hidden="true" />View incidents
          </Link>
        </div>
        <p className="mt-4 max-w-xl text-xs leading-5 text-text-muted">
          E-Rakshak AI is a coordination platform and does not replace emergency services. For immediate life-threatening emergencies in India, call 112.
        </p>
      </div>

      <aside className="rounded-xl border border-border-subtle bg-bg-surface p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
            <Activity size={20} aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-text-primary">Coordination workflow</h2>
            <p className="mt-1 text-sm leading-6 text-text-secondary">Follow the existing workflow from case intake through triage, matching and care pathway review.</p>
          </div>
        </div>
        <ol className="mt-5 space-y-4">
          {[
            { title: "Capture the emergency", detail: "Patient details and location", icon: FileText },
            { title: "Review priority", detail: "Use the available triage result", icon: Activity },
            { title: "Coordinate resources", detail: "Review matching and care options", icon: Ambulance },
            { title: "Review the care pathway", detail: "Confirm next steps in the case workflow", icon: CheckCircle2 },
          ].map((step) => {
            const Icon = step.icon;
            return <li key={step.title} className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-bg-elevated text-text-secondary">
                <Icon size={16} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="text-sm font-semibold text-text-primary">{step.title}</div>
                <div className="mt-0.5 text-xs leading-5 text-text-muted">{step.detail}</div>
              </div>
            </li>;
          })}
        </ol>
      </aside>
    </section>

    <section aria-labelledby="workspace-heading" className="mt-10 sm:mt-12">
      <div className="mb-4">
        <h2 id="workspace-heading" className="text-lg font-bold tracking-tight text-text-primary">Workspace</h2>
        <p className="mt-1 text-sm text-text-secondary">Choose where you need to work next.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {workflows.map((workflow) => {
          const Icon = workflow.icon;
          return <article key={workflow.title} className="flex min-w-0 flex-col rounded-xl border border-border-subtle bg-bg-surface p-5 transition-colors hover:border-border-strong sm:p-6">
            <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ${workflow.iconClass}`}><Icon size={20} aria-hidden="true" /></div>
            <p className="text-[10px] font-bold tracking-[0.12em] text-text-muted">{workflow.eyebrow}</p>
            <h3 className="mt-2 text-base font-bold text-text-primary">{workflow.title}</h3>
            <p className="mt-2 flex-1 text-sm leading-6 text-text-secondary">{workflow.description}</p>
            <Link href={workflow.href} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand-primary hover:underline">
              {workflow.action}<ArrowRight size={15} aria-hidden="true" />
            </Link>
          </article>;
        })}
      </div>
    </section>

    <section aria-labelledby="registry-heading" className="mt-10 sm:mt-12">
      <div className="mb-4">
        <h2 id="registry-heading" className="text-lg font-bold tracking-tight text-text-primary">Registry overview</h2>
        <p className="mt-1 text-sm text-text-secondary">Counts returned by the connected API. Unavailable values are shown as a dash, not as zero.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metricCards.map((metric) => {
          const Icon = metric.icon;
          return <div key={metric.label} className="rounded-xl border border-border-subtle bg-bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-text-secondary sm:text-sm">{metric.label}</span>
              <Icon size={17} className="shrink-0 text-text-muted" aria-hidden="true" />
            </div>
            <div aria-live="polite" className="mt-3 text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
              {loading ? <span className="inline-block h-8 w-12 animate-pulse rounded bg-bg-secondary align-middle" /> : metric.value ?? "—"}
            </div>
          </div>;
        })}
      </div>
      <div className="mt-3 flex flex-col gap-1 text-xs text-text-muted sm:flex-row sm:items-center sm:justify-between">
        <span>Resource records may include synthetic demo data; verify availability before operational use.</span>
        {hasLoadError && !loading && <span role="status" className="inline-flex items-center gap-1.5 text-status-warning"><Activity size={13} aria-hidden="true" />Some data could not be loaded. Check the connection and try again.</span>}
      </div>
    </section>
  </div>;
}
