"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, ArrowRight, Loader2, KeyRound } from "lucide-react";
import { loginAmbulance } from "@/lib/ambulanceApi";
import { cn } from "@/lib/utils";

export default function AmbulanceLogin() {
  const router = useRouter();
  const [ambulanceId, setAmbulanceId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ambulanceId || !password) return;
    
    setLoading(true);
    setError("");
    
    const res = await loginAmbulance(ambulanceId, password);
    if (res.ok) {
      router.push("/ambulance/dashboard");
    } else {
      setError(res.error || "Invalid credentials");
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-bg-main flex items-center justify-center min-h-[calc(100vh-68px)] p-4 relative overflow-hidden">
      

      <div className="w-full max-w-md relative z-10">
        <div className="glass-panel p-6 sm:p-8 rounded-xl relative overflow-hidden">
          
          
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-brand-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4 border border-brand-primary/20">
              <ShieldAlert className="w-8 h-8 text-brand-primary" />
            </div>
            <h1 className="text-2xl font-bold text-text-primary mb-2">Ambulance Portal</h1>
            <p className="text-text-secondary text-sm">Secure access for operators</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="p-3 bg-status-danger/10 border border-status-danger/30 rounded-lg text-sm text-status-danger text-center font-medium">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-text-secondary uppercase tracking-wider text-[11px]">
                Ambulance ID
              </label>
              <input
                type="text"
                placeholder="e.g. AMB-001"
                value={ambulanceId}
                onChange={(e) => setAmbulanceId(e.target.value)}
                className="w-full bg-bg-surface border border-border-strong rounded-lg px-4 py-3 text-text-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors font-mono placeholder:font-sans"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-text-secondary uppercase tracking-wider text-[11px]">
                Operator Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="Enter secure password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-bg-surface border border-border-strong rounded-lg pl-10 pr-4 py-3 text-text-primary focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors"
                  required
                />
                <KeyRound size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !ambulanceId || !password}
              className="w-full mt-4 py-3.5 bg-brand-primary hover:bg-brand-accent text-white rounded-lg font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Authenticating...
                </>
              ) : (
                <>
                  Access Portal <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
          
          <p className="mt-8 text-center text-xs text-text-muted">
            By logging in, you agree to E-Rakshak AI's operational terms and emergency response protocols.
          </p>
        </div>
      </div>
    </div>
  );
}
