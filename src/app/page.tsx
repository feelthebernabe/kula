import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import {
  Gift,
  Shield,
  Sprout,
  ArrowRight,
  MessageCircle,
  Handshake,
  Star,
  Users,
} from "lucide-react";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/feed");
  }

  // Fetch live platform stats (admin client bypasses RLS for aggregate counts)
  const admin = createAdminClient();
  const [usersResult, exchangesResult, ratingsResult] = await Promise.all([
    admin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("onboarding_completed", true),
    admin
      .from("exchange_agreements")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed"),
    admin.from("reviews").select("rating"),
  ]);

  const userCount = usersResult.count ?? 0;
  const exchangeCount = exchangesResult.count ?? 0;
  const avgRating =
    ratingsResult.data && ratingsResult.data.length > 0
      ? (
          ratingsResult.data.reduce((sum, r) => sum + (r.rating as number), 0) /
          ratingsResult.data.length
        ).toFixed(1)
      : "5.0";

  // Only show social proof if there are meaningful numbers
  const showSocialProof = userCount >= 5 || exchangeCount >= 1;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 md:px-12">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" className="h-8 w-8" />
          <span className="text-xl font-bold tracking-tight text-primary">
            Kula
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center px-4 pb-16 pt-12 md:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.svg"
            alt="Kula logo"
            className="mx-auto mb-8 h-24 w-24 md:h-28 md:w-28"
          />
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
            Share more.{" "}
            <span className="text-primary">Buy less.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Kula is a sharing network where neighbors lend, gift, barter, and
            exchange time — building trust and community one exchange at a time.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="flex items-center gap-2 rounded-lg bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/browse"
              className="rounded-lg border border-border px-6 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              Browse the feed
            </Link>
          </div>

          {/* Social proof — only show when meaningful */}
          {showSocialProof && (
            <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              {userCount >= 5 && (
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-primary" />
                  <span>{userCount}+ neighbors sharing</span>
                </div>
              )}
              {exchangeCount >= 1 && (
                <div className="flex items-center gap-1.5">
                  <Handshake className="h-4 w-4 text-primary" />
                  <span>{exchangeCount}+ exchanges completed</span>
                </div>
              )}
              {ratingsResult.data && ratingsResult.data.length >= 3 && (
                <div className="flex items-center gap-1.5">
                  <Star className="h-4 w-4 text-primary" />
                  <span>{avgRating} avg trust rating</span>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Value Props */}
      <section className="border-t border-border bg-accent/30 px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-bold text-foreground sm:text-3xl">
            Everything you need, nothing you don&apos;t
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-muted-foreground">
            Five exchange modes cover every way humans have shared for thousands
            of years.
          </p>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Gift className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mt-4 font-semibold text-foreground">
                Share Freely
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Gift, lend, barter, or exchange time. Choose the mode that works
                for each exchange.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mt-4 font-semibold text-foreground">
                Trust Built In
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Every exchange builds your trust score. Reviews and
                verified profiles keep sharing safe.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Sprout className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mt-4 font-semibold text-foreground">
                Local First
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Organized around your neighborhood. Share with the people who
                live near you.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-bold text-foreground sm:text-3xl">
            How it works
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                1
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">Post</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Share what you can offer or what you need. Add photos, pick your
                exchange modes, and post.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                2
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">Connect</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Message your neighbor, work out the details, and propose an
                exchange that works for both of you.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                3
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">Share</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Complete the exchange, leave a review, and build your trust in
                the community.
              </p>
            </div>
          </div>
          <div className="mt-12 text-center">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="border-t border-border bg-accent/30 px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <MessageCircle className="mx-auto h-8 w-8 text-primary/40" />
          <blockquote className="mt-6 text-lg italic leading-relaxed text-foreground">
            &ldquo;Marcus lent me his power tools and I built raised beds for
            the community garden. I traded him homemade kimchi and herb
            seedlings. This is how neighborhoods should work.&rdquo;
          </blockquote>
          <p className="mt-4 text-sm font-medium text-muted-foreground">
            — Elena R., Greenpoint
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-4 py-8">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" className="h-5 w-5" />
            <span className="text-sm font-semibold text-primary">Kula</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Named after the Kula Ring — a ceremonial exchange system from the
            Pacific Islands that built trust across communities for generations.
          </p>
        </div>
      </footer>
    </div>
  );
}
