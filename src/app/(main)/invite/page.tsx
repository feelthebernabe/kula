import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { InviteDialog } from "@/components/invites/InviteDialog";

export default async function InvitePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-md space-y-6 pt-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Invite Neighbors</h1>
        <p className="text-sm text-muted-foreground">
          Grow your sharing network by inviting people you trust.
        </p>
      </div>
      <div className="flex justify-center">
        <InviteDialog userId={user.id} />
      </div>
    </div>
  );
}
