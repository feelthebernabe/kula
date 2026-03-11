"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { getNotificationHref, getNotificationIcon } from "@/lib/notifications";
import type { Database } from "@/types/database";

interface NotificationBellProps {
  userId: string;
  initialCount: number;
}

interface NotificationItem {
  id: string;
  type: Database["public"]["Enums"]["notification_type"];
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
  data: Record<string, unknown>;
}

export function NotificationBell({ userId, initialCount }: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(initialCount);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  // Subscribe to new notifications in realtime
  useEffect(() => {
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new as NotificationItem;
          setUnreadCount((prev) => prev + 1);
          setNotifications((prev) => [newNotif, ...prev].slice(0, 10));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  async function loadNotifications() {
    if (loaded) return;
    const [{ data }, { count }] = await Promise.all([
      supabase
        .from("notifications")
        .select("id, type, title, body, read, created_at, data")
        .eq("recipient_id", userId)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", userId)
        .eq("read", false),
    ]);

    if (data) {
      setNotifications(data as NotificationItem[]);
      setLoaded(true);
    }
    if (count !== null) setUnreadCount(count);
  }

  async function markAllRead() {
    if (unreadCount === 0) return;
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("recipient_id", userId)
      .eq("read", false);

    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return (
    <DropdownMenu onOpenChange={async (open) => {
      if (open) {
        await loadNotifications();
        markAllRead();
      }
    }}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-foreground"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
          <span className="sr-only">
            Notifications{unreadCount > 0 ? ` (${unreadCount} unread)` : ""}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(20rem,calc(100vw-2rem))]">
        {notifications.length > 0 ? (
          notifications.map((notif) => {
            const Icon = getNotificationIcon(notif.type);
            const href = getNotificationHref(notif.type, notif.data);
            return (
              <DropdownMenuItem
                key={notif.id}
                className="flex items-start gap-2 py-3"
                onClick={() => router.push(href)}
              >
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${notif.read ? "text-muted-foreground" : "font-medium text-foreground"}`}>
                    {notif.title}
                  </p>
                  {notif.body && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {notif.body}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(notif.created_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </DropdownMenuItem>
            );
          })
        ) : (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            No notifications yet
          </div>
        )}
        {notifications.length > 0 && (
          <DropdownMenuItem
            className="justify-center text-xs text-primary"
            onClick={() => router.push("/notifications")}
          >
            View all notifications
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
