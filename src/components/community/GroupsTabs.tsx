"use client";

import Link from "next/link";
import { Users, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JoinGroupButton } from "./JoinGroupButton";

interface Community {
  id: string;
  name: string;
  description: string | null;
  member_count: number;
  type: string;
  location: string | null;
}

export function GroupsTabs({
  myGroups,
  discoverGroups,
}: {
  myGroups: Community[];
  discoverGroups: Community[];
}) {
  return (
    <Tabs defaultValue="your-groups">
      <TabsList className="w-full">
        <TabsTrigger value="your-groups" className="flex-1">
          Your Groups ({myGroups.length})
        </TabsTrigger>
        <TabsTrigger value="discover" className="flex-1">
          Discover ({discoverGroups.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="your-groups" className="mt-4">
        {myGroups.length > 0 ? (
          <div className="space-y-4">
            {myGroups.map((community) => (
              <Link key={community.id} href={`/groups/${community.id}`}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{community.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {community.description}
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {community.member_count} members
                      </span>
                      {community.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {community.location}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border py-16 text-center">
            <p className="text-lg font-medium text-muted-foreground">
              No groups yet
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Check the Discover tab to find communities to join!
            </p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="discover" className="mt-4">
        {discoverGroups.length > 0 ? (
          <div className="space-y-4">
            {discoverGroups.map((community) => (
              <Card
                key={community.id}
                className="transition-shadow hover:shadow-md"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Link href={`/groups/${community.id}`}>
                      <CardTitle className="text-lg hover:underline">
                        {community.name}
                      </CardTitle>
                    </Link>
                    <JoinGroupButton communityId={community.id} />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {community.description}
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {community.member_count} members
                    </span>
                    <Badge variant="outline" className="capitalize text-xs">
                      {community.type}
                    </Badge>
                    {community.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {community.location}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border py-16 text-center">
            <p className="text-lg font-medium text-muted-foreground">
              No more communities to discover
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              You&apos;ve joined all available communities!
            </p>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
