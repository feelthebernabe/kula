"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { LocationPicker } from "@/components/map/LocationPicker";
import { toast } from "sonner";
import { use } from "react";

export default function EditPotluckPage({
  params,
}: {
  params: Promise<{ potluckId: string }>;
}) {
  const { potluckId } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState<{
    lat: number;
    lng: number;
    name: string;
  } | null>(null);
  const [locationDetails, setLocationDetails] = useState("");
  const [capacity, setCapacity] = useState("");
  const [hostProviding, setHostProviding] = useState("");

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: potluck } = await supabase
        .from("potlucks")
        .select("*")
        .eq("id", potluckId)
        .single();

      if (!potluck || potluck.host_id !== user.id) {
        toast.error("Not authorized");
        router.back();
        return;
      }

      setTitle(potluck.title);
      setDescription(potluck.description || "");

      const ed = new Date(potluck.event_date);
      setEventDate(ed.toISOString().split("T")[0]);
      setEventTime(ed.toTimeString().slice(0, 5));

      if (potluck.end_time) {
        const et = new Date(potluck.end_time);
        setEndTime(et.toTimeString().slice(0, 5));
      }

      if (potluck.latitude && potluck.longitude) {
        setLocation({
          lat: potluck.latitude,
          lng: potluck.longitude,
          name: potluck.location_name || "",
        });
      }

      setLocationDetails(potluck.location_details || "");
      setCapacity(potluck.capacity?.toString() || "");
      setHostProviding(potluck.host_providing || "");
      setLoading(false);
    }

    load();
  }, [potluckId, supabase, router]);

  async function handleSave() {
    if (!title || title.length < 5 || !eventDate || !eventTime) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSaving(true);

    const eventDateISO = new Date(`${eventDate}T${eventTime}`).toISOString();
    const endTimeISO =
      endTime && eventDate
        ? new Date(`${eventDate}T${endTime}`).toISOString()
        : null;

    const { error } = await supabase
      .from("potlucks")
      .update({
        title,
        description: description || null,
        event_date: eventDateISO,
        end_time: endTimeISO,
        latitude: location?.lat ?? null,
        longitude: location?.lng ?? null,
        location_name: location?.name ?? null,
        location_details: locationDetails || null,
        capacity: capacity ? parseInt(capacity) : null,
        host_providing: hostProviding || null,
      })
      .eq("id", potluckId);

    if (error) {
      toast.error("Failed to update: " + error.message);
    } else {
      toast.success("Potluck updated!");
      router.push(`/potlucks/${potluckId}`);
      router.refresh();
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-10 animate-pulse rounded bg-muted" />
        <div className="h-24 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Edit Potluck</h1>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={5000}
            rows={4}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="eventDate">Date *</Label>
            <Input
              id="eventDate"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eventTime">Start Time *</Label>
            <Input
              id="eventTime"
              type="time"
              value={eventTime}
              onChange={(e) => setEventTime(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="endTime">End Time (optional)</Label>
          <Input
            id="endTime"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Location</Label>
          <LocationPicker value={location} onChange={setLocation} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="locationDetails">Location Details</Label>
          <Input
            id="locationDetails"
            value={locationDetails}
            onChange={(e) => setLocationDetails(e.target.value)}
            maxLength={500}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="capacity">Capacity</Label>
          <Input
            id="capacity"
            type="number"
            min={2}
            max={500}
            placeholder="Leave blank for unlimited"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="hostProviding">What are you providing?</Label>
          <Textarea
            id="hostProviding"
            value={hostProviding}
            onChange={(e) => setHostProviding(e.target.value)}
            maxLength={1000}
            rows={2}
          />
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
