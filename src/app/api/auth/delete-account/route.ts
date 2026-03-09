import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    // 1. Authenticate user via session
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // 2. Parse password from request body
    const body = await request.json();
    const password = body?.password;

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    // 3. Verify password
    const { error: passwordError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password,
    });

    if (passwordError) {
      return NextResponse.json(
        { error: "Incorrect password" },
        { status: 403 }
      );
    }

    // 4. Use admin client for privileged operations
    const admin = createAdminClient();

    // 5. Run the anonymization + cleanup RPC
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: rpcError } = await (admin as any).rpc(
      "delete_user_account",
      { target_user_id: user.id }
    );

    if (rpcError) {
      console.error("Account deletion RPC error:", rpcError);
      return NextResponse.json(
        { error: "Failed to delete account data" },
        { status: 500 }
      );
    }

    // 6. Delete avatar files from storage
    const { data: avatarFiles } = await admin.storage
      .from("avatars")
      .list(user.id);

    if (avatarFiles && avatarFiles.length > 0) {
      await admin.storage
        .from("avatars")
        .remove(avatarFiles.map((f) => `${user.id}/${f.name}`));
    }

    // 7. Delete auth user (safe now that FK was dropped)
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error("Auth user deletion error:", deleteError);
      // Profile is already anonymized — account is effectively gone
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Account deletion error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
