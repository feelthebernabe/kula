import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Vercel Cron - runs daily at 9am UTC
// Secured by CRON_SECRET env var

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const now = new Date();
  const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  let reminders = 0;
  let overdue = 0;
  let lateFlags = 0;

  // Fetch all in-progress loan exchanges with return dates
  const { data: loans } = await supabase
    .from("exchange_agreements")
    .select("id, provider_id, receiver_id, loan_return_date, late_flag, late_notified_at")
    .eq("status", "in_progress")
    .eq("exchange_mode", "loan")
    .not("loan_return_date", "is", null);

  if (!loans || loans.length === 0) {
    return NextResponse.json({ message: "No active loans", reminders: 0 });
  }

  for (const loan of loans) {
    const returnDate = new Date(loan.loan_return_date);

    // 2 days before due: send reminder
    if (returnDate <= twoDaysFromNow && returnDate > now && !loan.late_notified_at) {
      await createNotification(supabase, loan.receiver_id, "loan_return_reminder", loan.id,
        `Loan return due in ${Math.ceil((returnDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))} day(s)`
      );
      await createNotification(supabase, loan.provider_id, "loan_return_reminder", loan.id,
        `Loan return due in ${Math.ceil((returnDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))} day(s)`
      );
      reminders += 2;
    }

    // 1 day overdue: send overdue notification
    if (returnDate <= oneDayAgo && returnDate > threeDaysAgo && !loan.late_notified_at) {
      await createNotification(supabase, loan.provider_id, "loan_overdue", loan.id,
        "A loan item is overdue for return"
      );
      await createNotification(supabase, loan.receiver_id, "loan_overdue", loan.id,
        "Your borrowed item is overdue for return"
      );
      await supabase
        .from("exchange_agreements")
        .update({ late_notified_at: now.toISOString() })
        .eq("id", loan.id);
      overdue += 2;
    }

    // 3+ days overdue: set late flag
    if (returnDate <= threeDaysAgo && !loan.late_flag) {
      await supabase
        .from("exchange_agreements")
        .update({ late_flag: true })
        .eq("id", loan.id);
      await createNotification(supabase, loan.provider_id, "loan_overdue", loan.id,
        "Loan is significantly overdue. You may escalate to a moderator."
      );
      lateFlags++;
    }
  }

  return NextResponse.json({
    processed: loans.length,
    reminders,
    overdue,
    lateFlags,
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function createNotification(
  supabase: any,
  userId: string,
  type: string,
  exchangeId: string,
  message: string
) {
  await supabase.from("notifications").insert({
    recipient_id: userId,
    type,
    title: type === "loan_return_reminder" ? "Loan Return Reminder" : "Loan Overdue",
    body: message,
    data: { exchange_id: exchangeId },
  });
}
