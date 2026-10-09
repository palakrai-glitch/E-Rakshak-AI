"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Key, AlertCircle } from "lucide-react";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      console.log(`Attempting login at: ${apiUrl}/api/admin/login`);
      
      const response = await fetch(`${apiUrl}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Invalid username or password");
        } else if (response.status === 404) {
          throw new Error("Login endpoint not found on the server. Backend might be misconfigured.");
        } else {
          throw new Error(`Server returned error ${response.status}: ${response.statusText}`);
        }
      }

      const data = await response.json();
      if (!data.access_token) {
        throw new Error("Malformed response from server: Missing access token");
      }
      
      localStorage.setItem("admin_token", data.access_token);
      router.push("/admin");
    } catch (err: any) {
      console.error("Login failed:", err);
      if (err.name === "TypeError" && err.message.includes("Failed to fetch")) {
        setError("Unable to connect to the backend server. Please ensure the backend is running and reachable.");
      } else {
        setError(err.message || "An unexpected error occurred during login.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg-base relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-brand-secondary/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-status-info/5 rounded-full blur-3xl"></div>

      <div className="glass-panel p-8 md:p-12 max-w-md w-full relative z-10 border-brand-secondary/20 shadow-2xl animate-in fade-in zoom-in-95 duration-500">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-brand-secondary/10 flex items-center justify-center text-brand-secondary shadow-inner border border-white/5">
            <Shield size={32} strokeWidth={2.5} />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center text-text-primary mb-2">Admin Portal</h1>
        <p className="text-center text-text-secondary mb-8 text-sm">Sign in to manage system operations</p>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-status-danger/10 border border-status-danger/20 flex gap-3 text-status-danger animate-in slide-in-from-top-2">
            <AlertCircle size={20} className="shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-text-primary">Username</label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-bg-surface border border-border-strong rounded-lg pl-4 pr-4 py-3 text-text-primary focus:outline-none focus:border-brand-secondary focus:ring-1 focus:ring-brand-secondary transition-all shadow-sm"
                placeholder="Enter admin username"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-text-primary">Password</label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-bg-surface border border-border-strong rounded-lg pl-4 pr-10 py-3 text-text-primary focus:outline-none focus:border-brand-secondary focus:ring-1 focus:ring-brand-secondary transition-all shadow-sm"
                placeholder="••••••••"
                required
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
                <Key size={18} />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-secondary hover:bg-brand-secondary/90 text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "Sign In"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
