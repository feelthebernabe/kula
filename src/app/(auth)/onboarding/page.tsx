"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PILOT_COMMUNITY_ID } from "@/lib/constants/pilot-community";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Camera } from "lucide-react";
import { toast } from "sonner";

const STEPS = [
  { title: "Your Location", description: "Where are you based?" },
  { title: "Join Community", description: "Connect with your neighborhood" },
  {
    title: "Your Profile",
    description: "Tell people what you can offer and what you need",
  },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Redirect already-onboarded users back to feed
  useEffect(() => {
    async function checkOnboarding() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .single();
      if (profile?.onboarding_completed) {
        router.replace("/feed");
      }
    }
    checkOnboarding();
  }, [supabase, router]);

  // Step 1: Location
  const [location, setLocation] = useState("");

  // Step 2: Community (auto-join pilot in MVP)

  // Step 3: Profile
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [bio, setBio] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [offerInput, setOfferInput] = useState("");
  const [offers, setOffers] = useState<string[]>([]);
  const [needInput, setNeedInput] = useState("");
  const [needs, setNeeds] = useState<string[]>([]);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || uploadingAvatar) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setUploadingAvatar(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploadingAvatar(false); return; }

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/avatar-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      toast.error("Failed to upload photo");
      setUploadingAvatar(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(fileName);

    const newUrl = urlData.publicUrl;

    await supabase
      .from("profiles")
      .update({ avatar_url: newUrl })
      .eq("id", user.id);

    setAvatarUrl(newUrl);
    toast.success("Photo added!");
    setUploadingAvatar(false);
    e.target.value = "";
  }

  function addTag(
    input: string,
    setInput: (v: string) => void,
    list: string[],
    setList: (v: string[]) => void
  ) {
    const trimmed = input.trim();
    if (trimmed && !list.includes(trimmed)) {
      setList([...list, trimmed]);
      setInput("");
    }
  }

  function removeTag(
    item: string,
    list: string[],
    setList: (v: string[]) => void
  ) {
    setList(list.filter((i) => i !== item));
  }

  async function handleComplete() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Session expired. Please sign in again.");
      router.push("/login");
      return;
    }

    // Update profile with onboarding data
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        primary_location: location || null,
        bio: bio || null,
        skills,
        offers_list: offers,
        needs_list: needs,
        onboarding_completed: true,
      })
      .eq("id", user.id);

    if (profileError) {
      toast.error("Failed to save profile: " + profileError.message);
      setLoading(false);
      return;
    }

    // Join the pilot community
    const { error: communityError } = await supabase
      .from("community_members")
      .upsert(
        {
          community_id: PILOT_COMMUNITY_ID,
          user_id: user.id,
        },
        { onConflict: "community_id,user_id" }
      );

    if (communityError) {
      console.error("Failed to join community:", communityError.message);
      // Non-blocking - continue even if community join fails
    }

    toast.success("Welcome to Kula!");
    router.push("/feed");
    router.refresh();
  }

  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <div className="mb-4 flex justify-center gap-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-2 w-12 rounded-full transition-colors ${
                i <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
        <CardTitle className="text-xl">{STEPS[step].title}</CardTitle>
        <CardDescription>{STEPS[step].description}</CardDescription>
      </CardHeader>

      <CardContent>
        {step === 0 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="location">City / Neighborhood</Label>
              <Input
                id="location"
                type="text"
                placeholder="e.g., Brooklyn, Park Slope"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                This helps us connect you with nearby sharers. You can change
                this anytime.
              </p>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <h3 className="font-semibold text-foreground">
                Kula Pilot Community
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Welcome to Kula! This is our founding sharing network. Share
                what you have, ask for what you need, and build trust with your
                neighbors.
              </p>
              <div className="mt-3 flex items-center gap-2 text-sm text-primary">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                  />
                </svg>
                You&apos;ll be joining this community
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            {/* Avatar Upload */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={avatarUrl || undefined} alt="Your photo" />
                  <AvatarFallback className="bg-primary/10 text-2xl text-primary">
                    <Camera className="h-8 w-8" />
                  </AvatarFallback>
                </Avatar>
                <label
                  className={`absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 ${
                    uploadingAvatar ? "pointer-events-none opacity-50" : ""
                  }`}
                >
                  <Camera className="h-4 w-4" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    disabled={uploadingAvatar}
                  />
                </label>
              </div>
              <p className="text-sm text-muted-foreground">
                {uploadingAvatar ? "Uploading..." : avatarUrl ? "Looking good!" : "Add a profile photo"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">About You (optional)</Label>
              <Textarea
                id="bio"
                placeholder="A few words about yourself..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={500}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Skills (optional)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., carpentry, cooking, design"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag(skillInput, setSkillInput, skills, setSkills);
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    addTag(skillInput, setSkillInput, skills, setSkills)
                  }
                >
                  Add
                </Button>
              </div>
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {skills.map((skill) => (
                    <Badge
                      key={skill}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => removeTag(skill, skills, setSkills)}
                    >
                      {skill} ×
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>What can you offer?</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., massage, tutoring, power tools"
                  value={offerInput}
                  onChange={(e) => setOfferInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag(offerInput, setOfferInput, offers, setOffers);
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    addTag(offerInput, setOfferInput, offers, setOffers)
                  }
                >
                  Add
                </Button>
              </div>
              {offers.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {offers.map((offer) => (
                    <Badge
                      key={offer}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => removeTag(offer, offers, setOffers)}
                    >
                      {offer} ×
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                These help others find you when they need something you can
                provide.
              </p>
            </div>

            <div className="space-y-2">
              <Label>What do you need?</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., childcare, home repairs, yoga"
                  value={needInput}
                  onChange={(e) => setNeedInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag(needInput, setNeedInput, needs, setNeeds);
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    addTag(needInput, setNeedInput, needs, setNeeds)
                  }
                >
                  Add
                </Button>
              </div>
              {needs.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {needs.map((need) => (
                    <Badge
                      key={need}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => removeTag(need, needs, setNeeds)}
                    >
                      {need} ×
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                This data powers future smart matching (Kula Circles).
              </p>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between">
        {step > 0 ? (
          <Button variant="ghost" onClick={() => setStep(step - 1)}>
            Back
          </Button>
        ) : (
          <div />
        )}
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(step + 1)}>Continue</Button>
        ) : (
          <Button onClick={handleComplete} disabled={loading}>
            {loading ? "Setting up..." : "Enter Kula"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
