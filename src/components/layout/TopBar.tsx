"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Mail, Plus, UserPlus, LogOut, Sparkles } from "lucide-react";
import { InviteDialog } from "@/components/invites/InviteDialog";
import { useAskKula } from "@/lib/contexts/AskKulaContext";
import { NotificationBell } from "./NotificationBell";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Profile } from "@/types/database";

export function TopBar({ profile, unreadNotifications = 0 }: { profile: Profile | null; unreadNotifications?: number }) {
  const router = useRouter();
  const supabase = createClient();
  const { setIsOpen: openAskKula } = useAskKula();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = profile?.display_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link
          href="/feed"
          className="flex items-center gap-2 text-xl font-bold tracking-tight text-primary"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" className="h-7 w-7" />
          Kula
        </Link>

        <div className="flex items-center gap-1">
          <Link href="/posts/new">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-5 w-5" />
              <span className="sr-only">Create post</span>
            </Button>
          </Link>

          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-primary"
            onClick={() => openAskKula(true)}
          >
            <Sparkles className="h-5 w-5" />
            <span className="sr-only">Ask Kula AI</span>
          </Button>

          {profile && (
            <InviteDialog
              userId={profile.id}
              trigger={
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <UserPlus className="h-5 w-5" />
                  <span className="sr-only">Invite neighbor</span>
                </Button>
              }
            />
          )}

          <Link href="/messages">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
            >
              <Mail className="h-5 w-5" />
              <span className="sr-only">Messages</span>
            </Button>
          </Link>

          {profile && (
            <NotificationBell
              userId={profile.id}
              initialCount={unreadNotifications}
            />
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="ml-1">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={profile?.avatar_url || undefined}
                    alt={profile?.display_name || "User"}
                  />
                  <AvatarFallback className="bg-primary/10 text-xs text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link href="/profile">My Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/exchanges">My Exchanges</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/wallet">My Wallet</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
