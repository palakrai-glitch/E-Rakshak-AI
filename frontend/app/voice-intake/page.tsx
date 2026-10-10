"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createEmergencyCase, EmergencyCaseCreate } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Mic, MicOff, Square, RotateCcw, ChevronRight, ChevronLeft,
  Loader2, CheckCircle2, AlertTriangle, Info, Edit3,
  Volume2, ShieldAlert, ArrowRight, AlertCircle, PhoneCall,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

type Stage = "EXPLAIN" | "RECORD" | "REVIEW" | "SUCCESS";
type RecordState = "IDLE" | "RECORDING" | "PROCESSING" | "DONE" | "ERROR";

interface ExtractedData {
  source?: string | null;
  chief_complaint?: string | null;
  incident_description?: string | null;
  symptoms?: string[] | null;
  reporter_name?: string | null;
  reporter_phone?: string | null;
  reporter_relationship?: string | null;
  patient_name?: string | null;
  patient_age?: number | null;
  patient_gender?: string | null;
  heart_rate?: number | null;
  systolic_bp?: number | null;
  diastolic_bp?: number | null;
  spo2?: number | null;
  respiratory_rate?: number | null;
  temperature?: number | null;
  conscious?: boolean | null;
  breathing?: boolean | null;
  bleeding?: boolean | null;
  mobility?: boolean | null;
  address?: string | null;
  landmark?: string | null;
  city?: string | null;
  state?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  additional_notes?: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const REQUIRED_FIELDS = ["chief_complaint"] as const;

const FIELD_LABELS: Record<string, string> = {
  source: "Emergency Source",
  chief_complaint: "Chief Complaint",
  incident_description: "Incident Description",
  symptoms: "Symptoms",
  reporter_name: "Reporter Name",
  reporter_phone: "Reporter Phone",
  reporter_relationship: "Relationship to Patient",
  patient_name: "Patient Name",
  patient_age: "Patient Age",
  patient_gender: "Patient Gender",
  heart_rate: "Heart Rate (bpm)",
  systolic_bp: "Systolic BP (mmHg)",
  diastolic_bp: "Diastolic BP (mmHg)",
  spo2: "SpO₂ (%)",
  respiratory_rate: "Respiratory Rate",
  temperature: "Temperature (°C)",
  conscious: "Conscious",
  breathing: "Breathing",
  bleeding: "Bleeding",
  mobility: "Mobility OK",
  address: "Address",
  landmark: "Nearby Landmark",
  city: "City",
  state: "State",
  additional_notes: "Additional Notes",
};

const EMPTY_FORM: ExtractedData = {
  source: "CALLER",
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
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function VoiceIntakePage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("EXPLAIN");

  // Recording state
  const [recordState, setRecordState] = useState<RecordState>("IDLE");
  const [transcript, setTranscript] = useState("");
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);
  const interimRef = useRef("");

