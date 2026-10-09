"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  ShieldAlert, 
  Map as MapIcon, 
  Network, 
  Activity, 
  Ambulance, 
  Building2, 
  UserRound,
  ArrowRight,
  Zap,
  Globe2,
  Stethoscope
} from "lucide-react";
import { 
  getHospitals, 
  getDoctors, 
  getAmbulances, 
  listEmergencyCases 
} from "@/lib/api";

export default function HomePage() {
  const [metrics, setMetrics] = useState({
    activeCases: 0,
    hospitals: 0,
    doctors: 0,
    ambulances: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const [casesRes, hospRes, docRes, ambRes] = await Promise.all([
          listEmergencyCases(),
          getHospitals(),
          getDoctors(),
          getAmbulances()
        ]);
        
        setMetrics({
          activeCases: casesRes.ok ? casesRes.data.cases.length : 0,
          hospitals: hospRes.ok ? hospRes.data.length : 0,
          doctors: docRes.ok ? docRes.data.length : 0,
          ambulances: ambRes.ok ? ambRes.data.length : 0,
        });
      } catch (error) {
        console.error("Failed to load metrics", error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchMetrics();
  }, []);

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] relative overflow-hidden">
      {/* Decorative Background Gradients */}
      <div className="absolute inset-0 z-0 bg-bg-main pointer-events-none">
        <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full bg-brand-primary/10 blur-[120px] mix-blend-screen opacity-70" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[45%] h-[45%] rounded-full bg-brand-secondary/15 blur-[120px] mix-blend-screen opacity-70" />
        <div className="absolute top-[30%] left-[40%] w-[30%] h-[30%] rounded-full bg-blue-accent/10 blur-[100px] opacity-50" />
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-5 dark:opacity-10"></div>
      </div>

      <div className="container mx-auto px-4 py-16 md:py-24 flex-1 flex flex-col relative z-10">
        
        {/* Hero Section */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-16 max-w-7xl mx-auto w-full mb-24">
          
          <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg-surface border border-brand-primary/20 text-brand-primary text-sm font-bold tracking-wide shadow-sm mb-8 animate-in slide-in-from-bottom-4 fade-in duration-500">
              <span className="relative flex h-2 w-2 rounded-full bg-brand-primary">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75"></span>
              </span>
              E-Rakshak AI V2.0 LIVE
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 text-text-primary leading-[1.1] animate-in slide-in-from-bottom-6 fade-in duration-700">
              Coordinating <br/> Emergency Care. <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary via-blue-accent to-brand-secondary">Faster.</span>
            </h1>
            
            <p className="text-lg md:text-xl text-text-secondary max-w-xl mb-10 leading-relaxed font-medium animate-in slide-in-from-bottom-8 fade-in duration-700 delay-100">
              The next-generation operations command center. Location-aware intake, precision hospital matching, and real-time autonomous care orchestration.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto animate-in slide-in-from-bottom-10 fade-in duration-700 delay-200">
              <Link 
                href="/intake"
                className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-brand-primary to-brand-secondary hover:opacity-90 text-white font-bold transition-all shadow-[0_0_30px_rgba(102,126,234,0.3)] hover:shadow-[0_0_40px_rgba(102,126,234,0.5)] hover:-translate-y-1"
              >
                <ShieldAlert size={20} />
                Report Emergency
              </Link>
              <Link 
                href="/resources"
                className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-bg-surface border border-border-strong hover:bg-bg-elevated hover:border-brand-primary/40 text-text-primary font-bold transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
              >
                Open Dashboard
                <ArrowRight size={20} className="text-text-muted" />
              </Link>
            </div>
          </div>

          {/* Product Preview Card */}
          <div className="flex-1 w-full max-w-2xl animate-in fade-in zoom-in-95 duration-1000 delay-300">
            <div className="glass-panel border-brand-primary/20 shadow-2xl relative overflow-hidden rounded-2xl group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-primary via-blue-accent to-brand-secondary opacity-50 group-hover:opacity-100 transition-opacity"></div>
              
              <div className="p-4 border-b border-border-subtle bg-bg-surface/50 flex items-center justify-between">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-status-danger/80"></div>
                  <div className="w-3 h-3 rounded-full bg-status-warning/80"></div>
                  <div className="w-3 h-3 rounded-full bg-status-success/80"></div>
                </div>
                <div className="text-[10px] font-bold tracking-widest uppercase text-text-muted">Live Telemetry Preview</div>
              </div>

              <div className="p-6 md:p-8 bg-bg-secondary/20">
                <div className="flex items-center justify-between mb-8 relative">
                  {/* Pathway Graphic */}
                  <div className="absolute top-1/2 left-0 w-full h-[2px] bg-gradient-to-r from-status-danger via-status-warning to-status-success -translate-y-1/2 opacity-50 z-0 rounded"></div>
                  
                  <div className="relative z-10 w-14 h-14 rounded-full bg-status-danger/10 border-2 border-bg-surface ring-2 ring-status-danger/30 flex items-center justify-center shadow-lg transform transition-transform hover:scale-110">
                    <Activity size={24} className="text-status-danger animate-pulse" />
                  </div>
                  <div className="relative z-10 w-14 h-14 rounded-full bg-status-warning/10 border-2 border-bg-surface ring-2 ring-status-warning/30 flex items-center justify-center shadow-lg transform transition-transform hover:scale-110">
                    <Ambulance size={24} className="text-status-warning" />
                  </div>
                  <div className="relative z-10 w-14 h-14 rounded-full bg-status-success/10 border-2 border-bg-surface ring-2 ring-status-success/30 flex items-center justify-center shadow-lg transform transition-transform hover:scale-110">
                    <Building2 size={24} className="text-status-success" />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="bg-bg-surface border border-border-strong rounded-lg p-3 flex justify-between items-center shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-brand-primary/10 rounded text-brand-primary"><Globe2 size={16} /></div>
                      <div>
                        <div className="text-sm font-bold text-text-primary">Dispatch Optimal Route</div>
                        <div className="text-xs text-text-secondary">AI-calculated vector ETA 4m 12s</div>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold bg-status-success/10 text-status-success px-2 py-1 rounded">MATCH</span>
                  </div>
                  <div className="bg-bg-surface border border-border-strong rounded-lg p-3 flex justify-between items-center shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-status-warning/10 rounded text-status-warning"><Zap size={16} /></div>
                      <div>
                        <div className="text-sm font-bold text-text-primary">Real-time Load Balancing</div>
                        <div className="text-xs text-text-secondary">Diverting from saturated ICU</div>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold bg-status-warning/10 text-status-warning px-2 py-1 rounded">REROUTE</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto w-full mb-20 animate-in slide-in-from-bottom-12 fade-in duration-700 delay-500">
          {[
            {
              title: "Emergency Intelligence",
              description: "Structured medical intake, precision patient location resolution via GIS, and instant algorithmic clinical triage.",
              icon: ShieldAlert,
              href: "/intake",
              linkText: "Start Intake Workflow",
              color: "text-brand-primary",
              bg: "bg-brand-primary/10"
            },
            {
              title: "Real-Time Orchestration",
              description: "Autonomous ranking of optimal care pathways via WebSocket state sync for live hospital and doctor availability.",
              icon: Network,
              href: "/resources",
              linkText: "Explore Registry",
              color: "text-brand-secondary",
              bg: "bg-brand-secondary/10"
            }
          ].map((feature, i) => (
            <div key={i} className="glass-panel p-8 flex flex-col h-full transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:border-border-glass group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-2xl -mr-10 -mt-10 transition-opacity opacity-0 group-hover:opacity-100"></div>
              
              <div className={`w-14 h-14 rounded-xl ${feature.bg} flex items-center justify-center ${feature.color} mb-6 shadow-sm border border-white/5 group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon size={26} strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-bold text-text-primary mb-3">{feature.title}</h3>
              <p className="text-text-secondary leading-relaxed mb-8 flex-1 text-sm font-medium">
                {feature.description}
              </p>
              <Link 
                href={feature.href}
                className={`inline-flex items-center gap-2 text-sm font-bold ${feature.color} hover:opacity-80 transition-opacity mt-auto`}
              >
                {feature.linkText}
                <ArrowRight size={16} className="transform group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          ))}
        </div>

        {/* System Metrics */}
        <div className="max-w-7xl mx-auto w-full border-t border-border-subtle pt-16">
          <h3 className="text-center text-sm font-bold uppercase tracking-widest text-text-muted mb-8">Live Platform Telemetry</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[
              { label: "Active Incidents", value: metrics.activeCases, icon: Activity, color: "text-status-danger" },
              { label: "Network Hospitals", value: metrics.hospitals, icon: Building2, color: "text-brand-primary" },
              { label: "Specialists Online", value: metrics.doctors, icon: Stethoscope, color: "text-brand-secondary" },
              { label: "Units Deployed", value: metrics.ambulances, icon: Ambulance, color: "text-status-info" },
            ].map((metric, i) => (
              <div key={i} className="bg-bg-surface border border-border-strong rounded-2xl p-6 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                <metric.icon size={24} className={`mb-4 ${metric.color} opacity-80`} />
                {loading ? (
                  <div className="h-10 w-20 bg-bg-secondary rounded animate-pulse mb-1" />
                ) : (
                  <span className="text-4xl font-extrabold text-text-primary mb-1 tracking-tight">{metric.value}</span>
                )}
                <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">{metric.label}</span>
                
                <div className="absolute top-3 right-3">
                  <span className="text-[9px] text-text-muted px-1.5 py-0.5 rounded bg-bg-secondary border border-border-subtle font-mono font-bold tracking-widest">DEMO</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
