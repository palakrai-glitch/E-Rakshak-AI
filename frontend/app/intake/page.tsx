"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  createEmergencyCase, 
  updateEmergencyCase, 
  recoverEmergencyCase,
  getOrchestration,
  EmergencyCaseCreate, 
  EmergencyCaseResponse,
  OrchestrationResult
} from "@/lib/api";
import { cn } from "@/lib/utils";
import LocationPicker from "@/components/LocationPicker";
import { 
  AlertTriangle, 
  User, 
  Activity, 
  MapPin, 
  CheckCircle2, 
  ArrowRight,
  ArrowLeft,
  Loader2,
  ShieldAlert,
  Search,
  Save
} from "lucide-react";

const STEPS = [
  { id: 1, title: "Emergency Info", icon: AlertTriangle },
  { id: 2, title: "Reporter & Patient", icon: User },
  { id: 3, title: "Vitals & Triage", icon: Activity },
  { id: 4, title: "Location", icon: MapPin },
];

type IntakeMode = "START" | "RECOVER" | "INTAKE" | "SUCCESS" | "PATHWAY";

export default function IntakePage() {
  const router = useRouter();
  const [mode, setMode] = useState<IntakeMode>("START");
  
  // Recovery State
  const [recoverToken, setRecoverToken] = useState("");
  const [recoverPhone, setRecoverPhone] = useState("");
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoverError, setRecoverError] = useState<string | null>(null);

  // Intake State
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"IDLE" | "SAVING" | "SAVED" | "ERROR">("IDLE");
  const [pathwayData, setPathwayData] = useState<OrchestrationResult | null>(null);
  
  const [formData, setFormData] = useState<Partial<EmergencyCaseCreate>>({
    source: "OPERATOR",
    chief_complaint: "",
    incident_description: "",
    symptoms: [],
    reporter_name: "",
    reporter_phone: "",
    reporter_relationship: "",
    patient_name: "",
    patient_age: undefined,
    patient_gender: "",
    heart_rate: undefined,
    systolic_bp: undefined,
    diastolic_bp: undefined,
    spo2: undefined,
    respiratory_rate: undefined,
    temperature: undefined,
    conscious: undefined,
    breathing: undefined,
    bleeding: undefined,
    mobility: undefined,
    address: "",
    landmark: "",
    city: "Raipur",
    state: "Chhattisgarh",
    latitude: undefined,
    longitude: undefined,
    additional_notes: "",
  });

  const updateForm = (key: keyof EmergencyCaseCreate, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  // --- RECOVERY LOGIC ---
  async function handleRecover(e: React.FormEvent) {
    e.preventDefault();
    if (!recoverToken.trim() || !recoverPhone.trim()) {
      setRecoverError("ER Token and Phone Number are required.");
      return;
    }
    
    setIsRecovering(true);
    setRecoverError(null);
    
    const result = await recoverEmergencyCase(recoverToken.trim(), recoverPhone.trim());
    setIsRecovering(false);
    
    if (result.ok) {
      const recoveredCase = result.data;
      if (recoveredCase.status === "RESOLVED" || recoveredCase.status === "COMPLETED") {
        setRecoverError("This case has already been resolved and cannot be resumed.");
        return;
      }
      
      setActiveCaseId(recoveredCase.case_id);
      
      // Map response to form data
      const newFormData: Partial<EmergencyCaseCreate> = { ...recoveredCase };
      // Remove backend-only fields from form data state
      delete (newFormData as any).case_id;
      delete (newFormData as any).status;
      delete (newFormData as any).created_at;
      delete (newFormData as any).message;
      delete (newFormData as any).id;
      
      setFormData(newFormData);
      
      // Infer step progress based on data presence
      let step = 1;
      if (newFormData.latitude || newFormData.address) step = 4;
      else if (newFormData.heart_rate !== null && newFormData.heart_rate !== undefined || newFormData.conscious !== null && newFormData.conscious !== undefined) step = 3;
      else if (newFormData.reporter_name || newFormData.patient_name) step = 2;
      
      if (step === 4) {
        // Try to fetch orchestration if intake is complete
        const orchRes = await getOrchestration(recoveredCase.case_id);
        if (orchRes.ok && orchRes.data.recommended_pathway) {
          setPathwayData(orchRes.data);
          setMode("PATHWAY");
          return;
        }
      }
      
      setCurrentStep(step);
      setMode("INTAKE");
    } else {
      setRecoverError("Invalid ER Token or Phone Number. Please check your details and try again.");
    }
  }

  // --- INTAKE LOGIC ---
  async function handleNextStep() {
    setIsSubmitting(true);
    setError(null);
    setSaveStatus("SAVING");

    try {
      if (currentStep === 1 && !activeCaseId) {
        // Create case for the first time
        const payload: EmergencyCaseCreate = {
          ...formData,
          source: formData.source || "OPERATOR",
          chief_complaint: formData.chief_complaint || "Not provided",
        } as EmergencyCaseCreate;
        
        const result = await createEmergencyCase(payload);
        if (result.ok) {
          setActiveCaseId(result.data.case_id);
          setSaveStatus("SAVED");
          setCurrentStep(2);
        } else {
          setError(result.error);
          setSaveStatus("ERROR");
        }
      } else {
        // Update existing case
        if (!activeCaseId) throw new Error("No active case ID to update.");
        const result = await updateEmergencyCase(activeCaseId, formData);
        if (result.ok) {
          setSaveStatus("SAVED");
          if (currentStep < 4) {
            setCurrentStep(currentStep + 1);
          } else {
            setMode("SUCCESS");
          }
        } else {
          setError(result.error);
          setSaveStatus("ERROR");
        }
      }
    } catch (err) {
      setError("An unexpected error occurred while saving.");
      setSaveStatus("ERROR");
    } finally {
      setIsSubmitting(false);
      
      // Reset save status badge after 3 seconds
      setTimeout(() => {
        setSaveStatus(prev => prev === "SAVED" ? "IDLE" : prev);
      }, 3000);
    }
  }

  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  function resetForm() {
    setActiveCaseId(null);
    setError(null);
    setCurrentStep(1);
    setMode("START");
    setRecoverToken("");
    setRecoverPhone("");
    setFormData({
      source: "OPERATOR",
      chief_complaint: "",
      incident_description: "",
      symptoms: [],
      reporter_name: "",
      reporter_phone: "",
      reporter_relationship: "",
      patient_name: "",
      patient_age: undefined,
      patient_gender: "",
      address: "",
      landmark: "",
      city: "Raipur",
      state: "Chhattisgarh",
      latitude: undefined,
      longitude: undefined,
      additional_notes: "",
    });
  }

  async function handleConfirmPathway() {
    if (!activeCaseId) return;
    setIsSubmitting(true);
    try {
      const result = await updateEmergencyCase(activeCaseId, { patient_pathway_confirmed: true });
      if (result.ok) {
        setFormData(prev => ({ ...prev, patient_pathway_confirmed: true }));
      } else {
        alert("Failed to confirm pathway: " + result.error);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // --- RENDERERS ---
  if (mode === "PATHWAY" && pathwayData?.recommended_pathway) {
    const pathway = pathwayData.recommended_pathway;
    const isConfirmed = formData.patient_pathway_confirmed;
    
    return (
      <main className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-6 bg-bg-main relative">
        <div className="w-full max-w-2xl glass-panel p-8 md:p-10 text-center space-y-6 relative z-10">
          <div className="mx-auto w-16 h-16 bg-brand-primary/10 text-brand-primary rounded-full flex items-center justify-center mb-4">
            <Activity size={32} />
          </div>
          
          <h2 className="text-3xl font-bold text-text-primary">Recommended Care Pathway</h2>
          <p className="text-text-secondary">Review the proposed emergency response plan for your case.</p>
          
          <div className="text-left space-y-4 mt-6">
            <div className="bg-bg-elevated p-4 rounded-lg border border-border-strong flex justify-between items-center">
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wider font-bold mb-1">ER Token</p>
                <p className="font-mono text-lg font-bold text-text-primary">{activeCaseId}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-text-muted uppercase tracking-wider font-bold mb-1">Status</p>
                {isConfirmed ? (
                  <span className="px-2 py-1 bg-status-success/10 text-status-success font-bold text-xs rounded border border-status-success/30">CONFIRMED</span>
                ) : (
                  <span className="px-2 py-1 bg-status-warning/10 text-status-warning font-bold text-xs rounded border border-status-warning/30">PENDING CONFIRMATION</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="glass-panel p-4 border-status-warning/20 text-center">
                <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider mb-2">Hospital</p>
                <p className="font-bold text-sm text-text-primary">{pathway.hospital.resource_id}</p>
              </div>
              <div className="glass-panel p-4 border-status-info/20 text-center">
                <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider mb-2">Ambulance</p>
                <p className="font-bold text-sm text-text-primary">{pathway.ambulance.resource_id}</p>
                {formData.ambulance_assignment_status && (
                  <p className="text-[9px] mt-2 font-bold uppercase bg-bg-secondary px-1 py-0.5 rounded text-text-secondary">
                    {formData.ambulance_assignment_status}
                  </p>
                )}
              </div>
              <div className="glass-panel p-4 border-status-success/20 text-center">
                <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider mb-2">Specialist</p>
                <p className="font-bold text-sm text-text-primary">{pathway.doctor.resource_id}</p>
              </div>
            </div>
          </div>

          <div className="pt-6">
            {!isConfirmed ? (
              <button 
                onClick={handleConfirmPathway}
                disabled={isSubmitting}
                className="w-full py-3.5 bg-brand-primary hover:bg-brand-accent text-white rounded-xl font-bold transition-all shadow-lg shadow-brand-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                Confirm Care Pathway
              </button>
            ) : (
              <div className="w-full py-3.5 bg-status-success/10 border border-status-success/30 text-status-success rounded-xl font-bold flex items-center justify-center gap-2">
                <CheckCircle2 size={20} />
                Pathway Confirmed
              </div>
            )}
            
            <button 
              onClick={() => router.push("/")}
              className="w-full mt-4 py-3 bg-bg-surface hover:bg-bg-elevated border border-border-strong text-text-primary rounded-xl font-bold transition-all"
            >
              Return Home
            </button>
          </div>
        </div>
      </main>
    );
  }

  // --- RENDERERS ---
  if (mode === "SUCCESS") {
    return (
      <main className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-6 bg-bg-main">
        <div className="w-full max-w-lg glass-panel p-10 text-center space-y-6">
          <div className="mx-auto w-20 h-20 bg-status-success/20 text-status-success rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-3xl font-bold text-text-primary">Emergency Intake Complete</h2>
          
          <div className="bg-bg-elevated p-6 rounded-lg text-left border border-border-strong mt-6">
            <p className="text-sm text-text-muted mb-1">Assigned ER Token</p>
            <p className="text-3xl font-mono font-black text-brand-primary tracking-tight mb-5">{activeCaseId}</p>
            
            <p className="text-sm text-text-muted mb-1">Current Status</p>
            <span className="inline-block px-3 py-1 bg-status-danger/20 text-status-danger font-bold text-xs tracking-wider rounded border border-status-danger/30">
              OPEN / AWAITING TRIAGE
            </span>
          </div>

          <p className="text-text-secondary mt-4 font-medium">The emergency response network has been alerted and case data is secured.</p>
          
          <div className="pt-6 flex flex-col sm:flex-row gap-4">
            <Link 
              href={`/cases/${activeCaseId}/triage`}
              className="flex-1 bg-brand-primary hover:bg-brand-accent text-white font-bold py-3 px-4 rounded-lg transition-colors flex justify-center items-center shadow-lg"
            >
              Run Triage Assessment
            </Link>
            <Link 
              href="/cases"
              className="flex-1 bg-bg-surface hover:bg-bg-elevated text-text-primary font-bold py-3 px-4 rounded-lg transition-colors border border-border-strong text-center"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (mode === "START") {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-bg-main p-4 md:p-8 flex items-center justify-center">
        <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="glass-panel p-8 flex flex-col items-center text-center hover:border-brand-primary/50 transition-colors group cursor-pointer" onClick={() => setMode("INTAKE")}>
            <div className="w-16 h-16 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-2xl font-bold text-text-primary mb-3">Start New Case</h2>
            <p className="text-text-secondary mb-8">Begin a fresh emergency intake workflow and generate a new ER Token.</p>
            <button className="mt-auto px-6 py-3 bg-brand-primary text-white font-bold rounded-xl w-full shadow-md flex items-center justify-center gap-2">
              Start Intake <ArrowRight size={18} />
            </button>
          </div>
          
          <div className="glass-panel p-8 flex flex-col items-center text-center hover:border-blue-accent/50 transition-colors group cursor-pointer" onClick={() => setMode("RECOVER")}>
            <div className="w-16 h-16 rounded-2xl bg-blue-accent/10 text-blue-accent flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Search size={32} />
            </div>
            <h2 className="text-2xl font-bold text-text-primary mb-3">Resume Existing Case</h2>
            <p className="text-text-secondary mb-8">Recover an incomplete intake securely using an ER Token and contact number.</p>
            <button className="mt-auto px-6 py-3 bg-bg-surface border border-border-strong text-text-primary font-bold rounded-xl w-full shadow-sm flex items-center justify-center gap-2 hover:bg-bg-elevated">
              Recover Token <ArrowRight size={18} className="text-text-muted" />
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (mode === "RECOVER") {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-bg-main p-4 md:p-8 flex flex-col items-center justify-center">
        <div className="max-w-md w-full glass-panel p-8">
          <button onClick={() => setMode("START")} className="text-text-muted hover:text-text-primary flex items-center gap-2 text-sm font-medium mb-6">
            <ArrowLeft size={16} /> Back
          </button>
          
          <h2 className="text-2xl font-bold text-text-primary mb-2">Resume Intake</h2>
          <p className="text-text-secondary text-sm mb-8">Enter the ER Token and the reporter's phone number to securely recover the session.</p>
          
          {recoverError && (
            <div className="mb-6 p-3 bg-status-danger/10 border border-status-danger/30 text-status-danger rounded-lg flex items-start gap-2 text-sm">
              <AlertTriangle className="mt-0.5 shrink-0" size={16} />
              <p>{recoverError}</p>
            </div>
          )}

          <form onSubmit={handleRecover} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">ER Token *</label>
              <input 
                type="text" 
                required
                placeholder="e.g. ER-20231015-ABCD"
                value={recoverToken}
                onChange={e => setRecoverToken(e.target.value)}
                className="w-full bg-bg-surface border border-border-strong text-text-primary rounded-lg px-4 py-3 font-mono focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Reporter Phone Number *</label>
              <input 
                type="tel" 
                required
                placeholder="Used during initial intake"
                value={recoverPhone}
                onChange={e => setRecoverPhone(e.target.value)}
                className="w-full bg-bg-surface border border-border-strong text-text-primary rounded-lg px-4 py-3 focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none"
              />
            </div>
            
            <button 
              type="submit" 
              disabled={isRecovering}
              className="w-full py-3 bg-brand-primary hover:bg-brand-accent text-white font-bold rounded-lg transition-colors flex justify-center items-center gap-2 mt-4 disabled:opacity-70"
            >
              {isRecovering ? <><Loader2 size={18} className="animate-spin" /> Verifying...</> : "Verify & Resume"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  // mode === "INTAKE"
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-bg-main p-4 md:p-8 flex justify-center">
      <div className="max-w-4xl w-full">
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-text-primary flex items-center gap-3">
              <ShieldAlert className="text-status-danger" size={28} />
              Emergency Intake
            </h1>
            <p className="text-text-muted mt-2 font-medium">
              {activeCaseId ? `Resuming Case: ${activeCaseId}` : "Start a new location-aware emergency case."}
            </p>
          </div>
          {activeCaseId && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-bg-surface border border-border-strong rounded-md text-xs font-bold text-text-secondary">
              <Save size={14} className={saveStatus === "SAVING" ? "animate-pulse text-brand-primary" : saveStatus === "SAVED" ? "text-status-success" : ""} />
              {saveStatus === "SAVING" ? "Saving draft..." : saveStatus === "SAVED" ? "Draft saved" : "Auto-saves on Next"}
            </div>
          )}
        </div>

        {/* Progress Stepper */}
        <div className="mb-10 overflow-x-auto pb-4">
          <div className="flex justify-between relative min-w-[500px]">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-border-subtle rounded z-0" />
            <div 
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-brand-primary rounded z-0 transition-all duration-300"
              style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
            />
            
            {STEPS.map((step) => {
              const Icon = step.icon;
              const isActive = step.id === currentStep;
              const isCompleted = step.id < currentStep;
              
              return (
                <div key={step.id} className="relative z-10 flex flex-col items-center gap-2">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-300",
                    isActive ? "bg-bg-surface border-brand-primary text-brand-primary shadow-[0_0_15px_rgba(102,126,234,0.3)]" : 
                    isCompleted ? "bg-brand-primary border-brand-primary text-white" : 
                    "bg-bg-surface border-border-strong text-text-muted"
                  )}>
                    {isCompleted ? <CheckCircle2 size={18} /> : <Icon size={18} />}
                  </div>
                  <span className={cn(
                    "text-xs font-bold",
                    isActive || isCompleted ? "text-text-primary" : "text-text-muted"
                  )}>
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-status-danger/10 border border-status-danger/30 text-status-danger rounded-lg flex items-start gap-3">
            <AlertTriangle className="mt-0.5 shrink-0" size={20} />
            <p className="font-medium text-sm">{error}</p>
          </div>
        )}

        <div className="glass-panel overflow-hidden border-border-strong relative">
          {/* STEP 1: Emergency Info */}
          {currentStep === 1 && (
            <div className="p-6 md:p-8 animate-in fade-in duration-300">
              <h2 className="text-xl font-bold text-text-primary mb-6 border-b border-border-subtle pb-4">Emergency Details</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-text-secondary mb-2">Emergency Source *</label>
                  <select 
                    value={formData.source ?? ""}
                    onChange={e => updateForm("source", e.target.value)}
                    className="w-full bg-bg-surface border border-border-strong text-text-primary rounded-lg px-4 py-3 focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none transition-all font-medium"
                  >
                    <option value="CALLER">Caller</option>
                    <option value="PATIENT">Patient</option>
                    <option value="ATTENDANT">Attendant</option>
                    <option value="OPERATOR">Operator</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-text-secondary mb-2">Chief Complaint *</label>
                  <input 
                    type="text" 
                    value={formData.chief_complaint ?? ""}
                    onChange={e => updateForm("chief_complaint", e.target.value)}
                    placeholder="e.g., Severe chest pain, Road accident"
                    required
                    className="w-full bg-bg-surface border border-border-strong text-text-primary rounded-lg px-4 py-3 focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-text-secondary mb-2">Incident Description</label>
                  <textarea 
                    value={formData.incident_description ?? ""}
                    onChange={e => updateForm("incident_description", e.target.value)}
                    placeholder="Provide detailed observations..."
                    rows={4}
                    className="w-full bg-bg-surface border border-border-strong text-text-primary rounded-lg px-4 py-3 focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none font-medium resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Reporter & Patient Info */}
          {currentStep === 2 && (
            <div className="p-6 md:p-8 animate-in fade-in duration-300">
              <h2 className="text-xl font-bold text-text-primary mb-6 border-b border-border-subtle pb-4">Contact & Patient Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted">Reporter Info</h3>
                  
                  <div>
                    <label className="block text-sm font-bold text-text-secondary mb-2">Reporter Phone *</label>
                    <input 
                      type="tel" 
                      value={formData.reporter_phone ?? ""}
                      onChange={e => updateForm("reporter_phone", e.target.value)}
                      placeholder="+91..."
                      className="w-full bg-bg-surface border border-border-strong text-text-primary rounded-lg px-4 py-3 focus:ring-2 focus:ring-brand-primary outline-none font-medium"
                    />
                    <p className="text-[11px] text-text-muted mt-1.5">Required for securely resuming this case if interrupted.</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-text-secondary mb-2">Reporter Name</label>
                    <input 
                      type="text" 
                      value={formData.reporter_name ?? ""}
                      onChange={e => updateForm("reporter_name", e.target.value)}
                      className="w-full bg-bg-surface border border-border-strong text-text-primary rounded-lg px-4 py-3 focus:ring-2 focus:ring-brand-primary outline-none font-medium"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-text-secondary mb-2">Relationship to Patient</label>
                    <input 
                      type="text" 
                      value={formData.reporter_relationship ?? ""}
                      onChange={e => updateForm("reporter_relationship", e.target.value)}
                      placeholder="e.g., Self, Family, Bystander"
                      className="w-full bg-bg-surface border border-border-strong text-text-primary rounded-lg px-4 py-3 focus:ring-2 focus:ring-brand-primary outline-none font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted">Patient Info</h3>
                  
                  <div>
                    <label className="block text-sm font-bold text-text-secondary mb-2">Patient Name</label>
                    <input 
                      type="text" 
                      value={formData.patient_name ?? ""}
                      onChange={e => updateForm("patient_name", e.target.value)}
                      placeholder="Leave blank if unknown"
                      className="w-full bg-bg-surface border border-border-strong text-text-primary rounded-lg px-4 py-3 focus:ring-2 focus:ring-brand-primary outline-none font-medium"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-text-secondary mb-2">Age</label>
                      <input 
                        type="number" 
                        value={formData.patient_age ?? ""}
                        onChange={e => updateForm("patient_age", e.target.value ? Number(e.target.value) : undefined)}
                        className="w-full bg-bg-surface border border-border-strong text-text-primary rounded-lg px-4 py-3 focus:ring-2 focus:ring-brand-primary outline-none font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-text-secondary mb-2">Gender</label>
                      <select 
                        value={formData.patient_gender ?? ""}
                        onChange={e => updateForm("patient_gender", e.target.value)}
                        className="w-full bg-bg-surface border border-border-strong text-text-primary rounded-lg px-4 py-3 focus:ring-2 focus:ring-brand-primary outline-none font-medium"
                      >
                        <option value="">Select</option>
                        <option value="M">Male</option>
                        <option value="F">Female</option>
                        <option value="O">Other</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Vitals & Triage Context */}
          {currentStep === 3 && (
            <div className="p-6 md:p-8 animate-in fade-in duration-300">
              <h2 className="text-xl font-bold text-text-primary mb-6 border-b border-border-subtle pb-4">Vitals & Assessment</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="space-y-6">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted">Observation Checklist</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { key: "conscious", label: "Conscious" },
                      { key: "breathing", label: "Breathing" },
                      { key: "bleeding", label: "Bleeding" },
                      { key: "mobility", label: "Mobile" },
                    ].map((item) => (
                      <label key={item.key} className="flex items-center gap-3 p-3 bg-bg-surface border border-border-strong rounded-lg cursor-pointer hover:border-brand-primary/50 transition-colors">
                        <input 
                          type="checkbox" 
                          checked={!!formData[item.key as keyof EmergencyCaseCreate]}
                          onChange={e => updateForm(item.key as keyof EmergencyCaseCreate, e.target.checked)}
                          className="w-4 h-4 text-brand-primary bg-bg-main border-border-strong rounded focus:ring-brand-primary"
                        />
                        <span className="text-sm font-bold text-text-primary">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted">Vitals (If available)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-text-secondary mb-1">Heart Rate (bpm)</label>
                      <input 
                        type="number" 
                        value={formData.heart_rate ?? ""}
                        onChange={e => updateForm("heart_rate", e.target.value ? Number(e.target.value) : undefined)}
                        className="w-full bg-bg-surface border border-border-strong text-text-primary rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-brand-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-text-secondary mb-1">SpO2 (%)</label>
                      <input 
                        type="number" 
                        value={formData.spo2 ?? ""}
                        onChange={e => updateForm("spo2", e.target.value ? Number(e.target.value) : undefined)}
                        className="w-full bg-bg-surface border border-border-strong text-text-primary rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-brand-primary outline-none"
                      />
                    </div>
                    <div className="col-span-2 flex items-center gap-2">
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-text-secondary mb-1">Systolic BP</label>
                        <input 
                          type="number" 
                          value={formData.systolic_bp ?? ""}
                          onChange={e => updateForm("systolic_bp", e.target.value ? Number(e.target.value) : undefined)}
                          className="w-full bg-bg-surface border border-border-strong text-text-primary rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-brand-primary outline-none"
                        />
                      </div>
                      <span className="text-text-muted mt-5">/</span>
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-text-secondary mb-1">Diastolic BP</label>
                        <input 
                          type="number" 
                          value={formData.diastolic_bp ?? ""}
                          onChange={e => updateForm("diastolic_bp", e.target.value ? Number(e.target.value) : undefined)}
                          className="w-full bg-bg-surface border border-border-strong text-text-primary rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-brand-primary outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Location Integration */}
          {currentStep === 4 && (
            <div className="p-6 md:p-8 animate-in fade-in duration-300">
              <h2 className="text-xl font-bold text-text-primary mb-6 border-b border-border-subtle pb-4">Incident Location</h2>
              
              <div className="mb-6 bg-blue-accent/10 border border-blue-accent/20 p-4 rounded-lg flex gap-3 text-blue-accent items-start">
                <MapPin className="shrink-0 mt-0.5" size={18} />
                <p className="text-sm font-medium">Use the interactive map to precisely locate the emergency. Precise coordinates significantly improve ambulance dispatch times.</p>
              </div>

              <div className="h-[350px] w-full rounded-xl overflow-hidden border border-border-strong shadow-inner relative z-0 mb-6">
                <LocationPicker 
                  onLocationSelect={(loc: { latitude: number | null, longitude: number | null, address: string }) => {
                    updateForm("latitude", loc.latitude);
                    updateForm("longitude", loc.longitude);
                    if (loc.address) updateForm("address", loc.address);
                  }} 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-text-secondary mb-2">Street Address</label>
                  <input 
                    type="text" 
                    value={formData.address ?? ""}
                    onChange={e => updateForm("address", e.target.value)}
                    className="w-full bg-bg-surface border border-border-strong text-text-primary rounded-lg px-4 py-2 focus:ring-1 focus:ring-brand-primary outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-text-secondary mb-2">Landmark</label>
                  <input 
                    type="text" 
                    value={formData.landmark ?? ""}
                    onChange={e => updateForm("landmark", e.target.value)}
                    className="w-full bg-bg-surface border border-border-strong text-text-primary rounded-lg px-4 py-2 focus:ring-1 focus:ring-brand-primary outline-none font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Form Navigation */}
          <div className="p-4 md:p-6 bg-bg-secondary/50 border-t border-border-strong flex items-center justify-between">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentStep === 1 || isSubmitting}
              className="px-5 py-2.5 rounded-lg font-bold text-text-secondary hover:text-text-primary hover:bg-bg-surface border border-transparent hover:border-border-strong transition-all disabled:opacity-30 disabled:pointer-events-none flex items-center gap-2"
            >
              <ArrowLeft size={18} /> Back
            </button>
            
            <button
              type="button"
              onClick={handleNextStep}
              disabled={isSubmitting}
              className={cn(
                "px-6 py-2.5 rounded-lg font-bold text-white transition-all shadow-md flex items-center gap-2 disabled:opacity-70",
                currentStep === STEPS.length 
                  ? "bg-status-success hover:bg-status-success/90 shadow-status-success/20" 
                  : "bg-brand-primary hover:bg-brand-accent shadow-brand-primary/20"
              )}
            >
              {isSubmitting ? (
                <><Loader2 size={18} className="animate-spin" /> {currentStep === 1 && !activeCaseId ? "Creating Case..." : "Saving..."}</>
              ) : currentStep === STEPS.length ? (
                <><CheckCircle2 size={18} /> Complete Intake</>
              ) : (
                <>Continue <ArrowRight size={18} /></>
              )}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
