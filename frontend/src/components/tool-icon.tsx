import {
  ArrowRightLeft,
  ScanSearch,
  Shield,
  RefreshCw,
  Mail,
  MessageSquare,
  Share2,
  Mic,
  FileUser,
  FileHeart,
  ListTree,
  Briefcase,
  GraduationCap,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  ArrowRightLeft,
  ScanSearch,
  Shield,
  RefreshCw,
  Mail,
  MessageSquare,
  Share2,
  Mic,
  FileUser,
  FileHeart,
  ListTree,
  Briefcase,
  GraduationCap,
};

export function ToolIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? ArrowRightLeft;
  return <Icon className={className} />;
}
