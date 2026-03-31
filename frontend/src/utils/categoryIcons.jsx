import {
  Utensils,
  Car,
  ShoppingBag,
  FileText,
  Film,
  HeartPulse,
  BookOpen,
  MoreHorizontal,
  ShoppingCart,
  Repeat,
  Tag,
} from "lucide-react";

const ICON_MAP = {
  utensils: Utensils,
  car : Car,
  "shopping-bag" : ShoppingBag,
  "file-text": FileText,
  film : Film,
  "heart-pulse" : HeartPulse,
  "book-open" : BookOpen,
  "more-horizontal" : MoreHorizontal,
  "shopping-cart" : ShoppingCart,
  repeat : Repeat,
};

export function CategoryIcon({ name, size = 16, className = "" }) {
  const Icon = ICON_MAP[name] || Tag;
  return <Icon size={size} className={className} />;
}
