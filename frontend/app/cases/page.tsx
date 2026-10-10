"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { 
  ShieldAlert, 
  Search, 
  Filter, 
  Activity, 
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight,
  RefreshCw,
  MoreVertical,
  Map as MapIcon,
  Network,
  AlertTriangle
} from "lucide-react";
import { listEmergencyCases, EmergencyCaseResponse } from "@/lib/api";
import { cn } from "@/lib/utils";

import { useRouter } from "next/navigation";

export default function ActiveIncidentsDashboard() {
  const router = useRouter();
  const [cases, setCases] = useState<EmergencyCaseResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  const fetchCases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // We pass the search and status to the backend to filter
      const res = await listEmergencyCases({
        search: searchTerm || undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined
      });
      
      if (res.ok) {
        let fetchedCases = res.data.cases;
        // The backend sort doesn't perfectly apply if we want to change it dynamically without fetching, 
        // but we've implemented backend sorting in Phase 9 API updates.
        // For robustness, we also apply local sorting.
        fetchedCases.sort((a, b) => {
          const dateA = new Date(a.created_at).getTime();
          const dateB = new Date(b.created_at).getTime();
          return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
        });
        
        setCases(fetchedCases);
      } else {
        setError(res.error || "Failed to load active incidents.");
      }
    } catch (err) {
      setError("An unexpected error occurred while fetching cases.");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, sortOrder]);

  // Debounced fetch
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCases();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchCases]);

  // Metrics calculation
  const metrics = useMemo(() => {
    return {
      total: cases.length,
      open: cases.filter(c => c.status === "OPEN").length,
      inProgress: cases.filter(c => c.status === "IN_PROGRESS").length,
      resolved: cases.filter(c => c.status === "RESOLVED" || c.status === "COMPLETED").length,
    };
  }, [cases]);

  const getStatusStyle = (status: string) => {
    switch(status) {
      case "OPEN": return "bg-status-danger/10 text-status-danger border-status-danger/20";
      case "IN_PROGRESS": return "bg-status-warning/10 text-status-warning border-status-warning/20";
      case "RESOLVED":
      case "COMPLETED": return "bg-status-success/10 text-status-success border-status-success/20";
      default: return "bg-bg-secondary text-text-secondary border-border-strong";
    }
  };

  return (
    <div className="flex-1 bg-bg-main p-4 md:p-6 lg:p-8 min-h-[calc(100vh-68px)]">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-subtle pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary flex items-center gap-2 mb-1">
              <ShieldAlert className="text-brand-primary" />
              Active Incidents
            </h1>
            <p className="text-text-secondary text-sm leading-6">Manage and track live emergency cases across the network.</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => fetchCases()}
              className="px-4 py-2 bg-bg-surface hover:bg-bg-elevated border border-border-strong text-text-primary rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <Link 
              href="/intake"
              className="px-5 py-2 bg-brand-primary hover:bg-brand-accent text-white rounded-lg text-sm font-bold transition-all shadow-sm flex items-center gap-2"
            >
              + New Case
            </Link>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-panel p-5 flex flex-col">
            <div className="flex items-center gap-2 text-[10px] text-text-muted uppercase font-bold tracking-wider mb-2">
              <Activity size={14} /> Total Cases
            </div>
            <div className="text-3xl font-black text-text-primary mt-auto">{metrics.total}</div>
          </div>
          <div className="glass-panel p-5 flex flex-col border-status-danger/20">
            <div className="flex items-center gap-2 text-[10px] text-status-danger uppercase font-bold tracking-wider mb-2">
              <AlertCircle size={14} /> Open / Awaiting
            </div>
            <div className="text-3xl font-black text-text-primary mt-auto">{metrics.open}</div>
          </div>
          <div className="glass-panel p-5 flex flex-col border-status-warning/20">
            <div className="flex items-center gap-2 text-[10px] text-status-warning uppercase font-bold tracking-wider mb-2">
              <Clock size={14} /> In Progress
            </div>
            <div className="text-3xl font-black text-text-primary mt-auto">{metrics.inProgress}</div>
          </div>
          <div className="glass-panel p-5 flex flex-col border-status-success/20">
            <div className="flex items-center gap-2 text-[10px] text-status-success uppercase font-bold tracking-wider mb-2">
              <CheckCircle size={14} /> Resolved
            </div>
            <div className="text-3xl font-black text-text-primary mt-auto">{metrics.resolved}</div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-bg-surface border border-border-strong rounded-xl p-4 flex flex-col md:flex-row gap-4 shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
            <input 
              type="text" 
              placeholder="Search by ER Token, Patient Name, or Phone..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-bg-main border border-border-strong rounded-lg text-sm text-text-primary focus:outline-none focus:border-brand-primary transition-colors"
            />
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-9 pr-8 py-2.5 bg-bg-main border border-border-strong rounded-lg text-sm font-medium text-text-primary focus:outline-none focus:border-brand-primary appearance-none cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as "newest" | "oldest")}
              className="px-4 py-2.5 bg-bg-main border border-border-strong rounded-lg text-sm font-medium text-text-primary focus:outline-none focus:border-brand-primary appearance-none cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>

        {/* Note about missing realtime events */}
        <div className="bg-brand-primary/5 border border-brand-primary/20 rounded-lg p-3 text-xs text-brand-primary font-medium flex items-center gap-2">
          <Activity size={14} />
          Note: Global real-time WebSocket events for the case list are not currently supported by the backend. Use the Refresh button to fetch latest cases.
        </div>

        {/* Case List */}
        <div className="space-y-4">
          {loading && cases.length === 0 ? (
            <div className="py-12 text-center text-text-muted">Loading cases...</div>
          ) : error ? (
            <div className="py-12 text-center text-status-danger bg-status-danger/5 border border-status-danger/20 rounded-xl">
              {error}
            </div>
          ) : cases.length === 0 ? (
            <div className="py-16 text-center bg-bg-surface border border-border-strong rounded-xl shadow-sm">
              <ShieldAlert className="w-12 h-12 text-border-strong mx-auto mb-4" />
              <h3 className="text-lg font-bold text-text-primary mb-1">No incidents found</h3>
              <p className="text-sm text-text-secondary">Try adjusting your search or filters.</p>
            </div>
          ) : (
            cases.map((c) => (
              <div key={c.case_id} className="glass-panel p-5 sm:p-6 transition-all hover:border-brand-primary/40 group">
                <div className="flex flex-col lg:flex-row justify-between gap-6">
                  
                  {/* Left Column: ID & Status */}
                  <div className="flex flex-col gap-3 min-w-[200px]">
                    <div className="flex items-center justify-between lg:justify-start gap-3">
                      <span className="font-mono font-bold text-lg text-text-primary tracking-tight">
                        {c.case_id}
                      </span>
                    </div>
                    <div className={cn(
                      "inline-flex items-center justify-center px-2.5 py-1 text-xs font-bold rounded uppercase tracking-wider border w-max",
                      getStatusStyle(c.status)
                    )}>
                      {c.status}
                    </div>
                    <div className="text-[11px] text-text-muted font-medium flex items-center gap-1.5 mt-auto">
                      <Clock size={12} />
                      {new Date(c.created_at).toLocaleString()}
                    </div>
                  </div>

                  {/* Middle Column: Details */}
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t lg:border-t-0 lg:border-l border-border-subtle pt-4 lg:pt-0 lg:pl-6">
                    <div>
                      <div className="text-[10px] text-text-muted uppercase font-bold tracking-wider mb-1">Patient Info</div>
                      <div className="font-medium text-sm text-text-primary">
                        {c.patient_name ? (
                          <span>{c.patient_name} {c.patient_age ? `(${c.patient_age}y)` : ''}</span>
                        ) : (
                          <span className="italic text-text-secondary">Unknown Patient</span>
                        )}
                      </div>
                      {c.reporter_phone && (
                        <div className="text-xs text-text-secondary mt-0.5">Contact: {c.reporter_phone}</div>
                      )}
                    </div>
                    
                    <div>
                      <div className="text-[10px] text-text-muted uppercase font-bold tracking-wider mb-1">Incident Location</div>
                      <div className="font-medium text-sm text-text-primary line-clamp-2">
                        {c.address ? c.address : "Location unconfirmed"}
                        {c.city && `, ${c.city}`}
                      </div>
                    </div>

                    <div className="sm:col-span-2 mt-2 bg-bg-secondary rounded-lg p-3 border border-border-subtle">
                      <div className="text-[10px] text-text-muted uppercase font-bold tracking-wider mb-1">Chief Complaint</div>
                      <div className="font-semibold text-sm text-text-primary">{c.chief_complaint}</div>
                      {c.symptoms && c.symptoms.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {c.symptoms.map(sym => (
                            <span key={sym} className="text-[10px] bg-bg-surface border border-border-strong px-2 py-0.5 rounded text-text-secondary font-medium">
                              {sym}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex flex-col sm:flex-row lg:flex-col gap-2 justify-end lg:min-w-[160px] border-t lg:border-t-0 border-border-subtle pt-4 lg:pt-0">
                    {(!c.latitude && !c.address) ? (
                      <Link
                        href={`/intake`}
                        className="w-full px-4 py-2 bg-status-warning/10 hover:bg-status-warning/20 border border-status-warning/30 text-status-warning text-sm font-semibold rounded-lg transition-colors flex items-center justify-between group-hover:shadow-sm"
                        title="Location missing. Intake is incomplete."
                      >
                        <span className="flex items-center gap-2"><AlertTriangle size={16} /> Resume Intake</span>
                        <ArrowRight size={14} className="opacity-50" />
                      </Link>
                    ) : (
                      <Link
                        href={`/cases/${c.case_id}/triage`}
                        className="w-full px-4 py-2 bg-bg-surface hover:bg-brand-primary/10 border border-border-strong hover:border-brand-primary/30 text-text-primary hover:text-brand-primary text-sm font-semibold rounded-lg transition-colors flex items-center justify-between group-hover:shadow-sm"
                      >
                        <span className="flex items-center gap-2"><Activity size={16} /> Triage</span>
                        <ArrowRight size={14} className="opacity-50" />
                      </Link>
                    )}
                    <Link
                      href={`/cases/${c.case_id}/matching`}
                      className="w-full px-4 py-2 bg-bg-surface hover:bg-brand-secondary/10 border border-border-strong hover:border-brand-secondary/30 text-text-primary hover:text-brand-secondary text-sm font-semibold rounded-lg transition-colors flex items-center justify-between group-hover:shadow-sm"
                    >
                      <span className="flex items-center gap-2"><Network size={16} /> Matching</span>
                      <ArrowRight size={14} className="opacity-50" />
                    </Link>
                    <Link
                      href={`/cases/${c.case_id}/map`}
                      className="w-full px-4 py-2 bg-brand-primary hover:bg-brand-accent text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-between shadow-sm"
                    >
                      <span className="flex items-center gap-2"><MapIcon size={16} /> Open Map</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>

                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
