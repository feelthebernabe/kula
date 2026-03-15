import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Sidebar } from "@/components/layout/Sidebar";
import { AskKulaButton } from "@/components/chat/AskKulaButton";
import { AskKulaProvider } from "@/lib/contexts/AskKulaContext";
import { ProfileBuilderButton } from "@/components/profile-builder/ProfileBuilderButton";
import { ProfileBuilderProvider } from "@/lib/contexts/ProfileBuilderContext";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.onboarding_completed) {
    redirect("/onboarding");
  }

  // Fetch unread notification count
  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", user.id)
    .eq("read", false);

  // Fetch unread message count
  const { count: unreadMessages } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .neq("sender_id", user.id)
    .eq("read", false);

  return (
    <AskKulaProvider>
      <ProfileBuilderProvider>
        <div className="min-h-screen bg-background">
          <TopBar profile={profile} unreadNotifications={unreadCount ?? 0} />
          <div className="mx-auto flex max-w-5xl gap-6 px-4 py-6">
            <Sidebar />
            <main className="min-w-0 flex-1 pb-20 md:pb-6">{children}</main>
          </div>
          <BottomNav unreadMessages={unreadMessages ?? 0} />
          <ProfileBuilderButton />
          <AskKulaButton />
        </div>
      </ProfileBuilderProvider>
    </AskKulaProvider>
  );
}
