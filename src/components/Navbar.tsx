"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { BarChart3, Globe, Bookmark, Users, FileText, Trash2, LogOut, Settings, Wand2, ChevronDown, UserRound, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";
import { InviteFriendDialog } from "@/components/InviteFriendDialog";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: BarChart3 },
  { href: "/board", label: "Board", icon: Globe },
  { href: "/applications", label: "My Tracker", icon: Bookmark },
  { href: "/resumes", label: "Resumes", icon: FileText },
  { href: "/resume-review", label: "Resume Review", icon: Wand2 },
  { href: "/gc", label: "GC", icon: Users },
];

const MENU_ITEMS = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/trash", label: "Trash", icon: Trash2 },
];

export function Navbar({ userName, userId }: { userName: string; userId: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const initial = userName.trim()[0]?.toUpperCase() ?? "?";

  return (
    <nav className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <Logo size="md" />
            </Link>
            <div className="flex items-center gap-1">
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  prefetch
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    pathname === href
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Profile dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className={cn(
                "flex items-center gap-2 rounded-full py-1 pl-1 pr-2 text-sm font-medium transition-colors",
                open ? "bg-gray-100" : "hover:bg-gray-100"
              )}
              aria-haspopup="menu"
              aria-expanded={open}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                {initial}
              </span>
              <ChevronDown
                className={cn("h-4 w-4 text-gray-400 transition-transform", open && "rotate-180")}
              />
            </button>

            {open && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-1.5 z-50 w-56 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl"
              >
                <div className="border-b border-gray-100 px-4 py-3">
                  <p className="text-xs text-gray-400">Signed in as</p>
                  <p className="truncate text-sm font-semibold text-gray-900">{userName}</p>
                </div>

                <div className="p-1.5">
                  <Link
                    href={`/profile/${userId}`}
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <UserRound className="h-4 w-4 text-gray-400" />
                    My profile
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setOpen(false);
                      setInviteOpen(true);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <UserPlus className="h-4 w-4 text-gray-400" />
                    Invite a friend
                  </button>
                  {MENU_ITEMS.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      role="menuitem"
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                        pathname === href
                          ? "bg-indigo-50 text-indigo-700"
                          : "text-gray-700 hover:bg-gray-50"
                      )}
                    >
                      <Icon className="h-4 w-4 text-gray-400" />
                      {label}
                    </Link>
                  ))}
                </div>

                <div className="border-t border-gray-100 p-1.5">
                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-rose-600 transition-colors hover:bg-rose-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <InviteFriendDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </nav>
  );
}
