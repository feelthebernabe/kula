"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Camera, X, CheckCircle2, Circle, Shield, Instagram, Twitter, Linkedin, Globe, Phone, Mail } from "lucide-react";
import { DeleteAccountDialog } from "@/components/settings/DeleteAccountDialog";
import { toast } from "sonner";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [offersList, setOffersList] = useState<string[]>([]);
  const [needsList, setNeedsList] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [offerInput, setOfferInput] = useState("");
  const [needInput, setNeedInput] = useState("");
  const [phone, setPhone] = useState("");
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});
  const [verificationMethods, setVerificationMethods] = useState<string[]>([]);
  const [verificationTier, setVerificationTier] = useState("basic");
  const [savingVerification, setSavingVerification] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function loadProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    setUserId(user.id);

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profile) {
      setDisplayName(profile.display_name || "");
      setBio(profile.bio || "");
      setLocation(profile.primary_location || "");
      setSkills(profile.skills || []);
      setOffersList(profile.offers_list || []);
      setNeedsList(profile.needs_list || []);
      setAvatarUrl(profile.avatar_url || null);
      setPhone(profile.phone || "");
      setSocialLinks((profile.social_links as Record<string, string>) || {});
      setVerificationMethods(profile.verification_methods || []);
      setVerificationTier(profile.verification_tier || "basic");
    }
    setLoading(false);
  }

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId || uploadingAvatar) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setUploadingAvatar(true);
    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}/avatar-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      toast.error("Failed to upload avatar");
      setUploadingAvatar(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(fileName);

    const newUrl = urlData.publicUrl;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: newUrl })
      .eq("id", userId);

    if (updateError) {
      toast.error("Failed to update profile");
    } else {
      setAvatarUrl(newUrl);
      toast.success("Avatar updated!");
      router.refresh();
    }
    setUploadingAvatar(false);
    e.target.value = "";
  }

  function addTag(
    value: string,
    list: string[],
    setList: (v: string[]) => void,
    setInput: (v: string) => void
  ) {
    const trimmed = value.trim();
    if (trimmed && !list.includes(trimmed)) {
      setList([...list, trimmed]);
    }
    setInput("");
  }

  function removeTag(
    value: string,
    list: string[],
    setList: (v: string[]) => void
  ) {
    setList(list.filter((item) => item !== value));
  }

  async function handleSaveAll() {
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("You must be logged in");
      setSaving(false);
      return;
    }

    // Build verification methods list
    const methods: string[] = ["email"]; // email always verified via signup
    if (phone.trim()) methods.push("phone");
    if (socialLinks.instagram?.trim()) methods.push("social_instagram");
    if (socialLinks.twitter?.trim()) methods.push("social_twitter");
    if (socialLinks.linkedin?.trim()) methods.push("social_linkedin");
    if (socialLinks.website?.trim()) methods.push("social_website");

    // Clean social links - only include non-empty values
    const cleanLinks: Record<string, string> = {};
    for (const [key, value] of Object.entries(socialLinks)) {
      if (value.trim()) cleanLinks[key] = value.trim();
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim(),
        bio: bio.trim() || null,
        primary_location: location.trim() || null,
        skills,
        offers_list: offersList,
        needs_list: needsList,
        phone: phone.trim() || null,
        social_links: cleanLinks,
        verification_methods: methods,
      })
      .eq("id", user.id);

    if (error) {
      toast.error("Failed to save: " + error.message);
    } else {
      setVerificationMethods(methods);
      toast.success("Settings saved!");
      router.refresh();
    }
    setSaving(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your profile and preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Avatar Upload */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-16 w-16">
                <AvatarImage src={avatarUrl || undefined} alt={displayName} />
                <AvatarFallback className="bg-primary/10 text-lg text-primary">
                  {displayName
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2) || "?"}
                </AvatarFallback>
              </Avatar>
              <label
                className={`absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-sm transition-opacity hover:bg-primary/90 ${
                  uploadingAvatar ? "pointer-events-none opacity-50" : ""
                }`}
              >
                <Camera className="h-3.5 w-3.5" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  disabled={uploadingAvatar}
                />
              </label>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {uploadingAvatar ? "Uploading..." : "Profile Photo"}
              </p>
              <p className="text-xs text-muted-foreground">
                Click the camera icon to upload
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              placeholder="Tell people about yourself..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="City, neighborhood, etc."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Skills</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <Badge key={skill} variant="secondary" className="gap-1">
                {skill}
                <button
                  type="button"
                  onClick={() => removeTag(skill, skills, setSkills)}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <Input
            placeholder="Add a skill and press Enter"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag(skillInput, skills, setSkills, setSkillInput);
              }
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Offers & Needs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label>What can you offer?</Label>
            <div className="flex flex-wrap gap-2">
              {offersList.map((offer) => (
                <Badge key={offer} variant="outline" className="gap-1 bg-primary/5">
                  {offer}
                  <button
                    type="button"
                    onClick={() => removeTag(offer, offersList, setOffersList)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <Input
              placeholder="Add an offer and press Enter"
              value={offerInput}
              onChange={(e) => setOfferInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag(offerInput, offersList, setOffersList, setOfferInput);
                }
              }}
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <Label>What are you looking for?</Label>
            <div className="flex flex-wrap gap-2">
              {needsList.map((need) => (
                <Badge key={need} variant="outline" className="gap-1">
                  {need}
                  <button
                    type="button"
                    onClick={() => removeTag(need, needsList, setNeedsList)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <Input
              placeholder="Add a need and press Enter"
              value={needInput}
              onChange={(e) => setNeedInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag(needInput, needsList, setNeedsList, setNeedInput);
                }
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save button moved to bottom of page */}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4" />
              Verification & Trust
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              {verificationMethods.length} verified
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Verify your identity to build trust. Each verification adds to your trust score.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Verification Tier */}
          <div className="rounded-lg border p-3 space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Verification Tier
              </p>
              <Badge
                variant="outline"
                className={
                  verificationTier === "community_vouched"
                    ? "border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300"
                    : verificationTier === "verified"
                      ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300"
                      : ""
                }
              >
                {verificationTier === "community_vouched"
                  ? "Community Vouched"
                  : verificationTier === "verified"
                    ? "Verified"
                    : "Basic"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {verificationTier === "community_vouched"
                ? "You've been vouched for by trusted community members."
                : verificationTier === "verified"
                  ? "Your identity has been verified."
                  : "Add verifications below or receive 3 vouches from trusted members (80+ trust) to upgrade."}
            </p>
          </div>

          {/* Email - always verified */}
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
            <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Email</p>
              <p className="text-xs text-muted-foreground truncate">Verified via signup</p>
            </div>
          </div>

          <Separator />

          {/* Phone */}
          <div className="flex items-start gap-3">
            {phone.trim() ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
            ) : (
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="flex-1 space-y-1.5">
              <p className="text-sm font-medium">Phone Number</p>
              <Input
                placeholder="e.g., (555) 123-4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>

          <Separator />

          {/* Social Links */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Social Profiles</p>

            <div className="flex items-start gap-3">
              {socialLinks.instagram?.trim() ? (
                <CheckCircle2 className="mt-2.5 h-4 w-4 shrink-0 text-green-500" />
              ) : (
                <Circle className="mt-2.5 h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <Instagram className="mt-2.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <Input
                placeholder="Instagram username"
                value={socialLinks.instagram || ""}
                onChange={(e) => setSocialLinks((prev) => ({ ...prev, instagram: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>

            <div className="flex items-start gap-3">
              {socialLinks.twitter?.trim() ? (
                <CheckCircle2 className="mt-2.5 h-4 w-4 shrink-0 text-green-500" />
              ) : (
                <Circle className="mt-2.5 h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <Twitter className="mt-2.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <Input
                placeholder="X / Twitter username"
                value={socialLinks.twitter || ""}
                onChange={(e) => setSocialLinks((prev) => ({ ...prev, twitter: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>

            <div className="flex items-start gap-3">
              {socialLinks.linkedin?.trim() ? (
                <CheckCircle2 className="mt-2.5 h-4 w-4 shrink-0 text-green-500" />
              ) : (
                <Circle className="mt-2.5 h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <Linkedin className="mt-2.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <Input
                placeholder="LinkedIn profile URL"
                value={socialLinks.linkedin || ""}
                onChange={(e) => setSocialLinks((prev) => ({ ...prev, linkedin: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>

            <div className="flex items-start gap-3">
              {socialLinks.website?.trim() ? (
                <CheckCircle2 className="mt-2.5 h-4 w-4 shrink-0 text-green-500" />
              ) : (
                <Circle className="mt-2.5 h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <Globe className="mt-2.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <Input
                placeholder="Personal website URL"
                value={socialLinks.website || ""}
                onChange={(e) => setSocialLinks((prev) => ({ ...prev, website: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
          </div>

        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={loadProfile} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSaveAll} disabled={saving} className="flex-1">
          {saving ? "Saving..." : "Save All Changes"}
        </Button>
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-destructive">
            Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" onClick={handleSignOut}>
            Sign Out
          </Button>
          <Separator />
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Permanently delete your account and all private data. Your posts
              and reviews will remain but be attributed to &quot;Deleted
              User&quot;.
            </p>
            <DeleteAccountDialog />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
