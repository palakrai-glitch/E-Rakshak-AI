"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, LogOut, Loader2, MapPin, Ambulance as AmbulanceIcon, Activity, AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { getAmbulanceProfile, getAmbulanceRequests, respondToRequest, transitionMission, updateLocation, logoutAmbulance } from "@/lib/ambulanceApi";
import { cn } from "@/lib/utils";

export default function AmbulanceDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Simulation logic: Move closer to target incident if an active mission exists.
  useEffect(() => {
    if (!isSimulating) return;
    
    // Find first active request
    const activeReq = requests.find(r => r.ambulance_assignment_status && r.ambulance_assignment_status !== "PENDING" && r.ambulance_assignment_status !== "REJECTED" && r.ambulance_assignment_status !== "COMPLETED");
    if (!activeReq || !activeReq.latitude || !activeReq.longitude) return;

    // A simple simulation logic: just generate coords around the incident. 
    // In a real simulation, we would interpolate between base and destination.
    let currentLat = activeReq.latitude + (Math.random() - 0.5) * 0.05;
    let currentLon = activeReq.longitude + (Math.random() - 0.5) * 0.05;

    const simInterval = setInterval(async () => {
      // Step closer to target
      currentLat += (activeReq.latitude - currentLat) * 0.1;
      currentLon += (activeReq.longitude - currentLon) * 0.1;
      
      await updateLocation(currentLat, currentLon, "SIMULATION");
    }, 3000);

    return () => clearInterval(simInterval);
  }, [isSimulating, requests]);

  const fetchDashboardData = useCallback(async () => {
    const profRes = await getAmbulanceProfile();
    if (!profRes.ok) {
      logoutAmbulance();
      router.push("/ambulance/login");
      return;
    }
    setProfile(profRes.data);

    const reqRes = await getAmbulanceRequests();
    if (reqRes.ok) {
      setRequests(reqRes.data);
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    fetchDashboardData();
    // Setup a 10s polling interval to fetch new requests
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const handleLogout = () => {
    logoutAmbulance();
    router.push("/ambulance/login");
  };

  const handleRespond = async (caseId: string, response: "ACCEPTED" | "REJECTED") => {
    setActionLoading(caseId);
    const res = await respondToRequest(caseId, response);
    if (res.ok) {
      await fetchDashboardData();
    } else {
      alert("Error: " + res.error);
    }
    setActionLoading(null);
  };
  
  const handleTransition = async (caseId: string, status: string) => {
    setActionLoading(caseId);
    const res = await transitionMission(caseId, status);
    if (res.ok) {
      await fetchDashboardData();
    } else {
      alert("Error: " + res.error);
    }
    setActionLoading(null);
  };

  if (loading) {
    return (
      <div className="flex-1 bg-bg-main flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="w-12 h-12 text-brand-primary animate-spin mb-4" />
        <p className="text-text-secondary font-medium">Loading portal...</p>
      </div>
    );
  }

  const pendingRequests = requests.filter(r => r.ambulance_assignment_status === "PENDING");
  const activeRequests = requests.filter(r => r.ambulance_assignment_status === "ACCEPTED");
  const pastRequests = requests.filter(r => r.ambulance_assignment_status === "REJECTED");

  return (
    <div className="flex-1 bg-bg-main p-4 md:p-6 lg:p-8 min-h-[calc(100vh-4rem)]">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-brand-primary/10 rounded-xl flex items-center justify-center border border-brand-primary/20">
              <AmbulanceIcon className="w-8 h-8 text-brand-primary" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-text-primary font-mono">{profile?.ambulance_id}</h1>
                <span className={cn(
                  "px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider",
                  profile?.status === "AVAILABLE" ? "bg-status-success/10 text-status-success border border-status-success/30" :
                  profile?.status === "ON_ROUTE" ? "bg-status-warning/10 text-status-warning border border-status-warning/30" :
                  "bg-bg-secondary text-text-muted border border-border-strong"
                )}>
                  {profile?.status}
                </span>
              </div>
              <p className="text-text-secondary text-sm mt-1">
                {profile?.vehicle_number} • {profile?.type} • Base: {profile?.base_hospital_name || "Unassigned"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSimulating(!isSimulating)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-bold transition-colors border flex items-center gap-2",
                isSimulating 
                  ? "bg-status-danger/10 text-status-danger border-status-danger/30 hover:bg-status-danger/20" 
                  : "bg-bg-surface hover:bg-bg-elevated text-text-primary border-border-strong hover:text-brand-primary"
              )}
            >
              {isSimulating ? "Stop Simulation" : "Simulate Location GPS"}
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-bg-surface hover:bg-bg-elevated border border-border-strong text-text-secondary hover:text-status-danger rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>

        {/* Warning label for simulation mode */}
        {isSimulating && (
          <div className="mb-6 p-3 bg-status-warning/10 border border-status-warning text-status-warning rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(var(--status-warning),0.2)]">
            <AlertTriangle size={18} /> SIMULATED LOCATION — NOT LIVE GPS. Your position is being interpolated towards active assignments.
          </div>
        )}

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <AlertTriangle className="text-status-warning" size={20} /> New Emergency Requests ({pendingRequests.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingRequests.map(req => (
                <div key={req.case_id} className="glass-panel p-5 border-status-warning/30 shadow-[0_0_15px_rgba(var(--status-warning),0.05)] relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-status-warning" />
                  
                  <div className="flex justify-between items-start mb-4">
                    <span className="font-mono font-bold text-text-primary bg-bg-secondary px-2 py-1 rounded text-xs">
                      {req.case_id}
                    </span>
                    <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider flex items-center gap-1">
                      <Clock size={12} /> {new Date(req.created_at).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div>
                      <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Complaint</span>
                      <p className="text-text-primary font-medium">{req.chief_complaint}</p>
                    </div>
                    <div>
                      {req.patient_pathway_confirmed ? (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-status-info/10 text-status-info font-bold uppercase tracking-wider px-2 py-1 rounded">
                          <CheckCircle2 size={12} /> Pathway Confirmed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-status-warning/10 text-status-warning font-bold uppercase tracking-wider px-2 py-1 rounded">
                          <Clock size={12} /> Awaiting Confirmation
                        </span>
                      )}
                    </div>
                    {req.address && (
                      <div>
                        <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Location</span>
                        <p className="text-text-secondary text-sm flex items-start gap-1">
                          <MapPin size={14} className="mt-0.5 shrink-0" />
                          {req.address}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <button 
                      disabled={!!actionLoading}
                      onClick={() => handleRespond(req.case_id, "ACCEPTED")}
                      className="flex-1 py-2.5 bg-brand-primary hover:bg-brand-accent text-white rounded-lg font-bold text-sm transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {actionLoading === req.case_id ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                      Accept
                    </button>
                    <button 
                      disabled={!!actionLoading}
                      onClick={() => handleRespond(req.case_id, "REJECTED")}
                      className="flex-1 py-2.5 bg-bg-surface hover:bg-status-danger/10 border border-border-strong hover:border-status-danger/30 text-text-primary hover:text-status-danger rounded-lg font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {actionLoading === req.case_id ? <Loader2 className="animate-spin" size={16} /> : <XCircle size={16} />}
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Accepted Requests */}
        {activeRequests.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <Activity className="text-brand-primary" size={20} /> Active Missions ({activeRequests.length})
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {activeRequests.map(req => (
                <div key={req.case_id} className="glass-panel p-5 border-brand-primary/30 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="absolute top-0 left-0 w-1 h-full bg-brand-primary" />
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono font-bold text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded text-sm">
                        {req.case_id}
                      </span>
                      <span className="px-2 py-0.5 bg-status-success/10 text-status-success border border-status-success/30 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 size={12} /> Accepted
                      </span>
                      {req.patient_pathway_confirmed ? (
                        <span className="px-2 py-0.5 bg-status-info/10 text-status-info border border-status-info/30 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                          <CheckCircle2 size={12} /> Pathway Confirmed
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-status-warning/10 text-status-warning border border-status-warning/30 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                          <Clock size={12} /> Awaiting Confirmation
                        </span>
                      )}
                    </div>
                    <p className="text-text-primary font-medium text-lg mb-1">{req.chief_complaint}</p>
                    {req.address && (
                      <p className="text-text-secondary text-sm flex items-center gap-1">
                        <MapPin size={14} /> {req.address}
                      </p>
                    )}
                  </div>
                  
                  <div className="md:text-right shrink-0 flex flex-col md:items-end gap-3">
                    <div>
                      <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider block mb-1">Assigned At</span>
                      <span className="font-mono text-sm text-text-primary">{new Date(req.created_at).toLocaleString()}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-end">
                      {req.ambulance_assignment_status === "ACCEPTED" && (
                        <button onClick={() => handleTransition(req.case_id, "DISPATCHED")} disabled={!!actionLoading} className="px-3 py-1.5 bg-brand-primary text-white text-xs font-bold rounded hover:bg-brand-accent transition-colors disabled:opacity-50">
                          Dispatch
                        </button>
                      )}
                      {req.ambulance_assignment_status === "DISPATCHED" && (
                        <button onClick={() => handleTransition(req.case_id, "EN_ROUTE")} disabled={!!actionLoading} className="px-3 py-1.5 bg-brand-primary text-white text-xs font-bold rounded hover:bg-brand-accent transition-colors disabled:opacity-50">
                          En Route
                        </button>
                      )}
                      {req.ambulance_assignment_status === "EN_ROUTE" && (
                        <button onClick={() => handleTransition(req.case_id, "ON_SCENE")} disabled={!!actionLoading} className="px-3 py-1.5 bg-brand-primary text-white text-xs font-bold rounded hover:bg-brand-accent transition-colors disabled:opacity-50">
                          Arrived on Scene
                        </button>
                      )}
                      {req.ambulance_assignment_status === "ON_SCENE" && (
                        <button onClick={() => handleTransition(req.case_id, "TRANSPORTING")} disabled={!!actionLoading} className="px-3 py-1.5 bg-brand-primary text-white text-xs font-bold rounded hover:bg-brand-accent transition-colors disabled:opacity-50">
                          Start Transport
                        </button>
                      )}
                      {req.ambulance_assignment_status === "TRANSPORTING" && (
                        <button onClick={() => handleTransition(req.case_id, "ARRIVED_AT_HOSPITAL")} disabled={!!actionLoading} className="px-3 py-1.5 bg-brand-primary text-white text-xs font-bold rounded hover:bg-brand-accent transition-colors disabled:opacity-50">
                          Arrived at Hospital
                        </button>
                      )}
                      {req.ambulance_assignment_status === "ARRIVED_AT_HOSPITAL" && (
                        <button onClick={() => handleTransition(req.case_id, "COMPLETED")} disabled={!!actionLoading} className="px-3 py-1.5 bg-status-success text-white text-xs font-bold rounded hover:bg-status-success/80 transition-colors disabled:opacity-50">
                          Complete Mission
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {requests.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center p-12 glass-panel border-dashed text-center">
            <ShieldAlert className="w-12 h-12 text-text-muted mb-4 opacity-50" />
            <h3 className="text-lg font-bold text-text-primary mb-1">No Assigned Requests</h3>
            <p className="text-text-secondary text-sm">You currently have no emergency cases assigned to this ambulance.</p>
          </div>
        )}

      </div>
    </div>
  );
}
