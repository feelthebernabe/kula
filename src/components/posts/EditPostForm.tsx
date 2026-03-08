"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { ImageUploader } from "@/components/shared/ImageUploader";
import { LocationPicker } from "@/components/map/LocationPicker";
import { toast } from "sonner";
import type { ExchangeMode, PostType } from "@/types/database";

interface EditPostFormProps {
  post: Record<string, unknown>;
  communities: { id: string; name: string }[];
}

export function EditPostForm({ post, communities }: EditPostFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const [postType, setPostType] = useState<PostType>(post.type as PostType);
  const [category, setCategory] = useState(post.category as string);
  const [title, setTitle] = useState(post.title as string);
  const [body, setBody] = useState((post.body as string) || "");
  const [condition, setCondition] = useState((post.condition as string) || "");
  const [exchangeModes, setExchangeModes] = useState<ExchangeMode[]>(
    (post.exchange_modes as ExchangeMode[]) || []
  );
  const [loanDuration, setLoanDuration] = useState(
    (post.loan_duration as string) || ""
  );
  const [timeDollarAmount, setTimeDollarAmount] = useState(
    post.time_dollar_amount ? String(post.time_dollar_amount) : ""
  );
  const [images, setImages] = useState<string[]>(
    (post.images as string[]) || []
  );
  const [location, setLocation] = useState<{
    lat: number;
    lng: number;
    name: string;
  } | null>(
    post.latitude
      ? {
          lat: post.latitude as number,
          lng: post.longitude as number,
          name: (post.location_name as string) || "",
        }
      : null
  );
  const [communityId, setCommunityId] = useState(
    (post.community_id as string) || ""
  );

  function toggleExchangeMode(mode: ExchangeMode) {
    setExchangeModes((prev) =>
      prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode]
    );
  }

  async function handleSubmit() {
    if (!title || title.length < 5) {
      toast.error("Title must be at least 5 characters");
      return;
    }
    if (exchangeModes.length === 0) {
      toast.error("Select at least one exchange mode");
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("posts")
      .update({
        type: postType,
        category,
        title,
        body: body || null,
        condition: condition || null,
        exchange_modes: exchangeModes,
        loan_duration: exchangeModes.includes("loan")
          ? loanDuration || null
          : null,
        time_dollar_amount: exchangeModes.includes("time_dollar")
          ? parseFloat(timeDollarAmount) || null
          : null,
        community_id: communityId || null,
        images,
        latitude: location?.lat ?? null,
        longitude: location?.lng ?? null,
        location_name: location?.name ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", post.id as string);

    if (error) {
      toast.error("Failed to update post: " + error.message);
      setLoading(false);
      return;
    }

    toast.success("Post updated!");
    router.push(`/posts/${post.id}`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Type */}
      <div className="space-y-2">
        <Label>Post Type</Label>
        <div className="flex gap-2">
          <Badge
            variant={postType === "offer" ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setPostType("offer")}
          >
            Offering
          </Badge>
          <Badge
            variant={postType === "request" ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setPostType("request")}
          >
            Looking for
          </Badge>
        </div>
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label>Category</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger>
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
        />
        <p className="text-xs text-muted-foreground">
          {title.length}/120 characters
        </p>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="body">Description</Label>
        <Textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={5000}
          rows={5}
        />
      </div>

      {/* Condition */}
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

      {/* Photos */}
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

      {/* Location */}
      <div className="space-y-2">
        <Label>Location (optional)</Label>
        <LocationPicker value={location} onChange={setLocation} />
      </div>

      {/* Community */}
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

      {/* Exchange Modes */}
      <div className="space-y-3">
        <Label>Exchange Mode(s) *</Label>
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
            placeholder="e.g., 1 week, 3 days"
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
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading || !title || title.length < 5 || exchangeModes.length === 0}
        >
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
