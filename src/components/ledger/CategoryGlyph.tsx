import {
  ArrowLeftRight,
  Car,
  CircleEllipsis,
  Clapperboard,
  GraduationCap,
  HeartPulse,
  Home,
  Receipt,
  ShoppingBag,
  ShoppingBasket,
  Tag,
  TrendingUp,
  Utensils,
  Wallet,
  type LucideIcon,
} from "lucide-react";

/**
 * Default categories store a lucide icon *name* (e.g. "utensils"). Custom ones
 * store an emoji. This resolves the name to a real icon so the list never
 * renders raw text, and falls back to the emoji / a generic tag.
 */
const ICONS: Record<string, LucideIcon> = {
  utensils: Utensils,
  "shopping-basket": ShoppingBasket,
  car: Car,
  "shopping-bag": ShoppingBag,
  receipt: Receipt,
  home: Home,
  "heart-pulse": HeartPulse,
  clapperboard: Clapperboard,
  "graduation-cap": GraduationCap,
  wallet: Wallet,
  "trending-up": TrendingUp,
  "arrow-left-right": ArrowLeftRight,
  "circle-ellipsis": CircleEllipsis,
};

export function CategoryGlyph({
  icon,
  className = "size-4.5",
}: {
  icon: string | null | undefined;
  className?: string;
}) {
  const key = (icon ?? "").trim();
  const Icon = ICONS[key.toLowerCase()];
  if (Icon) return <Icon className={className} />;
  // Emoji or short label → render as text; anything longer is not an icon.
  if (key && [...key].length <= 2) return <span className="text-base leading-none">{key}</span>;
  return <Tag className={className} />;
}
