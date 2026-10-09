"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getOrchestration,
  updateHospitalStatus,
  updateHospitalCapacity,
  updateAmbulanceStatus,
  updateDoctorAvailability,
  OrchestrationResult,
  getEmergencyCase,
  EmergencyCaseResponse
} from "@/lib/api";
import { useWebSocket } from "@/lib/websocket";
import { cn } from "@/lib/utils";
import { 
  Network, 
  ChevronLeft, 
  Loader2, 
  Activity, 
  Map as MapIcon, 
  ShieldAlert, 
  CheckCircle,
  AlertTriangle,
  Radio,
  Zap,
  Ambulance as AmbulanceIcon,
  Building2,
  Stethoscope,
  ArrowRight,
  AlertOctagon
} from "lucide-react";

const getWsUrl = (caseId: string) => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const wsBaseUrl = apiUrl.replace(/^http/, "ws");
  return `${wsBaseUrl}/ws/cases/${caseId}`;
};

interface LiveEvent {
  id: string;
  timestamp: string;
  message: string;
}

function OrchestrationContent() {
  const params = useParams();
  const caseId = params?.caseId as string;

  const [loading, setLoading] = useState(true);
  const [orchestration, setOrchestration] = useState<OrchestrationResult | null>(null);
  const [caseDetails, setCaseDetails] = useState<EmergencyCaseResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [assignmentStatus, setAssignmentStatus] = useState<string>("PENDING");
  const [pathwayConfirmed, setPathwayConfirmed] = useState<boolean>(false);
  
  const addEvent = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLiveEvents(prev => {
      const newEvents = [{ id: Math.random().toString(), timestamp, message }, ...prev];
      return newEvents.slice(0, 8); 
    });
  }, []);



  const handleWebSocketMessage = useCallback((data: any) => {
    if (data.event === "RESOURCE_STATUS_CHANGED") {
      addEvent(`${data.resource_id} status updated to ${data.data.new_status}`);
    } else if (data.event === "PATHWAY_CHANGED") {
      addEvent(`Live route recalculated: Target updated`);
      setOrchestration(data.orchestration);
    } else if (data.event === "AMBULANCE_ASSIGNMENT_CHANGED") {
      addEvent(`Ambulance ${data.data.ambulance_id} ${data.data.status} the assignment`);
      setAssignmentStatus(data.data.status);
    } else if (data.event === "MISSION_STATUS_CHANGED") {
      addEvent(`Ambulance mission status updated to ${data.data.status}`);
      setAssignmentStatus(data.data.status);
    } else if (data.event === "AMBULANCE_LOCATION_UPDATED") {
      addEvent(`Received location update from ambulance ${data.data.ambulance_id}`);
    } else if (data.event === "PATHWAY_CONFIRMATION_CHANGED" || data.type === "PATHWAY_CONFIRMATION_CHANGED") {
      const isConfirmed = data.patient_pathway_confirmed || data.data?.patient_pathway_confirmed;
      addEvent(`Patient ${isConfirmed ? 'confirmed' : 'unconfirmed'} the care pathway`);
      setPathwayConfirmed(isConfirmed);
    }
  }, [addEvent]);

  const { connectionState, sendMessage } = useWebSocket({
    url: getWsUrl(caseId),
    onMessage: handleWebSocketMessage
  });

  useEffect(() => {
    if (connectionState === "CONNECTED" && orchestration?.recommended_pathway) {
      sendMessage({
        type: "SET_PATHWAY_ID",
        pathway_id: orchestration.recommended_pathway.pathway_id
      });
    }
  }, [connectionState, orchestration?.recommended_pathway?.pathway_id, sendMessage]);

  const fetchOrchestration = async () => {
    setLoading(true);
    const [orchRes, caseRes] = await Promise.all([
      getOrchestration(caseId),
      getEmergencyCase(caseId)
    ]);
    
    if (orchRes.ok) {
      setOrchestration(orchRes.data);
      if (liveEvents.length === 0) {
        addEvent(`Orchestration initialized. Finding best path...`);
        addEvent(`Pathway secured. Awaiting live updates.`);
      }
    } else {
      setError(orchRes.error);
    }
    
    if (caseRes.ok) {
      setCaseDetails(caseRes.data);
      if (caseRes.data.ambulance_assignment_status) {
        setAssignmentStatus(caseRes.data.ambulance_assignment_status);
      }
      if (caseRes.data.patient_pathway_confirmed) {
        setPathwayConfirmed(true);
      }
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchOrchestration();
  }, [caseId]);

  const [simType, setSimType] = useState<"hospital" | "ambulance" | "doctor">("hospital");
  const [simTargetId, setSimTargetId] = useState("");
  const [simAction, setSimAction] = useState("");
  const [simulating, setSimulating] = useState(false);
  const [simMessage, setSimMessage] = useState("");

  useEffect(() => {
    if (orchestration?.recommended_pathway) {
      if (simType === "hospital") setSimTargetId(orchestration.recommended_pathway.hospital.resource_id);
      if (simType === "ambulance") setSimTargetId(orchestration.recommended_pathway.ambulance.resource_id);
      if (simType === "doctor") setSimTargetId(orchestration.recommended_pathway.doctor.resource_id);
    }
  }, [simType, orchestration]);

  const handleSimulate = async () => {
    if (!simTargetId || !simAction) return;
    setSimulating(true);
    setSimMessage("");
    
    addEvent(`Triggered failure simulation on ${simTargetId}`);
    
    try {
      if (simType === "hospital") {
        if (simAction === "FULL") {
          await updateHospitalCapacity(simTargetId, { available_icu_beds: 0, general_beds_available: 0 });
        } else if (simAction === "CLOSED") {
          await updateHospitalStatus(simTargetId, "CLOSED");
        }
      } else if (simType === "ambulance") {
        if (simAction === "BUSY") {
          await updateAmbulanceStatus(simTargetId, "BUSY");
        }
      } else if (simType === "doctor") {
        if (simAction === "UNAVAILABLE") {
          await updateDoctorAvailability(simTargetId, "OFF_DUTY");
        }
      }
      
      setSimMessage("✓ Event dispatched.");
    } catch (e) {
      setSimMessage("Simulation failed.");
    } finally {
      setSimulating(false);
      setTimeout(() => setSimMessage(""), 4000);
    }
  };

  if (loading && !orchestration) {
    return (
      <div className="flex-1 bg-bg-main flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-6">
        <Loader2 className="w-12 h-12 text-brand-primary animate-spin mb-6" />
        <h2 className="text-xl font-bold text-text-primary mb-2">Connecting to Command Center</h2>
        <p className="text-text-secondary text-sm">Establishing secure telemetry links...</p>
      </div>
    );
  }

  if (error || !orchestration) {
    return (
      <div className="flex-1 bg-bg-main flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-6">
        <div className="max-w-md w-full bg-bg-surface border border-status-danger/30 rounded-xl p-8 shadow-xl text-center">
          <ShieldAlert className="w-16 h-16 text-status-danger mx-auto mb-4" />
          <h2 className="text-xl font-bold text-text-primary mb-2">Dashboard Error</h2>
          <p className="text-text-secondary mb-8">{error || "Orchestration data unavailable."}</p>
          <Link href={`/cases/${caseId}/matching`} className="w-full inline-block py-3 bg-bg-secondary hover:bg-bg-elevated border border-border-strong text-text-primary rounded-lg font-medium transition-colors">
            Back to Matching
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-bg-main p-4 md:p-6 lg:p-8 min-h-[calc(100vh-4rem)]">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 border-b border-border-subtle pb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                <Network className="text-brand-primary" />
                Live Care Orchestration
              </h1>
              
              <div className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold tracking-wide border shadow-sm",
                connectionState === "CONNECTED" ? "bg-status-success/10 border-status-success/20 text-status-success" :
                connectionState === "CONNECTING" || connectionState === "RECONNECTING" ? "bg-status-warning/10 border-status-warning/20 text-status-warning" :
                "bg-status-danger/10 border-status-danger/20 text-status-danger"
              )}>
                <span className={cn(
                  "relative flex h-2 w-2 rounded-full",
                  connectionState === "CONNECTED" ? "bg-status-success" :
                  connectionState === "CONNECTING" || connectionState === "RECONNECTING" ? "bg-status-warning animate-pulse" :
                  "bg-status-danger"
                )}>
                  {connectionState === "CONNECTED" && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-success opacity-75"></span>}
                </span>
                {connectionState === "CONNECTED" ? "LIVE TELEMETRY" :
                 connectionState === "CONNECTING" ? "CONNECTING..." :
                 connectionState === "RECONNECTING" ? "RECONNECTING..." :
                 "OFFLINE"}
              </div>
            </div>
            <p className="text-text-muted text-sm font-medium">Coordinating mission-critical response for Case <span className="font-mono text-brand-secondary">{caseId}</span></p>
          </div>
          
          <div className="flex items-center gap-3">
             <Link 
                href={`/cases/${caseId}/matching`} 
                className="px-4 py-2.5 bg-bg-surface hover:bg-bg-elevated border border-border-strong text-text-primary rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2"
              >
               <ChevronLeft size={16} /> Matching
             </Link>
             <Link 
                href={`/cases/${caseId}/map`} 
                className="px-5 py-2.5 bg-brand-primary hover:bg-brand-accent text-white rounded-lg text-sm font-bold transition-all shadow-md shadow-brand-primary/20 flex items-center gap-2 hover:-translate-y-0.5"
              >
               <MapIcon size={16} /> Mission Map
             </Link>
          </div>
        </div>

        {/* Top KPI row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Mission Status */}
          <div className="glass-panel p-5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-brand-primary/10 transition-colors"></div>
            
            <div className="flex items-center gap-2 text-[10px] text-text-muted uppercase font-bold tracking-wider mb-4 border-b border-border-subtle pb-2">
              <Activity size={12} /> Mission Status
            </div>
            
            <div className="text-2xl font-bold text-text-primary mb-1 truncate" title={caseDetails?.patient_name ?? undefined}>
              {caseDetails?.patient_name || "Unknown Patient"}
            </div>
            
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <span className={cn(
                "text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider shadow-sm",
                orchestration.priority === "CRITICAL" ? "bg-status-danger/10 text-status-danger border border-status-danger/20" :
                orchestration.priority === "HIGH" ? "bg-status-warning/10 text-status-warning border border-status-warning/20" :
                orchestration.priority === "MODERATE" ? "bg-status-info/10 text-status-info border border-status-info/20" :
                "bg-status-success/10 text-status-success border border-status-success/20"
              )}>
                {orchestration.priority} PRIORITY
              </span>
              <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-bg-secondary border border-border-strong text-text-secondary uppercase tracking-wider">
                ACTIVE
              </span>
              {pathwayConfirmed && (
                <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-status-info/10 text-status-info border border-status-info/20 uppercase tracking-wider">
                  PATHWAY CONFIRMED
                </span>
              )}
            </div>
          </div>

          {/* Capabilities */}
          <div className="glass-panel p-5">
            <div className="flex items-center gap-2 text-[10px] text-text-muted uppercase font-bold tracking-wider mb-4 border-b border-border-subtle pb-2">
              <ShieldAlert size={12} /> Required Capabilities
            </div>
            
            <div className="flex flex-wrap gap-2">
              {orchestration.required_capabilities.length > 0 ? (
                orchestration.required_capabilities.map(cap => (
                  <span key={cap} className="bg-bg-secondary border border-border-strong text-text-primary px-2.5 py-1.5 rounded-md text-xs font-bold tracking-wide shadow-sm flex items-center gap-1.5">
                    <CheckCircle size={12} className="text-brand-primary" />
                    {cap.replace(/_/g, " ")}
                  </span>
                ))
              ) : (
                <span className="text-text-muted text-sm font-medium italic">General response capabilities sufficient.</span>
              )}
            </div>
          </div>

          {/* Telemetry Log */}
          <div className="glass-panel p-5 flex flex-col h-full bg-bg-secondary/30">
            <div className="flex items-center justify-between text-[10px] text-text-muted uppercase font-bold tracking-wider mb-3 border-b border-border-subtle pb-2">
              <div className="flex items-center gap-2">
                <Radio size={12} /> Telemetry Log
              </div>
            </div>
            
            <div className="flex-grow flex flex-col justify-start space-y-2 overflow-y-auto custom-scrollbar max-h-32">
              {liveEvents.length === 0 ? (
                <div className="text-xs text-text-muted italic flex items-center justify-center h-full">Listening for telemetry...</div>
              ) : (
                liveEvents.map((ev, idx) => (
                  <div key={ev.id} className={cn(
                    "text-xs font-mono flex items-start gap-2", 
                    idx === 0 ? "text-brand-primary font-bold" : "text-text-secondary"
                  )}>
                    <span className="opacity-50 shrink-0">[{ev.timestamp}]</span>
                    <span className="leading-tight">{ev.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Change Explanation Banner */}
        {orchestration.status === "DEGRADED" && orchestration.change_explanation && (
          <div className="bg-status-warning/10 border border-status-warning/30 rounded-xl p-5 shadow-lg animate-in slide-in-from-top-4 fade-in duration-300">
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="text-status-warning shrink-0" size={24} />
              <h2 className="text-lg font-bold text-status-warning">Dynamic Rerouting Executed</h2>
            </div>
            <p className="text-status-warning/90 text-sm mb-4 ml-9 font-medium leading-relaxed">
              {orchestration.change_reason || "A resource in the primary pathway lost availability. The orchestration engine has engaged the best alternative route."}
            </p>
            <div className="bg-bg-main/50 rounded-lg p-4 ml-9 border border-status-warning/20">
              <ul className="space-y-2">
                {orchestration.change_explanation.map((exp, i) => (
                  <li key={i} className="flex items-start text-xs font-medium text-text-primary">
                    <span className="text-status-warning mr-2 shrink-0">•</span>
                    <span className="leading-tight">{exp}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Pathway Visualizer Container */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2 mb-4">
            <Network className="text-brand-secondary" size={20} /> Calculated Pathway Vector
          </h2>
          
          {orchestration.status === "NO_FEASIBLE_PATHWAY" || !orchestration.recommended_pathway ? (
            <div className="glass-panel border-status-danger/30 p-12 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-status-danger/10 flex items-center justify-center mb-4">
                <AlertOctagon className="w-8 h-8 text-status-danger" />
              </div>
              <h3 className="text-xl font-bold text-status-danger mb-2">Zero Feasible Vectors</h3>
              <p className="text-text-secondary max-w-md">All required resources are currently constrained. Manual dispatch override required.</p>
            </div>
          ) : (
            <div className="grid lg:grid-cols-4 gap-6">
              
              {/* Visualizer */}
              <div className="lg:col-span-3 glass-panel p-6 sm:p-10 relative overflow-hidden flex flex-col justify-center min-h-[280px]">
                {/* Connection lines background */}
                <div className="hidden sm:block absolute top-1/2 left-[10%] right-[10%] h-1 -translate-y-1/2 bg-bg-elevated z-0"></div>
                <div className="hidden sm:block absolute top-1/2 left-[10%] right-[10%] h-1 -translate-y-1/2 bg-gradient-to-r from-brand-primary via-brand-secondary to-status-success opacity-50 z-0"></div>
                
                <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-8 sm:gap-4">
                  
                  {/* Origin */}
                  <div className="flex flex-col items-center group w-full sm:w-auto">
                    <div className="w-16 h-16 rounded-2xl bg-bg-secondary border-2 border-border-strong flex items-center justify-center mb-4 shadow-xl transition-transform group-hover:scale-105">
                      <ShieldAlert className="w-8 h-8 text-text-muted" />
                    </div>
                    <div className="text-center bg-bg-surface px-4 py-2 rounded-lg border border-border-subtle shadow-sm w-full sm:w-auto">
                      <h4 className="font-bold text-text-primary text-sm">Origin</h4>
                      <p className="text-[10px] text-text-muted font-bold tracking-widest mt-1 uppercase">Incident</p>
                    </div>
                  </div>

                  {/* Ambulance */}
                  <div className="flex flex-col items-center group w-full sm:w-auto">
                    <div className="w-20 h-20 rounded-full bg-status-info/10 border-4 border-bg-surface ring-2 ring-status-info/30 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(59,130,246,0.15)] transition-transform group-hover:scale-110">
                      <AmbulanceIcon className="w-8 h-8 text-status-info" />
                    </div>
                    <div className="text-center bg-bg-surface px-4 py-2 rounded-lg border border-border-subtle shadow-sm w-full sm:w-auto relative">
                      <h4 className="font-black text-status-info text-sm tracking-tight">{orchestration.recommended_pathway.ambulance.resource_id}</h4>
                      <p className="text-[10px] text-text-muted font-bold mt-1 mb-1">S: <span className="text-text-primary">{orchestration.recommended_pathway.ambulance.score}</span></p>
                      {assignmentStatus && (
                        <div className={cn(
                          "absolute -bottom-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border shadow-sm whitespace-nowrap",
                          assignmentStatus === "ACCEPTED" ? "bg-status-success/90 text-white border-status-success" :
                          assignmentStatus === "REJECTED" ? "bg-status-danger/90 text-white border-status-danger" :
                          "bg-status-warning/90 text-white border-status-warning"
                        )}>
                          {assignmentStatus}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Hospital */}
                  <div className="flex flex-col items-center group w-full sm:w-auto">
                    <div className="w-20 h-20 rounded-full bg-status-warning/10 border-4 border-bg-surface ring-2 ring-status-warning/30 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(249,115,22,0.15)] transition-transform group-hover:scale-110">
                      <Building2 className="w-8 h-8 text-status-warning" />
                    </div>
                    <div className="text-center bg-bg-surface px-4 py-2 rounded-lg border border-border-subtle shadow-sm w-full sm:w-auto">
                      <h4 className="font-black text-status-warning text-sm tracking-tight">{orchestration.recommended_pathway.hospital.resource_id}</h4>
                      <p className="text-[10px] text-text-muted font-bold mt-1">S: <span className="text-text-primary">{orchestration.recommended_pathway.hospital.score}</span></p>
                    </div>
                  </div>

                  {/* Doctor */}
                  <div className="flex flex-col items-center group w-full sm:w-auto">
                    <div className="w-20 h-20 rounded-full bg-status-success/10 border-4 border-bg-surface ring-2 ring-status-success/30 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(16,185,129,0.15)] transition-transform group-hover:scale-110">
                      <Stethoscope className="w-8 h-8 text-status-success" />
                    </div>
                    <div className="text-center bg-bg-surface px-4 py-2 rounded-lg border border-border-subtle shadow-sm w-full sm:w-auto">
                      <h4 className="font-black text-status-success text-sm tracking-tight">{orchestration.recommended_pathway.doctor.resource_id}</h4>
                      <p className="text-[10px] text-text-muted font-bold mt-1">S: <span className="text-text-primary">{orchestration.recommended_pathway.doctor.score}</span></p>
                    </div>
                  </div>

                </div>
              </div>

              {/* Score & Validation */}
              <div className="glass-panel p-6 flex flex-col bg-brand-primary/5 border-brand-primary/20">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-border-subtle">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-1">Vector Score</div>
                    <div className="text-4xl font-black text-brand-primary">{orchestration.recommended_pathway.pathway_score}</div>
                  </div>
                  <div className={cn(
                    "text-[10px] font-bold px-2 py-1 rounded shadow-sm tracking-wider uppercase",
                    orchestration.status === "FEASIBLE" ? "bg-status-success/20 text-status-success" : "bg-status-warning/20 text-status-warning"
                  )}>
                    {orchestration.status}
                  </div>
                </div>
                
                <div className="flex-grow">
                  <div className="text-[10px] uppercase tracking-widest text-text-muted font-bold mb-3">Resolution Metrics</div>
                  <ul className="space-y-2.5">
                    {orchestration.recommended_pathway.reasons.map((reason, i) => (
                      <li key={i} className="text-xs font-medium text-text-secondary flex items-start gap-2 leading-tight">
                        <CheckCircle size={14} className="text-brand-secondary shrink-0" />
                        {reason.replace(/^✓\s*/, '')}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Lower Section Grid */}
        <div className="grid lg:grid-cols-2 gap-6 pt-4">
          
          {/* Alternatives */}
          <div className="glass-panel p-6">
            <div className="flex items-center gap-2 text-[10px] text-text-muted uppercase font-bold tracking-wider mb-5 border-b border-border-subtle pb-3">
              <Network size={14} /> Standby Vectors
            </div>
            
            <div className="space-y-3">
              {orchestration.alternative_pathways.length === 0 ? (
                <div className="text-sm font-medium text-text-muted text-center py-8 bg-bg-secondary rounded-lg border border-border-strong">
                  No fallback vectors available.
                </div>
              ) : (
                orchestration.alternative_pathways.map((alt, idx) => (
                  <div key={idx} className="bg-bg-surface border border-border-strong rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-brand-primary/30 transition-colors group">
                    <div className="flex items-center gap-2 text-sm font-bold font-mono">
                      <span className="text-status-info">{alt.ambulance.resource_id}</span>
                      <span className="text-border-strong">→</span>
                      <span className="text-status-warning">{alt.hospital.resource_id}</span>
                      <span className="text-border-strong">→</span>
                      <span className="text-status-success">{alt.doctor.resource_id}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Score</span>
                      <span className="text-sm font-black text-text-primary bg-bg-secondary px-2.5 py-1 rounded border border-border-subtle group-hover:border-brand-primary/30 transition-colors">
                        {alt.pathway_score}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Fault Injector */}
          <div className="glass-panel p-0 overflow-hidden border-brand-secondary/30 relative">
            {connectionState !== "CONNECTED" && (
              <div className="absolute inset-0 bg-bg-main/60 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-brand-primary animate-spin mb-3" />
                <span className="text-text-primary font-bold mb-1">Awaiting Telemetry</span>
                <span className="text-xs text-text-secondary font-medium">Fault injection disabled while offline</span>
              </div>
            )}

            <div className="bg-brand-secondary/10 p-5 border-b border-brand-secondary/20">
              <h3 className="text-base font-bold text-brand-secondary flex items-center gap-2">
                <Zap size={18} /> Chaos Engineering Console
              </h3>
              <p className="text-xs text-brand-secondary/70 mt-1 font-medium">Simulate resource failure to test real-time path recalculation.</p>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-text-muted mb-2 font-bold">1. Target Class</label>
                  <select 
                    className="w-full bg-bg-secondary border border-border-strong text-text-primary rounded-lg p-2.5 text-sm font-medium outline-none focus:border-brand-secondary transition-colors"
                    value={simType} 
                    onChange={(e: any) => setSimType(e.target.value)}
                  >
                    <option value="hospital">Hospital</option>
                    <option value="ambulance">Ambulance</option>
                    <option value="doctor">Specialist</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-text-muted mb-2 font-bold">2. Specific Node</label>
                  <select 
                    className="w-full bg-bg-secondary border border-border-strong text-text-primary rounded-lg p-2.5 text-sm font-medium outline-none focus:border-brand-secondary transition-colors"
                    value={simTargetId} 
                    onChange={(e: any) => setSimTargetId(e.target.value)}
                  >
                    <option value="">-- Select Node --</option>
                    {simType === "hospital" && orchestration.recommended_pathway && (
                      <option value={orchestration.recommended_pathway.hospital.resource_id}>
                        {orchestration.recommended_pathway.hospital.resource_id} (Active)
                      </option>
                    )}
                    {simType === "ambulance" && orchestration.recommended_pathway && (
                      <option value={orchestration.recommended_pathway.ambulance.resource_id}>
                        {orchestration.recommended_pathway.ambulance.resource_id} (Active)
                      </option>
                    )}
                    {simType === "doctor" && orchestration.recommended_pathway && (
                      <option value={orchestration.recommended_pathway.doctor.resource_id}>
                        {orchestration.recommended_pathway.doctor.resource_id} (Active)
                      </option>
                    )}
                    {orchestration.alternative_pathways.map(alt => {
                      const id = simType === "hospital" ? alt.hospital.resource_id : 
                                 simType === "ambulance" ? alt.ambulance.resource_id : 
                                 alt.doctor.resource_id;
                      if (orchestration.recommended_pathway && id === (orchestration.recommended_pathway as any)[simType].resource_id) return null;
                      return <option key={id} value={id}>{id} (Standby)</option>
                    })}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-text-muted mb-2 font-bold">3. Fault Signature</label>
                <select 
                  className="w-full bg-bg-secondary border border-border-strong text-text-primary rounded-lg p-2.5 text-sm font-medium outline-none focus:border-brand-secondary transition-colors"
                  value={simAction} 
                  onChange={(e: any) => setSimAction(e.target.value)}
                >
                  <option value="">-- Select Fault Type --</option>
                  {simType === "hospital" && (
                    <>
                      <option value="FULL">Zero Capacity (ICU/Beds = 0)</option>
                      <option value="CLOSED">Status: CLOSED</option>
                    </>
                  )}
                  {simType === "ambulance" && (
                    <option value="BUSY">Status: BUSY</option>
                  )}
                  {simType === "doctor" && (
                    <option value="UNAVAILABLE">Status: OFF_DUTY</option>
                  )}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  onClick={handleSimulate}
                  disabled={simulating || !simTargetId || !simAction}
                  className="px-6 py-2.5 bg-brand-secondary hover:bg-opacity-90 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-all shadow-md shadow-brand-secondary/20 flex items-center gap-2"
                >
                  {simulating ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                  Inject Fault
                </button>
                {simMessage && (
                  <span className="text-xs font-bold text-status-success bg-status-success/10 px-3 py-1.5 rounded-md border border-status-success/20 animate-in fade-in zoom-in">
                    {simMessage}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function OrchestrationPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 bg-bg-main flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="w-12 h-12 text-brand-primary animate-spin" />
      </div>
    }>
      <OrchestrationContent />
    </Suspense>
  );
}
