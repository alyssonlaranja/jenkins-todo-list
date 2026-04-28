/**
 * Utility to get Lucide icons by string name
 *
 * This allows loading icons dynamically from manifest configurations
 * where icon names are stored as strings.
 */
import * as LucideIcons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/**
 * Icon name to component mapping for commonly used icons
 */
const iconMap: Record<string, LucideIcon> = {
  // Setup & Configuration
  Settings: LucideIcons.Settings,
  Sliders: LucideIcons.Sliders,
  Network: LucideIcons.Network,
  Server: LucideIcons.Server,
  Database: LucideIcons.Database,

  // Navigation & Movement
  ArrowUpCircle: LucideIcons.ArrowUpCircle,
  ArrowDownCircle: LucideIcons.ArrowDownCircle,
  ArrowRightLeft: LucideIcons.ArrowRightLeft,
  RefreshCcw: LucideIcons.RefreshCcw,
  ChevronRight: LucideIcons.ChevronRight,

  // Communication
  Mail: LucideIcons.Mail,
  MessageSquare: LucideIcons.MessageSquare,
  MessageSquareText: LucideIcons.MessageSquareText,
  Send: LucideIcons.Send,

  // Actions
  Wand2: LucideIcons.Wand2,
  Sparkles: LucideIcons.Sparkles,
  Play: LucideIcons.Play,
  Pause: LucideIcons.Pause,

  // Education & Training
  GraduationCap: LucideIcons.GraduationCap,
  Award: LucideIcons.Award,
  BookOpen: LucideIcons.BookOpen,
  FileText: LucideIcons.FileText,
  FileCode: LucideIcons.FileCode,
  FileEdit: LucideIcons.FileEdit,
  FileStack: LucideIcons.FileStack,
  Target: LucideIcons.Target,
  Lightbulb: LucideIcons.Lightbulb,
  Rocket: LucideIcons.Rocket,
  Compass: LucideIcons.Compass,
  Map: LucideIcons.Map,
  Flag: LucideIcons.Flag,
  Building: LucideIcons.Building,

  // Knowledge Slots
  Presentation: LucideIcons.Presentation,
  GitBranch: LucideIcons.GitBranch,
  Video: LucideIcons.Video,
  Code: LucideIcons.Code,
  Upload: LucideIcons.Upload,
  Brain: LucideIcons.Brain,

  // Specialization & Difficulty
  Layers: LucideIcons.Layers,
  Briefcase: LucideIcons.Briefcase,
  Leaf: LucideIcons.Leaf,
  Flame: LucideIcons.Flame,
  Zap: LucideIcons.Zap,
  Crown: LucideIcons.Crown,
  Trophy: LucideIcons.Trophy,
  Medal: LucideIcons.Medal,
  Star: LucideIcons.Star,

  // Branding & Style
  Palette: LucideIcons.Palette,
  Paintbrush: LucideIcons.Paintbrush,
  MousePointer: LucideIcons.MousePointer,
  Dumbbell: LucideIcons.Dumbbell,

  // Status & Feedback
  CheckCircle2: LucideIcons.CheckCircle2,
  AlertCircle: LucideIcons.AlertCircle,
  Info: LucideIcons.Info,
  HelpCircle: LucideIcons.HelpCircle,

  // UI Elements
  Lock: LucideIcons.Lock,
  Unlock: LucideIcons.Unlock,
  Eye: LucideIcons.Eye,
  EyeOff: LucideIcons.EyeOff,
  Clock: LucideIcons.Clock,
  Calendar: LucideIcons.Calendar,

  // Users & Roles
  User: LucideIcons.User,
  Users: LucideIcons.Users,
  UserPlus: LucideIcons.UserPlus,
  Shield: LucideIcons.Shield,

  // Misc
  Folder: LucideIcons.Folder,
  File: LucideIcons.File,
  Search: LucideIcons.Search,
  Filter: LucideIcons.Filter,
  Plus: LucideIcons.Plus,
  Minus: LucideIcons.Minus,
  X: LucideIcons.X,
  Check: LucideIcons.Check,
  Copy: LucideIcons.Copy,
  Trash: LucideIcons.Trash2,
  Edit: LucideIcons.Edit,
  MoreHorizontal: LucideIcons.MoreHorizontal,
  MoreVertical: LucideIcons.MoreVertical,
}

/**
 * Get a Lucide icon component by its string name
 *
 * @param name - The icon name (e.g., "Settings", "ArrowUpCircle")
 * @returns The LucideIcon component or undefined if not found
 *
 * @example
 * ```tsx
 * const Icon = getLucideIcon('Settings')
 * if (Icon) return <Icon className="size-5" />
 * ```
 */
export function getLucideIcon(name: string): LucideIcon | undefined {
  // First check our mapped icons
  if (iconMap[name]) {
    return iconMap[name]
  }

  // Try to get from LucideIcons directly (covers all icons)
  const icon = (LucideIcons as Record<string, unknown>)[name]
  if (icon && typeof icon === 'function') {
    return icon as LucideIcon
  }

  return undefined
}

/**
 * Get a Lucide icon with a fallback
 *
 * @param name - The icon name
 * @param fallback - Fallback icon to use if not found
 * @returns The LucideIcon component
 */
export function getLucideIconWithFallback(
  name: string,
  fallback: LucideIcon = LucideIcons.HelpCircle
): LucideIcon {
  return getLucideIcon(name) || fallback
}
