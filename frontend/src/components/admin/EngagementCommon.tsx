"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, ShieldCheck } from "lucide-react";
import Logo from "@/components/Logo";
import { ApiError } from "@/lib/api";
import { assertAdminAccess } from "@/lib/adminDashboard";

export const panel = "rounded-[1.7rem] border border-[#EADFD8] bg-white p-5 shadow-[0_6px_24px_rgba(74,59,50,.035)] sm:p-7";
export const field = "mt-2 min-h-11 w-full rounded-xl border border-[#D9CAC0] bg-[#FCF9F5] px-4 py-2 text-sm text-[#4A3B32] focus:border-[#4A3B32] focus:outline-none";
export const btn = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#D9CAC0] bg-white px-5 text-sm font-medium text-[#4A3B32] hover:bg-[#F7EBE8] disabled:cursor-not-allowed disabled:opacity-50";
export const mainBtn = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#4A3B32] px-5 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";
export type Gate = "checking" | "ready" | "sign-in" | "forbidden" | "error";

export function useEngagementAdmin() {
  const [gate, setGate] = useState<Gate>("checking");
  const [gateError, setGateError] = useState("");
  const [adminId, setAdminId] = useState("");
  const [role, setRole] = useState("");
  useEffect(() => {
    let active = true;
    void assertAdminAccess().then(response => {
      if (!active) return;
      setAdminId(response.user.id); setRole(response.user.role); setGate("ready");
    }).catch(error => {
      if (!active) return;
      setGateError(error instanceof Error ? error.message : "Unable to verify access.");
      setGate(error instanceof ApiError && error.status === 401 ? "sign-in" :
        error instanceof ApiError && error.status === 403 ? "forbidden" : "error");
    });
    return () => { active = false; };
  }, []);
  function guard(error: unknown) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      setGate(error.status === 401 ? "sign-in" : "forbidden");
      return true;
    }
    return false;
  }
  return { gate, gateError, role, adminId, guard };
}

export function GateScreen({ gate, error }: { gate: Gate; error: string }) {
  const title = gate === "checking" ? "Verifying administrator access" : gate === "sign-in" ? "Administrator sign-in" : gate === "forbidden" ? "Access restricted" : "Admin service unavailable";
  return <main className="flex min-h-screen items-center justify-center bg-[#FCF9F5] p-6">
    <div className={`${panel} w-full max-w-lg text-center`}><ShieldCheck size={37} className="mx-auto text-[#80695D]" />
      <h1 className="mt-5 font-serif text-3xl">{title}</h1>
      <p role="status" className="mt-5 text-sm leading-7 text-[#6B5A50]">{gate === "checking" ? "Checking your secure session…" : gate === "sign-in" ? "Sign in as an authorized administrator." : gate === "forbidden" ? "You do not have permission to view this workspace." : error}</p>
      <div className="mt-7 flex justify-center gap-3"><Link href="/admin" className={btn}>Dashboard</Link>{gate === "sign-in" && <Link href="/login" className={mainBtn}>Sign in</Link>}</div>
    </div>
  </main>;
}
export function WorkArea({ title, eyebrow, detail, children }: { title: string; eyebrow: string; detail: string; children: ReactNode }) {
  return <div className="min-h-screen bg-[#FCF9F5] text-[#4A3B32]">
    <header className="border-b border-[#EADFD8] bg-white"><div className="mx-auto flex max-w-[1450px] flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
      <div className="flex items-center gap-3"><Logo size={55} /><div><p className="text-[10px] font-semibold uppercase tracking-[.19em] text-[#947E71]">LOOP_N_LOOOM · Private studio</p><p className="font-serif text-xl sm:text-2xl">Customer engagement</p></div></div>
      <div className="flex flex-wrap gap-2"><Link className={btn} href="/admin"><ArrowLeft size={15} /> Dashboard</Link><Link className={btn} href="/admin/customers">Customers</Link><Link className={btn} href="/admin/support">Support</Link><Link className={btn} href="/admin/reviews">Reviews</Link></div>
    </div></header>
    <main className="mx-auto max-w-[1450px] space-y-6 px-5 pb-20 pt-8 sm:px-8">
      <div className="rounded-[1.7rem] border border-[#EADFD8] bg-[#F7EBE8] p-6 sm:p-9"><p className="text-[11px] font-semibold uppercase tracking-[.2em] text-[#92796D]">{eyebrow}</p><h1 className="mt-2 font-serif text-3xl sm:text-4xl">{title}</h1><p className="mt-3 max-w-3xl text-sm leading-7 text-[#6B5A50]">{detail}</p></div>
      {children}
    </main>
  </div>;
}
export function Issue({ value }: { value: string }) { return value ? <p role="alert" className="flex items-start gap-2 rounded-xl border border-[#ECCAC3] bg-[#FFF5F2] px-5 py-4 text-sm text-[#985246]"><AlertTriangle size={17} className="mt-0.5 shrink-0" />{value}</p> : null; }
export function Note({ children }: { children: ReactNode }) { return <p className="rounded-xl bg-[#F7EBE8] px-5 py-4 text-sm leading-7 text-[#6B5A50]">{children}</p>; }
export function Pages({ page, totalPages, total, onChange, disabled }: { page: number; totalPages: number; total: number; onChange: (page: number) => void; disabled?: boolean }) {
  return <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#EADFD8] pt-5 text-sm text-[#806E62]"><p>{total} record(s) · Page {page} of {Math.max(1, totalPages)}</p><div className="flex gap-2"><button className={btn} type="button" disabled={disabled || page <= 1} onClick={() => onChange(page - 1)}>Previous</button><button className={btn} type="button" disabled={disabled || page >= totalPages} onClick={() => onChange(page + 1)}>Next</button></div></div>;
}
