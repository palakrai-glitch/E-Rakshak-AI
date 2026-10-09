"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getTriageResult, TriageResult } from "@/lib/api";
import { cn } from "@/lib/utils";
import { 
  Activity, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle, 
  ArrowRight,
  ChevronLeft,
  Loader2,
  ListChecks,
  AlertOctagon
} from "lucide-react";

function TriageContent() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.caseId as string;
  
  const [triage, setTriage] = useState<TriageResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTriage() {
      if (!caseId) return;
      const result = await getTriageResult(caseId);
      setLoading(false);
      if (result.ok) {
        setTriage(result.data);
      } else {
        setError(result.error);
      }
    }
    loadTriage();
  }, [caseId]);

  if (loading) {
    return (
      <div className="flex-1 bg-bg-main flex flex-col items-center justify-center p-6 min-h-[calc(100vh-4rem)]">
        <Loader2 className="w-12 h-12 text-brand-primary animate-spin mb-6" />
        <h2 className="text-xl font-bold text-text-primary mb-2">Analyzing Clinical Data</h2>
        <p className="text-text-secondary text-sm">Processing symptoms against priority matrix...</p>
      </div>
    );
  }

  if (error || !triage) {
    return (
      <div className="flex-1 bg-bg-main flex flex-col items-center justify-center p-6 min-h-[calc(100vh-4rem)]">
        <div className="max-w-md w-full bg-bg-surface border border-status-danger/30 rounded-xl p-8 shadow-xl text-center">
          <AlertOctagon className="w-16 h-16 text-status-danger mx-auto mb-4" />
          <h2 className="text-xl font-bold text-text-primary mb-2">Assessment Failed</h2>
          <p className="text-text-secondary mb-8">{error || "Case data not found or corrupted."}</p>
          <button 
            onClick={() => router.push('/intake')}
            className="w-full py-3 bg-bg-secondary hover:bg-bg-elevated border border-border-strong text-text-primary rounded-lg font-medium transition-colors"
          >
            Return to Intake
          </button>
        </div>
      </div>
    );
  }

  const getPriorityStyle = (priority: string) => {
    switch(priority) {
      case "CRITICAL":
        return {
          card: "bg-status-danger/5 border-status-danger/30 shadow-[0_0_30px_rgba(239,68,68,0.1)]",
          text: "text-status-danger",
          icon: <ShieldAlert className="w-8 h-8 text-status-danger" />,
          badge: "bg-status-danger text-white shadow-lg shadow-status-danger/30"
        };
      case "HIGH":
        return {
          card: "bg-status-warning/5 border-status-warning/30 shadow-[0_0_30px_rgba(249,115,22,0.1)]",
          text: "text-status-warning",
          icon: <AlertTriangle className="w-8 h-8 text-status-warning" />,
          badge: "bg-status-warning text-white shadow-lg shadow-status-warning/30"
        };
      case "MODERATE":
        return {
          card: "bg-status-info/5 border-status-info/30",
          text: "text-status-info",
          icon: <Activity className="w-8 h-8 text-status-info" />,
          badge: "bg-status-info text-white"
        };
      default:
        return {
          card: "bg-status-success/5 border-status-success/30",
          text: "text-status-success",
          icon: <CheckCircle className="w-8 h-8 text-status-success" />,
          badge: "bg-status-success text-white"
        };
    }
  };

  const style = getPriorityStyle(triage.priority);

  return (
    <div className="flex-1 bg-bg-main p-4 md:p-6 lg:p-8 min-h-[calc(100vh-4rem)]">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary mb-1">Algorithmic Triage Assessment</h1>
            <p className="text-text-muted text-sm font-medium">Evaluation for Case <span className="font-mono text-brand-secondary">{caseId}</span></p>
          </div>
          <Link 
            href="/intake" 
            className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors px-3 py-1.5 rounded-md hover:bg-bg-surface border border-transparent hover:border-border-strong"
          >
            <ChevronLeft size={16} /> New Intake
          </Link>
        </div>

        {/* Disclaimer */}
        <div className="bg-brand-primary/10 border border-brand-primary/20 rounded-lg p-4 flex items-start gap-3">
          <Activity className="text-brand-primary shrink-0 mt-0.5" size={18} />
          <p className="text-sm text-brand-primary/90 font-medium leading-relaxed">{triage.disclaimer}</p>
        </div>

        {/* Priority Result Card */}
        <section className={cn("rounded-2xl border p-8 md:p-12 text-center transition-all relative overflow-hidden", style.card)}>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-20"></div>
          
          <div className="flex justify-center mb-6">{style.icon}</div>
          
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-text-muted mb-3">Computed Operational Priority</p>
          
          <div className="inline-block mb-8">
            <h2 className={cn("text-6xl md:text-7xl font-extrabold tracking-tight", style.text)}>
              {triage.priority}
            </h2>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
            <div className="flex flex-col items-center">
              <span className="text-xs text-text-muted uppercase tracking-wider font-bold mb-1">Acuity Score</span>
              <span className="text-2xl font-bold text-text-primary font-mono">{triage.score}<span className="text-lg text-text-muted">/100</span></span>
            </div>
            
            <div className="w-px h-10 bg-border-strong hidden sm:block"></div>
            
            <div className="flex flex-col items-center">
              <span className="text-xs text-text-muted uppercase tracking-wider font-bold mb-1">Data Quality</span>
              <span className="text-lg font-bold text-text-primary">{triage.data_completeness}</span>
            </div>
          </div>
        </section>

        {/* Contributing Factors */}
        <section className="bg-bg-surface border border-border-strong rounded-xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-border-subtle flex items-center gap-2">
            <ListChecks className="text-brand-primary" size={18} />
            <h3 className="text-base font-bold text-text-primary">Clinical Contributing Factors</h3>
          </div>
          
          <div className="p-5">
            {triage.factors.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-10 h-10 text-status-success/50 mx-auto mb-3" />
                <p className="text-text-secondary font-medium">No critical concerning indicators detected.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {triage.factors.map((factor, idx) => (
                  <div key={idx} className="flex items-start justify-between p-4 bg-bg-secondary rounded-lg border border-border-strong hover:border-brand-primary/30 transition-colors">
                    <div>
                      <p className="text-sm text-text-primary font-medium leading-relaxed">{factor.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted bg-bg-surface border border-border-subtle px-2 py-0.5 rounded shadow-sm">
                          {factor.category}
                        </span>
                        <span className="text-[10px] text-text-muted font-mono">{factor.rule_id}</span>
                      </div>
                    </div>
                    <div className={cn("text-lg font-bold shrink-0 ml-4", style.text)}>
                      +{factor.score_contribution}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Action */}
        <div className="pt-6">
          <button 
            onClick={() => router.push(`/cases/${triage.case_id}/matching`)}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-brand-primary hover:bg-brand-accent text-white font-bold rounded-xl shadow-lg shadow-brand-primary/20 transition-all hover:-translate-y-0.5"
          >
            Acknowledge & Proceed to Orchestration
            <ArrowRight size={18} />
          </button>
        </div>

      </div>
    </div>
  );
}

export default function TriagePage() {
  return (
    <Suspense fallback={
      <div className="flex-1 bg-bg-main flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="w-10 h-10 text-brand-primary animate-spin" />
      </div>
    }>
      <TriageContent />
    </Suspense>
  );
}
