"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { 
  Activity, 
  Map as MapIcon, 
  FileText, 
  LayoutDashboard, 
  Stethoscope,
  Moon,
  Sun,
  Menu,
  X,
  Ambulance,
  Shield
} from "lucide-react";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hasAmbulanceSession, setHasAmbulanceSession] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem("ambulance_token");
    setHasAmbulanceSession(!!token);
  }, [pathname]);

  const navLinks = [
    { name: "Overview", href: "/", icon: LayoutDashboard },
    { name: "Intake", href: "/intake", icon: FileText },
    { name: "Resource Registry", href: "/resources", icon: Stethoscope },
  ];

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b border-border-subtle bg-bg-surface/80 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-white shadow-lg">
                <Activity size={18} strokeWidth={2.5} />
              </div>
              <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-text-primary to-text-secondary">
                E-Rakshak AI
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive 
                        ? "bg-brand-primary/10 text-brand-primary" 
                        : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated"
                    )}
                  >
                    <Icon size={16} />
                    {link.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {mounted && (
              <>
                <Link
                  href={hasAmbulanceSession ? "/ambulance/dashboard" : "/ambulance/login"}
                  className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md bg-status-info/10 text-status-info hover:bg-status-info/20 text-sm font-semibold transition-colors"
                >
                  <Ambulance size={16} />
                  Ambulance Portal
                </Link>
                <Link
                  href="/admin"
                  className="hidden md:flex items-center gap-2 px-3 py-1.5 mr-2 rounded-md bg-brand-secondary/10 text-brand-secondary hover:bg-brand-secondary/20 text-sm font-semibold transition-colors"
                >
                  <Shield size={16} />
                  Admin Portal
                </Link>
              </>
            )}
            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 rounded-md text-text-secondary hover:bg-bg-elevated hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                aria-label="Toggle theme"
                title="Toggle theme"
              >
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            )}
            
            <button
              className="md:hidden p-2 text-text-secondary hover:text-text-primary"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-border-subtle bg-bg-surface px-4 py-4 space-y-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={closeMobileMenu}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-md text-base font-medium transition-colors",
                    isActive 
                      ? "bg-brand-primary/10 text-brand-primary" 
                      : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated"
                  )}
                >
                  <Icon size={18} />
                  {link.name}
                </Link>
              );
            })}
            
            {/* Mobile Ambulance Portal Link */}
            {mounted && (
              <>
                <Link
                  href={hasAmbulanceSession ? "/ambulance/dashboard" : "/ambulance/login"}
                  onClick={closeMobileMenu}
                  className="flex items-center gap-3 px-3 py-3 rounded-md text-base font-medium transition-colors text-status-info hover:bg-status-info/10"
                >
                  <Ambulance size={18} />
                  Ambulance Portal
                </Link>
                <Link
                  href="/admin"
                  onClick={closeMobileMenu}
                  className="flex items-center gap-3 px-3 py-3 rounded-md text-base font-medium transition-colors text-brand-secondary hover:bg-brand-secondary/10"
                >
                  <Shield size={18} />
                  Admin Portal
                </Link>
              </>
            )}
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col w-full">
        {children}
      </main>
    </div>
  );
}
