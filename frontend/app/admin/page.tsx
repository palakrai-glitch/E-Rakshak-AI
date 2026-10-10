"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, MapIcon, Stethoscope, ArrowRight, Shield, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminDashboard() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem("admin_token");
    if (!token) {
      router.push("/admin/login");
    }
  }, [router]);

  if (!mounted) return null;

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    router.push("/admin/login");
  };

  const dashboardCards = [
    {
      title: "GIS Resource Coordination",
      description: "Manage active incidents, view location-aware discovery of hospitals and deployed ambulances, and track real-time missions.",
      icon: MapIcon,
      href: "/cases",
      linkText: "Open GIS Dashboard",
      color: "text-blue-accent",
      bg: "bg-blue-accent/10"
    },
    {
      title: "Resource Registry",
      description: "Manage hospital capacity, track online specialists, and monitor ambulance fleets across the network.",
      icon: Stethoscope,
      href: "/resources",
      linkText: "Open Registry",
      color: "text-brand-primary",
      bg: "bg-brand-primary/10"
    }
  ];

  return (
    <div className="min-h-[calc(100vh-68px)] bg-bg-main flex flex-col items-center py-8 sm:py-10 px-4">
      <div className="max-w-5xl w-full">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-brand-secondary/10 flex items-center justify-center text-brand-secondary">
              <ShieldCheck size={28} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">Admin Portal</h1>
              <p className="text-text-secondary">System operations & resource orchestration</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-status-danger/10 text-status-danger rounded-lg font-semibold hover:bg-status-danger/20 transition-colors"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {dashboardCards.map((card, i) => (
            <div key={i} className="glass-panel p-6 sm:p-7 flex flex-col h-full transition-colors hover:border-border-strong group">
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-5", card.bg, card.color)}>
                <card.icon size={26} strokeWidth={2.5} />
              </div>
              <h3 className="text-lg font-bold text-text-primary mb-2">{card.title}</h3>
              <p className="text-text-secondary leading-relaxed mb-8 flex-1 text-sm font-medium">
                {card.description}
              </p>
              <Link 
                href={card.href}
                className={cn("inline-flex items-center gap-2 text-sm font-bold hover:opacity-80 transition-opacity mt-auto", card.color)}
              >
                {card.linkText}
                <ArrowRight size={16} className="transform group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
