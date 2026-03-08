import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "You're Invited to Kula",
  description:
    "Join a sharing network where neighbors gift, lend, barter, and exchange time.",
};

export default async function InviteLandingPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = await createClient();

  const { data: invite } = await supabase
    .from("invites")
    .select(
      "*, inviter:profiles!inviter_id(display_name, avatar_url)"
    )
    .eq("code", code)
    .maybeSingle();

  if (!invite) notFound();

  const inviterName =
    (invite as unknown as { inviter: { display_name: string } }).inviter
      ?.display_name || "A neighbor";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-4 pt-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              You&apos;re Invited to Kula
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {inviterName} invited you to join a sharing network where
              neighbors gift, lend, barter, and exchange time with each other.
            </p>
          </div>
          <div className="space-y-2 pt-2">
            <Link href={`/signup?invite=${code}`} className="block">
              <Button className="w-full" size="lg">
                Join Kula
              </Button>
            </Link>
            <Link href="/login" className="block">
              <Button variant="ghost" className="w-full">
                Already have an account? Log in
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
