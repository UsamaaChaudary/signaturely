"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  FileSignature,
  LogOut,
  LayoutDashboard,
  FileText,
  Users,
  LayoutTemplate,
} from "lucide-react";
import { getUser, logout } from "@/lib/auth";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/documents",  label: "Documents", icon: FileText        },
  { href: "/contacts",  label: "Contacts",  icon: Users           },
  { href: "/templates", label: "Templates", icon: LayoutTemplate  },
];

export default function NavBar() {
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);
  const pathname = usePathname();

  useEffect(() => {
    setUser(getUser());
  }, []);

  const initials =
    (user?.name ?? "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w: string) => w[0].toUpperCase())
      .join("") || "U";

  return (
    <nav
      className="sticky top-0 z-30 border-b border-slate-200"
      style={{ background: "#f1f5f9", boxShadow: "0 1px 4px 0 rgba(0,0,0,0.07)" }}
    >
      <div className="px-6 h-[62px] flex items-center gap-5">

        {/* ── Logo ─────────────────────────────────────────────── */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 flex-shrink-0 group cursor-pointer"
        >
          <div className="w-[34px] h-[34px] rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm transition-all group-hover:bg-indigo-700">
            <FileSignature className="h-[17px] w-[17px] text-white" />
          </div>
          <span className="font-extrabold text-[16px] tracking-tight text-slate-900">
            Signo
          </span>
        </Link>

        {/* ── Divider ───────────────────────────────────────────── */}
        <div className="w-px h-5 bg-slate-300 flex-shrink-0" />

        {/* ── Nav links ─────────────────────────────────────────── */}
        <div className="flex items-center gap-1 flex-1">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-3.5 py-[7px] rounded-lg text-[13px] font-semibold tracking-wide transition-all duration-150 cursor-pointer ${
                  active
                    ? "bg-white text-indigo-600 shadow-sm border border-slate-200"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/60"
                }`}
              >
                <Icon
                  className={`h-[14px] w-[14px] flex-shrink-0 ${
                    active ? "text-indigo-600" : "text-slate-400"
                  }`}
                />
                {label}
              </Link>
            );
          })}
        </div>

        {/* ── User section ─────────────────────────────────────── */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-[32px] h-[32px] rounded-full bg-indigo-600 flex items-center justify-center text-[11px] font-bold text-white shadow-sm select-none flex-shrink-0">
              {initials}
            </div>
            <span className="text-[13px] font-semibold text-slate-700 hidden md:block max-w-[140px] truncate">
              {user?.name}
            </span>
          </div>

          <div className="w-px h-5 bg-slate-300" />

          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-[13px] text-slate-400 hover:text-slate-800 cursor-pointer transition-colors duration-150"
            title="Sign out"
          >
            <LogOut className="h-[15px] w-[15px]" />
            <span className="hidden md:block">Sign out</span>
          </button>
        </div>

      </div>
    </nav>
  );
}
