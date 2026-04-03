"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileSignature, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getUser, logout } from "@/lib/auth";

const NAV_LINKS = [
  { href: "/",          label: "Dashboard"  },
  { href: "/documents", label: "Documents"  },
  { href: "/contacts",  label: "Contacts"   },
  { href: "/templates", label: "Templates"  },
];

export default function NavBar() {
  const user     = getUser();
  const pathname = usePathname();

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-6">
      <Link href="/" className="flex items-center gap-2 flex-shrink-0">
        <FileSignature className="h-6 w-6 text-indigo-600" />
        <span className="font-bold text-lg text-gray-900">Signo</span>
      </Link>

      {/* Nav links */}
      <div className="flex items-center gap-1 flex-1">
        {NAV_LINKS.map(({ href, label }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                active
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {/* User + logout */}
      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <User className="h-4 w-4" />
          <span>{user?.name}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={logout}>
          <LogOut className="h-4 w-4 mr-1" />
          Sign out
        </Button>
      </div>
    </nav>
  );
}
