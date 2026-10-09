"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getHospitals, getDoctors, getAmbulances, Hospital, Doctor, Ambulance } from "@/lib/api";
import { cn } from "@/lib/utils";
import { 
  Building2, 
  Stethoscope, 
  Ambulance as AmbulanceIcon, 
  Loader2, 
  Search, 
  Activity,
  MapPin,
  Clock,
  Users
} from "lucide-react";

import { useRouter } from "next/navigation";

export default function ResourcesPage() {
  const router = useRouter();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [ambulances, setAmbulances] = useState<Ambulance[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"hospitals" | "doctors" | "ambulances">("hospitals");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {

    async function loadResources() {
      const [hRes, dRes, aRes] = await Promise.all([
        getHospitals(),
        getDoctors(),
        getAmbulances()
      ]);

      if (hRes.ok) setHospitals(hRes.data);
      if (dRes.ok) setDoctors(dRes.data);
      if (aRes.ok) setAmbulances(aRes.data);
      
      setLoading(false);
    }
    loadResources();
  }, []);

  const filterData = (data: any[], searchFields: string[]) => {
    if (!searchQuery) return data;
    const query = searchQuery.toLowerCase();
    return data.filter(item => 
      searchFields.some(field => String(item[field] || "").toLowerCase().includes(query))
    );
  };

  const filteredHospitals = filterData(hospitals, ["name", "hospital_id", "address"]);
  const filteredDoctors = filterData(doctors, ["name", "doctor_id", "specialization"]);
  const filteredAmbulances = filterData(ambulances, ["ambulance_id", "vehicle_number", "type"]);

  return (
    <div className="flex-1 bg-bg-main p-4 md:p-6 lg:p-8">
      <div className="max-w-[1600px] mx-auto w-full">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 border-b border-border-subtle pb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                <Activity className="text-brand-primary" />
                Resource Registry
              </h1>
            </div>
            <p className="text-text-secondary text-sm">Real-time status tracking for hospitals, specialists, and dispatch units.</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
              <input 
                type="text" 
                placeholder="Search resources..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-bg-surface border border-border-strong rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 text-text-primary placeholder:text-text-muted"
              />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-border-subtle mb-6 overflow-x-auto custom-scrollbar">
          {[
            { id: "hospitals", label: "Hospitals", icon: Building2, count: hospitals.length },
            { id: "doctors", label: "Specialists", icon: Stethoscope, count: doctors.length },
            { id: "ambulances", label: "Ambulances", icon: AmbulanceIcon, count: ambulances.length }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 px-5 py-3 font-medium transition-all border-b-2 whitespace-nowrap text-sm", 
                  isActive 
                    ? "border-brand-primary text-brand-primary bg-brand-primary/5" 
                    : "border-transparent text-text-secondary hover:text-text-primary hover:bg-bg-surface"
                )}
              >
                <Icon size={16} />
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

        {loading ? (
          <div className="min-h-[400px] flex flex-col items-center justify-center p-12">
            <Loader2 className="w-10 h-10 text-brand-primary animate-spin mb-4" />
            <p className="text-text-secondary font-medium">Synchronizing resource registry...</p>
          </div>
        ) : (
          <div className="animate-in fade-in duration-300">
            {/* Tab Content: Hospitals */}
            {activeTab === "hospitals" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {filteredHospitals.map(h => (
                  <div key={h.id} className="glass-panel p-5 flex flex-col group hover:-translate-y-1 transition-transform duration-300">
                    <div className="flex justify-between items-start mb-3 gap-2">
                      <h3 className="font-bold text-base text-text-primary group-hover:text-brand-primary transition-colors line-clamp-2">{h.name}</h3>
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-1 rounded-md shrink-0 uppercase tracking-wider", 
                        h.emergency_status === "OPEN" ? "bg-status-success/10 text-status-success border border-status-success/20" : 
                        h.emergency_status === "HIGH_LOAD" ? "bg-status-warning/10 text-status-warning border border-status-warning/20" : 
                        "bg-status-danger/10 text-status-danger border border-status-danger/20"
                      )}>
                        {h.emergency_status}
                      </span>
                    </div>
                    
                    <div className="flex items-start gap-1.5 text-xs text-text-secondary mb-4">
                      <MapPin size={14} className="shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{h.address}</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mb-5 mt-auto">
                      <div className="bg-bg-secondary rounded-lg p-2.5 text-center border border-border-strong">
                        <p className="text-[10px] text-text-muted uppercase font-bold tracking-wider mb-1">ICU Capacity</p>
                        <p className="text-xl font-bold text-status-success">{h.available_icu_beds} <span className="text-xs text-text-muted font-medium">/ {h.icu_capacity}</span></p>
                      </div>
                      <div className="bg-bg-secondary rounded-lg p-2.5 text-center border border-border-strong">
                        <p className="text-[10px] text-text-muted uppercase font-bold tracking-wider mb-1">Load Level</p>
                        <p className="text-xl font-bold text-text-primary">{h.current_occupancy}</p>
                      </div>
                    </div>
    
                    <div className="flex flex-wrap gap-1.5 pt-4 border-t border-border-subtle">
                      {h.trauma_capability && <span className="text-[10px] font-semibold bg-bg-secondary border border-border-strong text-text-secondary px-2 py-1 rounded shadow-sm">Trauma</span>}
                      {h.cardiac_capability && <span className="text-[10px] font-semibold bg-bg-secondary border border-border-strong text-text-secondary px-2 py-1 rounded shadow-sm">Cardiac</span>}
                      {h.neurology_capability && <span className="text-[10px] font-semibold bg-bg-secondary border border-border-strong text-text-secondary px-2 py-1 rounded shadow-sm">Neuro</span>}
                      {h.ventilator_available && <span className="text-[10px] font-semibold bg-bg-secondary border border-border-strong text-text-secondary px-2 py-1 rounded shadow-sm">Ventilator</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
    
            {/* Tab Content: Doctors */}
            {activeTab === "doctors" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {filteredDoctors.map(d => (
                  <div key={d.id} className="glass-panel p-5 flex flex-col group hover:-translate-y-1 transition-transform duration-300">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-lg text-text-primary group-hover:text-brand-secondary transition-colors">{d.name}</h3>
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-1 rounded-md shrink-0 uppercase tracking-wider shadow-sm", 
                        d.availability === "AVAILABLE" ? "bg-status-success/10 text-status-success border border-status-success/20" : 
                        d.availability === "BUSY" ? "bg-status-warning/10 text-status-warning border border-status-warning/20" : 
                        "bg-bg-secondary text-text-muted border border-border-strong"
                      )}>
                        {d.availability}
                      </span>
                    </div>
                    <p className="text-sm text-brand-secondary font-semibold mb-4">{d.specialization}</p>
                    
                    <div className="flex items-center gap-2 bg-bg-secondary border border-border-strong rounded-lg p-3 mb-5 mt-auto">
                      <Building2 size={16} className="text-text-muted" />
                      <div className="text-xs">
                        <p className="font-medium text-text-primary">{d.hospital.name}</p>
                        <p className="text-text-muted mt-0.5 font-mono">{d.doctor_id}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs font-medium border-t border-border-subtle pt-4">
                      <div className="flex items-center gap-1.5 text-text-secondary">
                        <Activity size={14} className={d.current_emergency_load > 0 ? "text-status-warning" : "text-text-muted"} />
                        Load: <span className="text-text-primary ml-0.5">{d.current_emergency_load} cases</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-text-secondary">
                        <Clock size={14} className="text-text-muted" />
                        {d.shift} Shift
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
    
            {/* Tab Content: Ambulances */}
            {activeTab === "ambulances" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {filteredAmbulances.map(a => (
                  <div key={a.id} className="glass-panel p-5 flex flex-col group hover:-translate-y-1 transition-transform duration-300">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-lg text-text-primary font-mono group-hover:text-brand-primary transition-colors">{a.ambulance_id}</h3>
                        {a.vehicle_number && <p className="text-xs text-text-muted font-mono mt-0.5">{a.vehicle_number}</p>}
                      </div>
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-1 rounded-md shrink-0 uppercase tracking-wider shadow-sm", 
                        a.status === "AVAILABLE" ? "bg-status-success/10 text-status-success border border-status-success/20" : 
                        a.status === "ON_ROUTE" ? "bg-status-info/10 text-status-info border border-status-info/20" : 
                        a.status === "AT_HOSPITAL" ? "bg-brand-secondary/10 text-brand-secondary border border-brand-secondary/20" : 
                        "bg-status-danger/10 text-status-danger border border-status-danger/20"
                      )}>
                        {a.status}
                      </span>
                    </div>
                    
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <span className="bg-bg-elevated border border-border-strong text-text-primary text-xs px-2.5 py-1 rounded-md uppercase tracking-wider font-bold shadow-sm">
                        {a.type}
                      </span>
                      <span className="text-xs text-text-secondary font-medium px-2 py-1 rounded-md bg-bg-secondary border border-border-subtle">
                        Crew: {a.crew_type}
                      </span>
                      {a.data_type === "SYNTHETIC_DEMO" && (
                        <span className="bg-status-warning/10 text-status-warning border border-status-warning/30 text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold tracking-tight shadow-sm ml-auto">
                          DEMO
                        </span>
                      )}
                    </div>
    
                    {a.base_hospital && (
                      <div className="mb-5 bg-bg-secondary rounded-lg p-3 border border-border-strong flex items-start gap-2 mt-auto">
                        <Building2 size={16} className="text-text-muted mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[10px] text-text-muted uppercase font-bold tracking-wider mb-0.5">Assigned Base</p>
                          <p className="text-xs font-medium text-text-primary line-clamp-2" title={a.base_hospital.name}>
                            {a.base_hospital.name}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-2 mb-5">
                      <p className="text-[10px] text-text-muted uppercase font-bold tracking-wider">On-Board Equipment</p>
                      <div className="flex flex-wrap gap-1.5">
                        {a.equipment.map((eq: string) => (
                          <span key={eq} className="text-[10px] font-semibold bg-bg-surface border border-border-strong text-text-secondary px-1.5 py-0.5 rounded shadow-sm">
                            {eq.replace("_", " ")}
                          </span>
                        ))}
                      </div>
                    </div>
    
                    <div className="mt-auto pt-4 border-t border-border-subtle flex justify-between items-center text-xs text-text-secondary font-medium">
                      <span className="flex items-center gap-1.5 bg-bg-secondary px-2 py-1 rounded border border-border-subtle" title="Patient Capacity">
                        <Users size={12} className="text-text-muted" /> {a.patient_capacity} Patient{a.patient_capacity !== 1 ? 's' : ''}
                      </span>
                      {a.updated_at && (
                        <span className="flex items-center gap-1.5" title="Last Updated">
                          <Clock size={12} className="text-text-muted" />
                          {new Date(a.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Empty State */}
            {((activeTab === 'hospitals' && filteredHospitals.length === 0) || 
              (activeTab === 'doctors' && filteredDoctors.length === 0) || 
              (activeTab === 'ambulances' && filteredAmbulances.length === 0)) && (
              <div className="py-20 text-center">
                <Search size={40} className="text-border-strong mx-auto mb-4" />
                <h3 className="text-lg font-bold text-text-primary mb-1">No resources found</h3>
                <p className="text-text-muted text-sm">Adjust your search query to find resources.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
