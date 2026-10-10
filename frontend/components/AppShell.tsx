"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Activity, Truck, FileText, LayoutDashboard, Menu, Moon, ShieldCheck,
  Stethoscope, Sun, X, ClipboardList,
} from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hasAmbulanceSession, setHasAmbulanceSession] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      setHasAmbulanceSession(Boolean(localStorage.getItem("ambulance_token")));
    } catch (error) {
      console.warn("localStorage not available:", error);
    }
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  const navLinks = [
    { name: "Overview", href: "/", icon: LayoutDashboard },
    { name: "Emergency intake", href: "/intake", icon: FileText },
    { name: "Incidents", href: "/cases", icon: ClipboardList },
    { name: "Resources", href: "/resources", icon: Stethoscope },
  ];

  const renderLink = (link: { name: string, href: string, icon: React.ElementType }, isMobile: boolean = false) => {
    const Icon = link.icon;
    const active = isActive(link.href);
    
    if (isMobile) {
      return (
        <Link key={link.name} href={link.href} aria-current={active ? "page" : undefined}
          onClick={() => setIsMobileMenuOpen(false)}
          className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold ${
            active ? "bg-brand-primary/10 text-brand-primary" : "text-text-secondary hover:bg-bg-elevated"
          }`}>
          <Icon size={18} aria-hidden="true" />{link.name}
        </Link>
      );
    }
    
    return (
      <Link key={link.name} href={link.href} aria-current={active ? "page" : undefined}
        className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors ${
          active ? "bg-brand-primary/10 text-brand-primary" : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
        }`}>
        <Icon size={16} aria-hidden="true" />{link.name}
      </Link>
    );
  };

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <div className="min-h-screen flex flex-col bg-bg-main text-text-primary">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-bg-surface focus:px-4 focus:py-2 focus:shadow-lg">
        Skip to content
      </a>
      <header className="sticky top-0 z-50 w-full border-b border-border-subtle bg-bg-surface">
        <div className="mx-auto flex h-[68px] max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-7">
            <Link href="/" aria-label="E-Rakshak AI home" className="flex shrink-0 items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-primary text-white">
                <Activity size={19} strokeWidth={2.4} aria-hidden="true" />
              </span>
              <span className="leading-tight">
                <span className="block text-[15px] font-bold tracking-tight text-text-primary">E-Rakshak AI</span>
                <span className="hidden text-[10px] font-medium tracking-wide text-text-muted sm:block">EMERGENCY CARE COORDINATION</span>
              </span>
            </Link>
            <nav aria-label="Main navigation" className="hidden items-center gap-1 lg:flex">
              {navLinks.map(link => renderLink(link))}
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link href="/intake" className="hidden items-center gap-2 rounded-lg bg-status-danger px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 sm:inline-flex mr-2">
              <Activity size={16} aria-hidden="true" />Report emergency
            </Link>
            
            <Link
              href={hasAmbulanceSession ? "/ambulance/dashboard" : "/ambulance/login"}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md bg-status-info/10 text-status-info hover:bg-status-info/20 text-sm font-semibold transition-colors"
            >
              <Truck size={16} aria-hidden="true" />
              Ambulance
            </Link>
            <Link
              href="/admin"
              className="hidden md:flex items-center gap-2 px-3 py-1.5 mr-2 rounded-md bg-brand-secondary/10 text-brand-secondary hover:bg-brand-secondary/20 text-sm font-semibold transition-colors"
            >
              <ShieldCheck size={16} aria-hidden="true" />
              Admin
            </Link>
            
            {mounted && (
              <button type="button" onClick={() => setTheme(isDark ? "light" : "dark")}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border-subtle text-text-secondary transition-colors hover:bg-brand-primary/10 hover:text-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
                title={isDark ? "Switch to light theme" : "Switch to dark theme"}>
                {isDark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
              </button>
            )}
            <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border-subtle text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary lg:hidden"
              onClick={() => setIsMobileMenuOpen((open) => !open)}
              aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={isMobileMenuOpen} aria-controls="mobile-navigation">
              {isMobileMenuOpen ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </div>
        {isMobileMenuOpen && <div id="mobile-navigation" className="border-t border-border-subtle bg-bg-surface px-4 py-3 shadow-sm lg:hidden">
          <nav aria-label="Mobile navigation" className="mx-auto flex max-w-[1440px] flex-col gap-1">
            {navLinks.map(link => renderLink(link, true))}
            {mounted && (
              <>
                <Link
                  href={hasAmbulanceSession ? "/ambulance/dashboard" : "/ambulance/login"}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-status-info hover:bg-bg-elevated"
                >
                  <Truck size={18} aria-hidden="true" />Ambulance
                </Link>
                <Link
                  href="/admin"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-brand-secondary hover:bg-bg-elevated"
                >
                  <ShieldCheck size={18} aria-hidden="true" />Admin
                </Link>
              </>
            )}
            <Link href="/intake" onClick={() => setIsMobileMenuOpen(false)}
              className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-status-danger px-4 py-3 text-sm font-semibold text-white">
              <Activity size={17} aria-hidden="true" />Report emergency
            </Link>
          </nav>
        </div>}
      </header>
      <main id="main-content" className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
