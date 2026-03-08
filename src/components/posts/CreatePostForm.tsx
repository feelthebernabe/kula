"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES } from "@/lib/constants/categories";
import { EXCHANGE_MODES } from "@/lib/constants/exchange-modes";
import { CONDITIONS, PHYSICAL_GOODS_CATEGORIES } from "@/lib/constants/conditions";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ImageUploader } from "@/components/shared/ImageUploader";
import { LocationPicker } from "@/components/map/LocationPicker";
import type { ExchangeMode, PostType } from "@/types/database";

interface CreatePostFormProps {
  communities: { id: string; name: string }[];
  defaultCommunityId?: string;
  pendingReviews?: number;
}

export function CreatePostForm({ communities, defaultCommunityId, pendingReviews = 0 }: CreatePostFormProps) {
  const router = useRouter();
  const supabase = createClient();

  // Anti-gaming: block posting if 3+ pending reviews
  if (pendingReviews >= 3) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              You have {pendingReviews} completed exchange{pendingReviews !== 1 ? "s" : ""} awaiting your review
            </p>
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
              Please leave reviews for your recent exchanges before creating new posts.
              Reviews help build trust in the community.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 border-amber-300 text-amber-700 hover:bg-amber-100"
              onClick={() => router.push("/exchanges")}
            >
              Go to Exchanges
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Form state
  const [postType, setPostType] = useState<PostType | null>(null);
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [exchangeModes, setExchangeModes] = useState<ExchangeMode[]>([]);
  const [loanDuration, setLoanDuration] = useState("");
  const [timeDollarAmount, setTimeDollarAmount] = useState("");
  const [condition, setCondition] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [location, setLocation] = useState<{
    lat: number;
    lng: number;
    name: string;
  } | null>(null);
  const [communityId, setCommunityId] = useState(defaultCommunityId || communities[0]?.id || "");

  function toggleExchangeMode(mode: ExchangeMode) {
    setExchangeModes((prev) =>
      prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode]
    );
  }

  async function handleSubmit() {
    if (!postType || !category || !title || exchangeModes.length === 0) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (title.length < 5) {
      toast.error("Title must be at least 5 characters");
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Session expired");
      router.push("/login");
      return;
    }

    const { data, error } = await supabase
      .from("posts")
      .insert({
        author_id: user.id,
        type: postType,
        category,
        title,
        body: body || null,
        exchange_modes: exchangeModes,
        loan_duration: exchangeModes.includes("loan") ? loanDuration || null : null,
        time_dollar_amount: exchangeModes.includes("time_dollar")
          ? parseFloat(timeDollarAmount) || null
          : null,
        community_id: communityId || null,
        condition: condition || null,
        images,
        latitude: location?.lat ?? null,
        longitude: location?.lng ?? null,
        location_name: location?.name ?? null,
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to create post: " + error.message);
      setLoading(false);
      return;
    }

    toast.success("Post created!");
    router.push(`/posts/${data.id}`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Step indicators */}
      <div className="flex gap-2">
        {["Type", "Category", "Details", "Exchange"].map((label, i) => (
          <button
            key={label}
            onClick={() => {
              if (i < step) setStep(i);
            }}
            className={`flex-1 rounded-full py-1.5 text-xs font-medium transition-colors ${
              i === step
                ? "bg-primary text-primary-foreground"
                : i < step
                  ? "bg-primary/20 text-primary cursor-pointer"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Step 0: Type */}
      {step === 0 && (
        <div className="grid grid-cols-2 gap-4">
          <Card
            className={`cursor-pointer transition-all ${
              postType === "offer"
                ? "border-primary ring-2 ring-primary/20"
                : "hover:border-primary/30"
            }`}
            onClick={() => {
              setPostType("offer");
              setStep(1);
            }}
          >
            <CardContent className="flex flex-col items-center p-6 text-center">
              <span className="text-3xl">🎁</span>
              <h3 className="mt-3 text-lg font-semibold">Offer</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                I have something to share
              </p>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-all ${
              postType === "request"
                ? "border-primary ring-2 ring-primary/20"
                : "hover:border-primary/30"
            }`}
            onClick={() => {
              setPostType("request");
              setStep(1);
            }}
          >
            <CardContent className="flex flex-col items-center p-6 text-center">
              <span className="text-3xl">🙋</span>
              <h3 className="mt-3 text-lg font-semibold">Request</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                I need something
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 1: Category */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => {
                  setCategory(cat.value);
                  setStep(2);
                }}
                className={`rounded-xl border p-4 text-left transition-all ${
                  category === cat.value
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border hover:border-primary/30 hover:bg-accent"
                }`}
              >
                <span className="text-sm font-medium text-foreground">
                  {cat.label}
                </span>
                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                  {cat.description}
                </p>
              </button>
            ))}
          </div>
          <Button variant="ghost" onClick={() => setStep(0)}>
            Back
          </Button>
        </div>
      )}

      {/* Step 2: Details */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder={
                postType === "offer"
                  ? "What are you offering?"
                  : "What are you looking for?"
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              required
            />
            <p className="text-xs text-muted-foreground">
              {title.length}/120 characters
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="body">Description</Label>
            <Textarea
              id="body"
              placeholder="Add details, conditions, availability..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={5000}
              rows={5}
            />
          </div>
          {(PHYSICAL_GOODS_CATEGORIES as readonly string[]).includes(category) && (
            <div className="space-y-2">
              <Label>Condition</Label>
              <div className="flex flex-wrap gap-2">
                {CONDITIONS.map((c) => (
                  <Badge
                    key={c.value}
                    variant={condition === c.value ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() =>
                      setCondition(condition === c.value ? "" : c.value)
                    }
                  >
                    {c.label}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label>Photos</Label>
            <ImageUploader
              bucket="post-images"
              folder="posts"
              maxFiles={4}
              value={images}
              onChange={setImages}
            />
          </div>
          <div className="space-y-2">
            <Label>Location (optional)</Label>
            <LocationPicker value={location} onChange={setLocation} />
          </div>
          {communities.length > 1 && (
            <div className="space-y-2">
              <Label>Community</Label>
              <Select value={communityId} onValueChange={setCommunityId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a community" />
                </SelectTrigger>
                <SelectContent>
                  {communities.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button onClick={() => setStep(3)} disabled={!title || title.length < 5}>
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Exchange modes */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="space-y-3">
            <Label>Exchange Mode(s) *</Label>
            <p className="text-sm text-muted-foreground">
              How would you like to exchange? Select one or more.
            </p>
            <div className="space-y-3">
              {EXCHANGE_MODES.map((mode) => (
                <label
                  key={mode.value}
                  className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${
                    exchangeModes.includes(mode.value as ExchangeMode)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <Checkbox
                    checked={exchangeModes.includes(mode.value as ExchangeMode)}
                    onCheckedChange={() =>
                      toggleExchangeMode(mode.value as ExchangeMode)
                    }
                    className="mt-0.5"
                  />
                  <div>
                    <span className="text-sm font-medium text-foreground">
                      {mode.label}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {mode.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {exchangeModes.includes("loan") && (
            <div className="space-y-2">
              <Label htmlFor="loanDuration">Expected Loan Duration</Label>
              <Input
                id="loanDuration"
                placeholder="e.g., 1 week, 3 days, 1 month"
                value={loanDuration}
                onChange={(e) => setLoanDuration(e.target.value)}
              />
            </div>
          )}

          {exchangeModes.includes("time_dollar") && (
            <div className="space-y-2">
              <Label htmlFor="timeDollarAmount">Time-Dollar Amount</Label>
              <Input
                id="timeDollarAmount"
                type="number"
                step="0.25"
                min="0.25"
                placeholder="e.g., 1.0 (hours)"
                value={timeDollarAmount}
                onChange={(e) => setTimeDollarAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                1 time-dollar = 1 hour of service
              </p>
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || exchangeModes.length === 0}
            >
              {loading ? "Publishing..." : "Publish Post"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
