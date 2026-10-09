"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getMatchingOptions, MatchingResult, ResourceMatch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { 
  Network, 
  ChevronLeft, 
  Loader2, 
  Ambulance, 
  Building2, 
  Stethoscope, 
  Award,
  ArrowRight,
  TrendingUp,
  AlertOctagon
} from "lucide-react";

function MatchingContent() {
  const params = useParams();
  const router = useRouter();
  const caseId = params?.caseId as string;
  const [matching, setMatching] = useState<MatchingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"ambulances" | "hospitals" | "doctors">("ambulances");

  useEffect(() => {
    async function fetchMatching() {
      const res = await getMatchingOptions(caseId);
      if (res.ok) {
        setMatching(res.data);
      } else {
        setError(res.error || "Failed to load matching options.");
      }
      setLoading(false);
    }
    fetchMatching();
  }, [caseId]);

  if (loading) {
    return (
      <div className="flex-1 bg-bg-main flex flex-col items-center justify-center p-6 min-h-[calc(100vh-4rem)]">
        <Loader2 className="w-12 h-12 text-brand-primary animate-spin mb-6" />
        <h2 className="text-xl font-bold text-text-primary mb-2">Executing Matching Algorithm</h2>
        <p className="text-text-secondary text-sm">Evaluating spatial distance, capacity, and clinical fit...</p>
      </div>
    );
  }

  if (error || !matching) {
    return (
      <div className="flex-1 bg-bg-main flex flex-col items-center justify-center p-6 min-h-[calc(100vh-4rem)]">
        <div className="max-w-md w-full bg-bg-surface border border-status-danger/30 rounded-xl p-8 shadow-xl text-center">
          <AlertOctagon className="w-16 h-16 text-status-danger mx-auto mb-4" />
          <h2 className="text-xl font-bold text-text-primary mb-2">Matching Failed</h2>
          <p className="text-text-secondary mb-8">{error || "Unable to compute resource matches."}</p>
          <button 
            onClick={() => router.push(`/cases/${caseId}/triage`)}
            className="w-full py-3 bg-bg-secondary hover:bg-bg-elevated border border-border-strong text-text-primary rounded-lg font-medium transition-colors"
          >
            Back to Triage
          </button>
        </div>
      </div>
    );
  }

  const renderResourceCard = (match: ResourceMatch, index: number) => {
    const isTopMatch = match.rank === 1;
    
    return (
      <div key={match.resource_id} className={cn(
        "glass-panel p-5 flex flex-col relative overflow-hidden transition-transform duration-300 hover:-translate-y-1",
        isTopMatch ? "border-brand-primary/50 shadow-[0_0_15px_rgba(var(--brand-primary),0.1)]" : ""
      )}>
        {isTopMatch && (
          <div className="absolute top-0 right-0 bg-brand-primary text-white text-[10px] font-bold px-3 py-1 uppercase tracking-wider rounded-bl-lg flex items-center gap-1 shadow-md">
            <Award size={12} /> Top Match
          </div>
        )}
        
        <div className="flex justify-between items-start mb-4 mt-1">
          <div className="flex items-center gap-2">
            <span className={cn(
              "flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold font-mono",
              isTopMatch ? "bg-brand-primary text-white" : "bg-bg-secondary border border-border-strong text-text-secondary"
            )}>
              {match.rank}
            </span>
            <span className="font-bold text-lg text-text-primary font-mono">{match.resource_id}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className={cn("text-2xl font-black leading-none tracking-tight", isTopMatch ? "text-brand-primary" : "text-text-primary")}>
              {match.score}
            </span>
            <span className="text-[10px] text-text-muted uppercase font-bold tracking-widest mt-1">Score</span>
          </div>
        </div>
        
        <div className="flex-grow space-y-3 mt-2 bg-bg-secondary rounded-lg p-3 border border-border-strong">
          <div className="flex items-center gap-1.5 text-[10px] text-text-muted uppercase font-bold tracking-wider mb-2 border-b border-border-subtle pb-2">
            <TrendingUp size={12} /> Computed Factors
          </div>
          <ul className="space-y-2">
            {match.factors.map((f, i) => (
              <li key={i} className="flex justify-between items-start text-xs">
                <span className="text-text-secondary pr-2 leading-tight">{f.description}</span>
                <span className="text-status-success font-mono font-bold shrink-0">+{f.score}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 bg-bg-main p-4 md:p-6 lg:p-8 min-h-[calc(100vh-4rem)]">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-subtle pb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                <Network className="text-brand-primary" />
                Resource Matching
              </h1>
            </div>
            <p className="text-text-secondary text-sm font-medium">Evaluating optimal resource allocation for Case <span className="font-mono text-brand-secondary">{caseId}</span></p>
          </div>
          <div className="flex items-center gap-3">
            <Link 
              href={`/cases/${caseId}/triage`}
              className="px-4 py-2 bg-bg-surface hover:bg-bg-elevated border border-border-strong text-text-primary rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2"
            >
              <ChevronLeft size={16} /> Back to Triage
            </Link>
            <Link 
              href={`/cases/${caseId}/orchestration`}
              className="px-5 py-2 bg-brand-primary hover:bg-brand-accent text-white rounded-lg text-sm font-bold transition-all shadow-md shadow-brand-primary/20 flex items-center gap-2"
            >
              Build Pathway <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {/* Action Panel */}
        <div className="glass-panel p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 border-brand-primary/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
          
          <div className="relative z-10 text-center sm:text-left">
            <h2 className="text-xl font-bold text-text-primary mb-2">Matches Generated</h2>
            <p className="text-text-secondary text-sm max-w-xl">
              The matching engine has scored available resources based on the incident location, clinical priority, and real-time load balancing parameters. Review the top candidates below or proceed directly to path generation.
            </p>
          </div>
          
          <div className="relative z-10 shrink-0 w-full sm:w-auto">
            <Link 
              href={`/cases/${caseId}/orchestration`}
              className="w-full sm:w-auto flex justify-center items-center gap-2 px-8 py-4 bg-brand-primary hover:bg-brand-accent text-white font-bold rounded-xl transition-all shadow-lg shadow-brand-primary/20 hover:-translate-y-0.5"
            >
              Generate Orchestration Plan &rarr;
            </Link>
          </div>
        </div>

        {/* Match Lists */}
        <div className="space-y-6">
          <div className="flex gap-2 border-b border-border-subtle mb-6 overflow-x-auto custom-scrollbar">
            {[
              { id: "ambulances", label: "Ambulance Units", icon: Ambulance, count: matching.ambulances.length },
              { id: "hospitals", label: "Hospitals", icon: Building2, count: matching.hospitals.length },
              { id: "doctors", label: "Specialists", icon: Stethoscope, count: matching.doctors.length }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "flex items-center gap-2 px-6 py-3 font-medium transition-all border-b-2 whitespace-nowrap", 
                    isActive 
                      ? "border-brand-primary text-brand-primary bg-brand-primary/5" 
                      : "border-transparent text-text-secondary hover:text-text-primary hover:bg-bg-surface"
                  )}
                >
                  <Icon size={18} />
                  {tab.label}
                  <span className={cn(
                    "ml-1.5 py-0.5 px-2 rounded-full text-[10px] font-bold",
                    isActive ? "bg-brand-primary/10" : "bg-bg-secondary border border-border-strong"
                  )}>
                    {tab.count}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="animate-in fade-in duration-300">
            {activeTab === "ambulances" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {matching.ambulances.length > 0 ? (
                  matching.ambulances.map(renderResourceCard)
                ) : (
                  <div className="col-span-full py-12 text-center text-text-secondary bg-bg-surface border border-border-strong rounded-xl">
                    No ambulance matches found.
                  </div>
                )}
              </div>
            )}
            
            {activeTab === "hospitals" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {matching.hospitals.length > 0 ? (
                  matching.hospitals.map(renderResourceCard)
                ) : (
                  <div className="col-span-full py-12 text-center text-text-secondary bg-bg-surface border border-border-strong rounded-xl">
                    No hospital matches found.
                  </div>
                )}
              </div>
            )}
            
            {activeTab === "doctors" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {matching.doctors.length > 0 ? (
                  matching.doctors.map(renderResourceCard)
                ) : (
                  <div className="col-span-full py-12 text-center text-text-secondary bg-bg-surface border border-border-strong rounded-xl">
                    No doctor matches found.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default function MatchingPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 bg-bg-main flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="w-10 h-10 text-brand-primary animate-spin" />
      </div>
    }>
      <MatchingContent />
    </Suspense>
  );
}
