"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { EXCHANGE_MODES } from "@/lib/constants/exchange-modes";
import { CATEGORIES } from "@/lib/constants/categories";
import {
  Home,
  Wrench,
  Heart,
  Leaf,
  Baby,
  Palette,
  Car,
  GraduationCap,
  Sofa,
  Briefcase,
  Gift,
  Search,
} from "lucide-react";
import type { PostWithAuthor } from "@/types/database";

const ICON_MAP: Record<string, React.ElementType> = {
  Home,
  Wrench,
  Heart,
  Leaf,
  Baby,
  Palette,
  Car,
  GraduationCap,
  Sofa,
  Briefcase,
};

export function PostCardGrid({ post }: { post: PostWithAuthor }) {
  if (post.removed_by_mod) return null;

  const category = CATEGORIES.find((c) => c.value === post.category);
  const CategoryIcon = category ? ICON_MAP[category.icon] || Home : Home;
  const hasImage = post.images && post.images.length > 0;
  const topMode = (post.exchange_modes ?? [])[0];
  const modeInfo = EXCHANGE_MODES.find((m) => m.value === topMode);

  return (
    <Link href={`/posts/${post.id}`} className="group block rounded-xl focus-visible:outline-2 focus-visible:outline-primary">
      <div className="relative aspect-square overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md">
        {/* Image or Category Placeholder */}
        {hasImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.images![0]}
              alt={post.title}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-primary/5">
            <CategoryIcon className="h-12 w-12 text-primary/30" />
          </div>
        )}

        {/* Exchange mode badge - top right */}
        {modeInfo && (
          <Badge
            variant="secondary"
            className="absolute right-2 top-2 text-[10px] shadow-sm backdrop-blur-sm"
          >
            {modeInfo.label}
          </Badge>
        )}

        {/* Type indicator - top left */}
        <div className={`absolute left-2 top-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-sm backdrop-blur-sm ${
          post.type === "offer"
            ? "bg-primary/90 text-primary-foreground"
            : "bg-amber-600/90 text-white"
        }`} role="status">
          {post.type === "offer"
            ? <Gift className="h-2.5 w-2.5" />
            : <Search className="h-2.5 w-2.5" />
          }
          {post.type === "offer" ? "Offering" : "Wanted"}
        </div>

        {/* Title overlay at bottom */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent p-3 pt-8">
          <p className="line-clamp-2 text-sm font-medium leading-tight text-white">
            {post.title}
          </p>
          {category && (
            <p className="mt-0.5 text-[11px] text-white/70">
              {category.label}
            </p>
          )}
        </div>

        {/* Image count badge */}
        {post.images && post.images.length > 1 && (
          <div className="absolute right-2 bottom-2 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white backdrop-blur-sm">
            {post.images.length} photos
          </div>
        )}
      </div>
    </Link>
  );
}