  // Extraction state
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractionSummary, setExtractionSummary] = useState("");
  const [missingRequired, setMissingRequired] = useState<string[]>([]);
  const [uncertainFields, setUncertainFields] = useState<string[]>([]);

  // Review form state
  const [formData, setFormData] = useState<ExtractedData>(EMPTY_FORM);

  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [erToken, setErToken] = useState<string | null>(null);

  // Check browser speech recognition support
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
    }
  }, []);

  const updateForm = (key: keyof ExtractedData, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  // ── Recording ───────────────────────────────────────────────────────────────

  const startRecording = useCallback(() => {
    setPermissionError(null);
    setRecordError(null);
    setTranscript("");
    interimRef.current = "";

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "en-IN";
      recognition.interimResults = true;
      recognition.continuous = true;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        let finalText = "";
        let interimText = "";
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalText += result[0].transcript + " ";
          } else {
            interimText += result[0].transcript;
          }
        }
        interimRef.current = interimText;
        setTranscript(finalText + interimText);
      };

      recognition.onerror = (event: any) => {
        if (event.error === "not-allowed" || event.error === "permission-denied") {
          setPermissionError(
            "Microphone access was denied. Please allow microphone access in your browser settings and try again."
          );
        } else if (event.error === "no-speech") {
          setRecordError("No speech was detected. Please speak clearly and try again.");
        } else {
          setRecordError(`Recording error: ${event.error}. Please try again.`);
        }
        setRecordState("ERROR");
      };

      recognition.onend = () => {
        setRecordState((prev) => (prev === "RECORDING" ? "DONE" : prev));
      };

      recognitionRef.current = recognition;
      recognition.start();
      setRecordState("RECORDING");
    } catch (err) {
      setRecordError("Could not start recording. Please check your microphone and try again.");
      setRecordState("ERROR");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setRecordState("DONE");
  }, []);

  const resetRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setTranscript("");
    setRecordState("IDLE");
    setRecordError(null);
    setPermissionError(null);
  };

  // ── Gemini extraction ────────────────────────────────────────────────────────

  const extractFromTranscript = async () => {
    if (!transcript.trim()) {
      setRecordError("Please provide a description before extracting.");
      return;
    }

    setIsExtracting(true);
    setExtractError(null);

    try {
      const backendUrl =
        process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
      const backendRes = await fetch(`${backendUrl}/api/voice-intake/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: transcript.trim() }),
      });

      if (!backendRes.ok) {
        const errBody = await backendRes.json().catch(() => ({}));
        const msg =
          errBody?.detail?.message ||
          errBody?.detail ||
          `Server error (${backendRes.status}). You can fill in the form manually.`;
        setExtractError(String(msg));
        setFormData({ ...EMPTY_FORM, incident_description: transcript.trim() });
        setStage("REVIEW");
        return;
      }

      const data = await backendRes.json();
      const extracted: ExtractedData = data.extracted || {};
      setFormData({ ...EMPTY_FORM, ...extracted });
      setMissingRequired(data.missing_required || []);
      setUncertainFields(data.uncertain_fields || []);
      setExtractionSummary(data.summary || "");
      setStage("REVIEW");
    } catch (err) {
      setExtractError(
        "Could not reach the AI extraction service. You can fill in the form manually."
      );
      setFormData({ ...EMPTY_FORM, incident_description: transcript.trim() });
      setStage("REVIEW");
    } finally {
      setIsExtracting(false);
    }
  };

  // ── Submission ───────────────────────────────────────────────────────────────

  const validateForm = (): string | null => {
    if (!formData.chief_complaint?.trim()) {
      return "Chief Complaint is required before submitting.";
    }
    if (formData.patient_age !== undefined && formData.patient_age !== null) {
      if (formData.patient_age < 0 || formData.patient_age > 150) {
        return "Patient age must be between 0 and 150.";
      }
    }
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const payload: EmergencyCaseCreate = {
      source: formData.source || "CALLER",
      chief_complaint: formData.chief_complaint!.trim(),
      incident_description: formData.incident_description || undefined,
      symptoms: formData.symptoms?.length ? formData.symptoms : undefined,
      reporter_name: formData.reporter_name || undefined,
      reporter_phone: formData.reporter_phone || undefined,
      reporter_relationship: formData.reporter_relationship || undefined,
      patient_name: formData.patient_name || undefined,
      patient_age: formData.patient_age ?? undefined,
      patient_gender: formData.patient_gender || undefined,
      heart_rate: formData.heart_rate ?? undefined,
      systolic_bp: formData.systolic_bp ?? undefined,
      diastolic_bp: formData.diastolic_bp ?? undefined,
      spo2: formData.spo2 ?? undefined,
      respiratory_rate: formData.respiratory_rate ?? undefined,
      temperature: formData.temperature ?? undefined,
      conscious: formData.conscious ?? undefined,
      breathing: formData.breathing ?? undefined,
      bleeding: formData.bleeding ?? undefined,
      mobility: formData.mobility ?? undefined,
      address: formData.address || undefined,
      landmark: formData.landmark || undefined,
      city: formData.city || undefined,
      state: formData.state || undefined,
      latitude: formData.latitude ?? undefined,
      longitude: formData.longitude ?? undefined,
      additional_notes: formData.additional_notes || undefined,
    };

    const result = await createEmergencyCase(payload);

    if (result.ok) {
      setErToken(result.data.case_id);
      setStage("SUCCESS");
    } else {
      setSubmitError(result.error);
    }

    setIsSubmitting(false);
  };

  // ── Rendering ─────────────────────────────────────────────────────────────

  if (stage === "SUCCESS" && erToken) {
    return (
      <main className="min-h-[calc(100vh-68px)] flex flex-col items-center justify-center p-6 bg-bg-main">
        <div className="w-full max-w-lg glass-panel p-10 text-center space-y-6">
          <div className="mx-auto w-20 h-20 bg-status-success/20 text-status-success rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h1 className="text-3xl font-bold text-text-primary">Emergency Case Registered</h1>
          <div className="bg-bg-elevated p-6 rounded-lg text-left border border-border-strong mt-6">
            <p className="text-sm text-text-muted mb-1">Assigned ER Token</p>
            <p className="text-3xl font-mono font-black text-brand-primary tracking-tight mb-5">{erToken}</p>
            <p className="text-sm text-text-muted mb-1">Status</p>
            <span className="inline-block px-3 py-1 bg-status-danger/20 text-status-danger font-bold text-xs tracking-wider rounded border border-status-danger/30">
              OPEN / AWAITING TRIAGE
            </span>
          </div>
          <p className="text-text-secondary font-medium">
            The emergency response network has been alerted and case data is secured.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row gap-4">
            <Link
              href={`/cases/${erToken}/triage`}
              className="flex-1 bg-brand-primary hover:bg-brand-accent text-white font-bold py-3 px-4 rounded-lg transition-colors flex justify-center items-center gap-2 shadow-lg"
            >
              Run Triage Assessment
            </Link>
            <Link
              href="/cases"
              className="flex-1 bg-bg-surface hover:bg-bg-elevated text-text-primary font-bold py-3 px-4 rounded-lg border border-border-strong text-center"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (stage === "REVIEW") {
    return (
      <main className="min-h-[calc(100vh-68px)] bg-bg-main p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <button
              onClick={() => setStage("RECORD")}
              className="text-text-muted hover:text-text-primary flex items-center gap-2 text-sm font-medium mb-4"
            >
              <ChevronLeft size={16} /> Back to transcript
            </button>
            <h1 className="text-3xl font-bold text-text-primary flex items-center gap-3">
              <ShieldAlert className="text-status-danger" size={28} />
              Review Extracted Information
            </h1>
            <p className="text-text-muted mt-2">
              Review and correct all extracted fields. You must confirm before the case is created.
            </p>
          </div>

          {/* AI extraction summary */}
          {extractionSummary && (
            <div className="mb-6 p-4 bg-brand-primary/5 border border-brand-primary/20 rounded-xl flex items-start gap-3">
              <Info size={18} className="mt-0.5 text-brand-primary shrink-0" />
              <div>
                <p className="text-sm font-semibold text-text-primary mb-1">AI Summary</p>
                <p className="text-sm text-text-secondary">{extractionSummary}</p>
              </div>
            </div>
          )}

          {/* Extract error (non-fatal) */}
          {extractError && (
            <div className="mb-6 p-4 bg-status-warning/10 border border-status-warning/30 rounded-xl flex items-start gap-3">
              <AlertTriangle size={18} className="mt-0.5 text-status-warning shrink-0" />
              <div>
                <p className="text-sm font-semibold text-status-warning mb-1">AI extraction issue</p>
                <p className="text-sm text-text-secondary">{extractError}</p>
                <p className="text-sm text-text-muted mt-1">The transcript has been placed in the incident description. Please fill in the form manually.</p>
              </div>
            </div>
          )}

          {/* Missing required fields */}
          {missingRequired.length > 0 && (
            <div className="mb-6 p-4 bg-status-danger/10 border border-status-danger/30 rounded-xl flex items-start gap-3">
              <AlertCircle size={18} className="mt-0.5 text-status-danger shrink-0" />
              <div>
                <p className="text-sm font-semibold text-status-danger mb-1">Required information missing</p>
                <p className="text-sm text-text-secondary">
                  The following required fields were not found in the description. Please fill them in before submitting:
                </p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {missingRequired.map((f) => (
                    <li key={f} className="text-xs font-bold px-2 py-1 bg-status-danger/20 text-status-danger rounded">
                      {FIELD_LABELS[f] ?? f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Uncertain fields */}
          {uncertainFields.length > 0 && (
            <div className="mb-6 p-4 bg-status-warning/5 border border-status-warning/20 rounded-xl flex items-start gap-3">
              <AlertTriangle size={18} className="mt-0.5 text-status-warning shrink-0" />
              <div>
                <p className="text-sm font-semibold text-text-primary mb-1">Please verify these fields</p>
                <p className="text-sm text-text-muted">
                  The AI was uncertain about:{" "}
                  {uncertainFields.map((f) => FIELD_LABELS[f] ?? f).join(", ")}
                </p>
              </div>
            </div>
          )}

          <div className="glass-panel p-6 md:p-8 space-y-8">
            {/* Section: Emergency Info */}
            <section>
              <h2 className="text-lg font-bold text-text-primary border-b border-border-subtle pb-3 mb-5">
                Emergency Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-text-secondary mb-2">
                    Emergency Source *
                  </label>
                  <select
                    value={formData.source ?? "CALLER"}
                    onChange={(e) => updateForm("source", e.target.value)}
                    className="w-full bg-bg-surface border border-border-strong text-text-primary rounded-lg px-4 py-3 focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none"
                  >
                    <option value="CALLER">Caller</option>
                    <option value="PATIENT">Patient</option>
                    <option value="ATTENDANT">Attendant</option>
                    <option value="OPERATOR">Operator</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-text-secondary mb-2">
                    Chief Complaint *{" "}
                    {uncertainFields.includes("chief_complaint") && (
                      <span className="text-status-warning text-xs">(verify)</span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={formData.chief_complaint ?? ""}
                    onChange={(e) => updateForm("chief_complaint", e.target.value)}
                    placeholder="e.g., Road accident, Chest pain"
                    className={cn(
                      "w-full bg-bg-surface border text-text-primary rounded-lg px-4 py-3 focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none",
                      !formData.chief_complaint?.trim()
                        ? "border-status-danger/60"
                        : "border-border-strong"
                    )}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-text-secondary mb-2">
                    Incident Description
                  </label>
                  <textarea
                    rows={4}
                    value={formData.incident_description ?? ""}
                    onChange={(e) => updateForm("incident_description", e.target.value)}
                    placeholder="Verbatim description of the emergency"
                    className="w-full bg-bg-surface border border-border-strong text-text-primary rounded-lg px-4 py-3 focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none resize-y"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-text-secondary mb-2">Symptoms (comma-separated)</label>
                  <input
                    type="text"
                    value={(formData.symptoms ?? []).join(", ")}
                    onChange={(e) =>
                      updateForm(
                        "symptoms",
                        e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean)
                      )
                    }
                    placeholder="e.g., headache, unconscious, bleeding"
                    className="w-full bg-bg-surface border border-border-strong text-text-primary rounded-lg px-4 py-3 focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none"
                  />
                </div>
              </div>
            </section>

            {/* Section: Reporter & Patient */}
            <section>
              <h2 className="text-lg font-bold text-text-primary border-b border-border-subtle pb-3 mb-5">
                Reporter & Patient
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {(
                  [
                    ["reporter_name", "Reporter Name"],
                    ["reporter_phone", "Reporter Phone"],
                    ["reporter_relationship", "Relationship to Patient"],
                    ["patient_name", "Patient Name"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key}>
                    <label className="block text-sm font-bold text-text-secondary mb-2">
                      {label}{" "}
                      {uncertainFields.includes(key) && (
                        <span className="text-status-warning text-xs">(verify)</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={(formData[key] as string) ?? ""}
                      onChange={(e) => updateForm(key, e.target.value)}
                      className="w-full bg-bg-surface border border-border-strong text-text-primary rounded-lg px-4 py-3 focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none"
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-bold text-text-secondary mb-2">
                    Patient Age{" "}
                    {uncertainFields.includes("patient_age") && (
                      <span className="text-status-warning text-xs">(verify)</span>
                    )}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={150}
                    value={formData.patient_age ?? ""}
                    onChange={(e) =>
                      updateForm("patient_age", e.target.value ? parseInt(e.target.value) : undefined)
                    }
                    className="w-full bg-bg-surface border border-border-strong text-text-primary rounded-lg px-4 py-3 focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-text-secondary mb-2">Patient Gender</label>
                  <select
                    value={formData.patient_gender ?? ""}
                    onChange={(e) => updateForm("patient_gender", e.target.value || undefined)}
                    className="w-full bg-bg-surface border border-border-strong text-text-primary rounded-lg px-4 py-3 focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none"
                  >
                    <option value="">— Not specified —</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Section: Clinical Observations */}
            <section>
              <h2 className="text-lg font-bold text-text-primary border-b border-border-subtle pb-3 mb-5">
                Clinical Observations (optional)
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-5 mb-5">
                {(
                  [
                    ["heart_rate", "Heart Rate (bpm)"],
                    ["systolic_bp", "Systolic BP"],
                    ["diastolic_bp", "Diastolic BP"],
                    ["spo2", "SpO₂ (%)"],
                    ["respiratory_rate", "Resp. Rate"],
                    ["temperature", "Temperature (°C)"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key}>
                    <label className="block text-sm font-bold text-text-secondary mb-2">{label}</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData[key] ?? ""}
                      onChange={(e) =>
                        updateForm(key, e.target.value ? parseFloat(e.target.value) : undefined)
                      }
                      className="w-full bg-bg-surface border border-border-strong text-text-primary rounded-lg px-4 py-3 focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none"
                    />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(
                  [
                    ["conscious", "Conscious"],
                    ["breathing", "Breathing"],
                    ["bleeding", "Bleeding"],
                    ["mobility", "Mobility OK"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="flex flex-col gap-1">
                    <label className="text-sm font-bold text-text-secondary">{label}</label>
                    <div className="flex gap-2">
                      {([true, false] as const).map((val) => (
                        <button
                          key={String(val)}
                          type="button"
                          onClick={() =>
                            updateForm(key, formData[key] === val ? undefined : val)
                          }
                          className={cn(
                            "flex-1 py-2 rounded-lg border text-xs font-bold transition-colors",
                            formData[key] === val
                              ? val
                                ? "bg-status-success/20 border-status-success/50 text-status-success"
                                : "bg-status-danger/20 border-status-danger/50 text-status-danger"
                              : "bg-bg-surface border-border-strong text-text-muted hover:bg-bg-elevated"
                          )}
                        >
                          {val ? "Yes" : "No"}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Section: Location */}
            <section>
              <h2 className="text-lg font-bold text-text-primary border-b border-border-subtle pb-3 mb-5">
                Location
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {(
                  [
                    ["address", "Address"],
                    ["landmark", "Nearby Landmark"],
                    ["city", "City"],
                    ["state", "State"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key}>
                    <label className="block text-sm font-bold text-text-secondary mb-2">{label}</label>
                    <input
                      type="text"
                      value={(formData[key] as string) ?? ""}
                      onChange={(e) => updateForm(key, e.target.value)}
                      className="w-full bg-bg-surface border border-border-strong text-text-primary rounded-lg px-4 py-3 focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none"
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* Additional notes */}
            <section>
              <label className="block text-sm font-bold text-text-secondary mb-2">Additional Notes</label>
              <textarea
                rows={3}
                value={formData.additional_notes ?? ""}
                onChange={(e) => updateForm("additional_notes", e.target.value)}
                className="w-full bg-bg-surface border border-border-strong text-text-primary rounded-lg px-4 py-3 focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none resize-y"
              />
            </section>
          </div>

          {/* Submit error */}
          {submitError && (
            <div className="mt-6 p-4 bg-status-danger/10 border border-status-danger/30 rounded-xl flex items-start gap-3">
              <AlertTriangle size={18} className="mt-0.5 text-status-danger shrink-0" />
              <p className="text-sm text-status-danger font-medium">{submitError}</p>
            </div>
          )}

          {/* Disclaimer + Submit */}
          <div className="mt-8">
            <div className="mb-4 p-4 bg-status-warning/5 border border-status-warning/20 rounded-xl flex items-start gap-3">
              <Info size={16} className="mt-0.5 text-status-warning shrink-0" />
              <p className="text-xs text-text-muted">
                <strong className="text-text-secondary">Review carefully.</strong> AI extraction may contain errors. All fields should be verified before submission. Submitting this form creates a real emergency case.
              </p>
            </div>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !formData.chief_complaint?.trim()}
              className="w-full py-4 bg-brand-primary hover:bg-brand-accent text-white rounded-xl font-bold text-lg transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {isSubmitting ? (
                <><Loader2 className="animate-spin" size={20} /> Creating Case...</>
              ) : (
                <><ShieldAlert size={20} /> Confirm & Create Emergency Case</>
              )}
            </button>
            <p className="text-xs text-text-muted text-center mt-3">
              Case creation cannot be undone. Ensure all information is accurate.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (stage === "RECORD") {
    return (
      <main className="min-h-[calc(100vh-68px)] bg-bg-main p-4 md:p-8 flex flex-col items-center">
        <div className="w-full max-w-2xl">
          <button
            onClick={() => setStage("EXPLAIN")}
            className="text-text-muted hover:text-text-primary flex items-center gap-2 text-sm font-medium mb-6"
          >
            <ChevronLeft size={16} /> Back to instructions
          </button>

          <div className="glass-panel p-8 text-center">
            <h1 className="text-2xl font-bold text-text-primary mb-2">Describe the Emergency</h1>
            <p className="text-text-secondary text-sm mb-8">
              Speak naturally. Describe what happened, where you are, and any details about the patient. You can also type below.
            </p>

            {/* Browser unsupported warning */}
            {!isSupported && (
              <div className="mb-6 p-4 bg-status-warning/10 border border-status-warning/30 rounded-xl text-left flex items-start gap-3">
                <AlertTriangle size={18} className="mt-0.5 text-status-warning shrink-0" />
                <div>
                  <p className="text-sm font-bold text-status-warning">Speech recognition not supported</p>
                  <p className="text-sm text-text-secondary mt-1">
                    Your browser does not support the Web Speech API. Please type your description in the text area below, or use Chrome / Edge.
                  </p>
                </div>
              </div>
            )}

            {/* Permission error */}
            {permissionError && (
              <div className="mb-6 p-4 bg-status-danger/10 border border-status-danger/30 rounded-xl text-left flex items-start gap-3">
                <MicOff size={18} className="mt-0.5 text-status-danger shrink-0" />
                <p className="text-sm text-status-danger font-medium">{permissionError}</p>
              </div>
            )}

            {/* Recording error */}
            {recordError && recordState === "ERROR" && (
              <div className="mb-6 p-4 bg-status-danger/10 border border-status-danger/30 rounded-xl text-left flex items-start gap-3">
                <AlertTriangle size={18} className="mt-0.5 text-status-danger shrink-0" />
                <p className="text-sm text-status-danger font-medium">{recordError}</p>
              </div>
            )}

            {/* Mic button */}
            {isSupported && (
              <div className="flex flex-col items-center gap-4 mb-8">
                {recordState === "IDLE" || recordState === "ERROR" ? (
                  <button
                    onClick={startRecording}
                    className="w-24 h-24 rounded-full bg-status-danger text-white flex items-center justify-center shadow-lg hover:bg-red-700 transition-all active:scale-95 focus:outline-none focus:ring-4 focus:ring-status-danger/40"
                    aria-label="Start recording"
                  >
                    <Mic size={40} />
                  </button>
                ) : recordState === "RECORDING" ? (
                  <button
                    onClick={stopRecording}
                    className="w-24 h-24 rounded-full bg-status-danger text-white flex items-center justify-center shadow-lg hover:bg-red-700 transition-all animate-pulse focus:outline-none focus:ring-4 focus:ring-status-danger/40"
                    aria-label="Stop recording"
                  >
                    <Square size={32} />
                  </button>
                ) : (
                  <div className="w-24 h-24 rounded-full bg-status-success/20 text-status-success border-2 border-status-success/40 flex items-center justify-center">
                    <CheckCircle2 size={40} />
                  </div>
                )}

                <div className="text-sm font-medium">
                  {recordState === "IDLE" && <span className="text-text-muted">Tap the microphone to start</span>}
                  {recordState === "RECORDING" && (
                    <span className="text-status-danger flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-status-danger animate-ping inline-block" />
                      Recording — tap square to stop
                    </span>
                  )}
                  {recordState === "DONE" && <span className="text-status-success">Recording complete</span>}
                  {recordState === "ERROR" && <span className="text-status-danger">Recording failed</span>}
                </div>

                {(recordState === "DONE" || recordState === "ERROR") && (
                  <button
                    onClick={resetRecording}
                    className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary font-medium"
                  >
                    <RotateCcw size={14} /> Record again
                  </button>
                )}
              </div>
            )}

            {/* Transcript text area */}
            <div className="text-left mb-6">
              <label className="flex items-center gap-2 text-sm font-bold text-text-secondary mb-2">
                <Edit3 size={14} /> Transcript (editable)
              </label>
              <textarea
                rows={6}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder='e.g., "My father was in an accident. His head is bleeding and he is not responding. His name is Rajesh Kumar, around 55 years old. We are near the main bus stand."'
                className="w-full bg-bg-surface border border-border-strong text-text-primary rounded-lg px-4 py-3 focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none resize-y text-sm leading-relaxed"
              />
              <p className="text-xs text-text-muted mt-2">
                {transcript.length} characters — You can edit this text before extracting.
              </p>
            </div>

            {/* Extract button */}
            <button
              onClick={extractFromTranscript}
              disabled={isExtracting || !transcript.trim()}
              className="w-full py-4 bg-brand-primary hover:bg-brand-accent text-white rounded-xl font-bold text-base transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {isExtracting ? (
                <><Loader2 className="animate-spin" size={20} /> Extracting with AI...</>
              ) : (
                <><ChevronRight size={20} /> Extract & Review Form</>
              )}
            </button>

            {isExtracting && (
              <p className="text-xs text-text-muted mt-3">
                Sending to Gemini AI for structured extraction. This may take a few seconds.
              </p>
            )}
          </div>
        </div>
      </main>
    );
  }

  // Stage: EXPLAIN
  return (
    <main className="min-h-[calc(100vh-68px)] bg-bg-main p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-status-danger/10 text-status-danger">
              <PhoneCall size={22} />
            </span>
            Voice Emergency Intake
          </h1>
          <p className="text-text-muted mt-2 font-medium">
            Describe the emergency in your own words. AI will extract the structured intake information for your review.
          </p>
        </div>

        {/* Instructions card */}
        <div className="glass-panel p-8 mb-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0 font-bold text-sm">1</div>
            <div>
              <h2 className="text-lg font-bold text-text-primary mb-2">How it works</h2>
              <p className="text-text-secondary text-sm leading-relaxed">
                Speak naturally describing the emergency. You don't need to follow any script. The AI will convert your description into a structured intake form for you to review, correct, and confirm before creating the case.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 mb-6">
            <div className="w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0 font-bold text-sm">2</div>
            <div>
              <h2 className="text-lg font-bold text-text-primary mb-2">Required information</h2>
              <p className="text-sm text-text-secondary mb-3">
                Only one field is strictly required to create a case:
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-3 bg-status-danger/5 border border-status-danger/20 rounded-lg">
                  <AlertTriangle size={14} className="text-status-danger shrink-0" />
                  <span className="text-sm font-bold text-text-primary">Chief Complaint</span>
                  <span className="text-sm text-text-muted">— What is the main emergency? e.g., "road accident", "chest pain", "head injury"</span>
                </div>
              </div>
              <p className="text-sm text-text-muted mt-3">
                The following are <span className="font-semibold text-text-primary">optional but strongly recommended</span> for better emergency response:
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {[
                  "Patient name & age", "Location / landmark", "Reporter phone",
                  "Consciousness", "Breathing", "Bleeding", "Symptoms",
                ].map((item) => (
                  <span key={item} className="text-xs px-2 py-1 bg-bg-elevated border border-border-subtle rounded-md text-text-secondary font-medium">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-4 mb-6">
            <div className="w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0 font-bold text-sm">3</div>
            <div>
              <h2 className="text-lg font-bold text-text-primary mb-2">Example description</h2>
              <div className="bg-bg-elevated border border-border-subtle rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Volume2 size={16} className="text-brand-primary mt-0.5 shrink-0" />
                  <p className="text-sm text-text-secondary italic leading-relaxed">
                    "My father met with an accident about ten minutes ago near the main bus stand. His head is bleeding and he is not responding normally. His name is Rajesh Kumar, he is around 55 years old. I am his son. Please send an ambulance urgently."
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-status-warning/10 text-status-warning flex items-center justify-center shrink-0">
              <Info size={16} />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary mb-1">Important disclaimers</h2>
              <ul className="text-sm text-text-muted space-y-1 list-disc list-inside">
                <li>AI extraction can make errors — always review every field before submitting.</li>
                <li>Missing information can be added manually in the review form.</li>
                <li>The case is not created until you confirm on the review screen.</li>
                <li>If you prefer, use the standard <Link href="/intake" className="text-brand-primary underline">Manual Emergency Intake</Link> instead.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => setStage("RECORD")}
            className="flex-1 py-4 bg-brand-primary hover:bg-brand-accent text-white rounded-xl font-bold text-lg transition-all shadow-md flex items-center justify-center gap-3"
          >
            <Mic size={22} /> Start Voice Intake
            <ArrowRight size={18} />
          </button>
          <Link
            href="/intake"
            className="flex-1 py-4 bg-bg-surface hover:bg-bg-elevated border border-border-strong text-text-primary rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2"
          >
            <Edit3 size={18} /> Use Manual Intake
          </Link>
        </div>
      </div>
    </main>
  );
}
