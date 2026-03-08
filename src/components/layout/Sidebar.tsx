"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Search,
  Users,
  MessageSquare,
  Wallet,
  User,
  Map,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/feed", label: "Feed", icon: Home },
  { href: "/map", label: "Map", icon: Map },
  { href: "/explore", label: "Explore", icon: Search },
  { href: "/groups", label: "Groups", icon: Users },
  { href: "/discuss", label: "Discuss", icon: MessageSquare },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/profile", label: "Profile", icon: User },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 md:block">
      <nav className="sticky top-20 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href || pathname.startsWith(href + "/");

          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
