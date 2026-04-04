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
  Menu,
  X,
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setUser(getUser());
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const initials =
    (user?.name ?? "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w: string) => w[0].toUpperCase())
      .join("") || "U";

  return (
    <nav
      className="sticky top-0 z-30 border-b border-[var(--border)]"
      style={{ background: "var(--secondary)" }}
    >
      <div className="px-4 md:px-6 h-[62px] flex items-center gap-3 md:gap-5">

        {/* Logo */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2 flex-shrink-0 group cursor-pointer"
        >
          <div className="w-[34px] h-[34px] rounded-xl bg-[var(--primary)] flex items-center justify-center shadow-sm transition-all group-hover:opacity-90">
            <FileSignature className="h-[17px] w-[17px] text-white" />
          </div>
          <span className="font-extrabold text-[16px] tracking-tight hidden sm:block" style={{ color: "var(--foreground)" }}>
            Signo
          </span>
        </Link>

        {/* Divider - hidden on mobile */}
        <div className="w-px h-5 bg-[var(--border)] flex-shrink-0 hidden md:block" />

        {/* Nav links - desktop only */}
        <div className="hidden md:flex items-center gap-1 flex-1">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-3.5 py-[7px] rounded-lg text-[13px] font-semibold tracking-wide transition-all duration-150 cursor-pointer ${
                  active
                    ? "bg-[var(--card)] text-[var(--primary)] shadow-sm border border-[var(--border)]"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]"
                }`}
              >
                <Icon
                  className={`h-[14px] w-[14px] flex-shrink-0 ${
                    active ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]"
                  }`}
                />
                {label}
              </Link>
            );
          })}
        </div>

        {/* Spacer for mobile menu toggle */}
        <div className="flex-1 md:hidden" />

        {/* User section - desktop */}
        <div className="hidden md:flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-[32px] h-[32px] rounded-full bg-[var(--primary)] flex items-center justify-center text-[11px] font-bold text-white shadow-sm select-none flex-shrink-0">
              {initials}
            </div>
            <span className="text-[13px] font-semibold max-w-[140px] truncate" style={{ color: "var(--foreground)" }}>
              {user?.name}
            </span>
          </div>

          <div className="w-px h-5 bg-[var(--border)]" />

          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-[13px] cursor-pointer transition-colors duration-150 hover:text-[var(--foreground)]"
            style={{ color: "var(--muted-foreground)" }}
            title="Sign out"
          >
            <LogOut className="h-[15px] w-[15px]" />
            <span className="hidden md:block">Sign out</span>
          </button>
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden p-2 cursor-pointer rounded-lg hover:bg-[var(--muted)]"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          title={mobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {mobileMenuOpen ? (
            <X className="h-6 w-6" style={{ color: "var(--foreground)" }} />
          ) : (
            <Menu className="h-6 w-6" style={{ color: "var(--foreground)" }} />
          )}
        </button>

      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[var(--border)] bg-[var(--secondary)]">
          <div className="p-4 space-y-2">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => {
              const active =
                href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-[14px] font-semibold transition-colors cursor-pointer ${
                    active
                      ? "bg-[var(--primary)] text-white"
                      : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </Link>
              );
            })}

            <div className="border-t border-[var(--border)] pt-4 mt-4">
              <div className="flex items-center gap-3 px-4 py-2">
                <div className="w-10 h-10 rounded-full bg-[var(--primary)] flex items-center justify-center text-sm font-bold text-white">
                  {initials}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate" style={{ color: "var(--foreground)" }}>
                    {user?.name}
                  </div>
                  <div className="text-xs truncate" style={{ color: "var(--muted-foreground)" }}>
                    {user?.email}
                  </div>
                </div>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-3 w-full px-4 py-3 text-left text-[14px] font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="h-5 w-5" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
