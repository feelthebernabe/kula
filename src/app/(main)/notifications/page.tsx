import { createClient } from "@/lib/supabase/server";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Bell } from "lucide-react";
import Link from "next/link";
import { getNotificationHref, getNotificationIcon } from "@/lib/notifications";
import type { Database } from "@/types/database";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("recipient_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  // Mark all unread notifications as read
  const unreadIds = notifications
    ?.filter((n) => !n.read)
    .map((n) => n.id);

  if (unreadIds && unreadIds.length > 0) {
    await supabase
      .from("notifications")
      .update({ read: true })
      .in("id", unreadIds);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
        <p className="text-sm text-muted-foreground">
          Stay updated on your exchanges and community
        </p>
      </div>

      {notifications && notifications.length > 0 ? (
        <div className="space-y-2">
          {notifications.map((notification) => {
            const wasUnread = unreadIds?.includes(notification.id);
            const Icon = getNotificationIcon(notification.type);
            const href = getNotificationHref(
              notification.type,
              notification.data as Record<string, unknown>
            );
            return (
              <Link key={notification.id} href={href}>
                <Card
                  className={`transition-colors hover:bg-accent/50 ${
                    !wasUnread && notification.read ? "opacity-60" : "border-primary/20"
                  }`}
                >
                  <CardContent className="flex items-start gap-3 py-4">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {notification.title}
                      </p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {notification.body}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.created_at!), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    {wasUnread && (
                      <div className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" aria-label="Unread" />
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <Bell className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-3 text-lg font-medium text-muted-foreground">
            No notifications yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            You&apos;ll be notified about exchange updates and community activity
          </p>
        </div>
      )}
    </div>
  );
}
