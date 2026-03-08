"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Bookmark, Plus, Mail, User } from "lucide-react";

const NAV_ITEMS = [
  { href: "/feed", label: "Feed", icon: Home },
  { href: "/saved", label: "Saved", icon: Bookmark },
  { href: "/posts/new", label: "Post", icon: Plus, isCreate: true },
  { href: "/messages", label: "Messages", icon: Mail },
  { href: "/profile", label: "Profile", icon: User },
];

export function BottomNav({
  unreadMessages = 0,
}: {
  unreadMessages?: number;
}) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background md:hidden">
      <div className="flex h-16 items-center justify-around">
        {NAV_ITEMS.map(({ href, label, icon: Icon, isCreate }) => {
          const isActive =
            pathname === href || pathname.startsWith(href + "/");

          if (isCreate) {
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-1 px-3 py-2 text-xs"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Icon className="h-5 w-5" />
                </div>
              </Link>
            );
          }

          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-col items-center gap-1 px-3 py-2 text-xs transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
              {label === "Messages" && unreadMessages > 0 && (
                <span className="absolute right-1.5 top-1 h-2 w-2 rounded-full bg-destructive" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
