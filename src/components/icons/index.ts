/**
 * Icon Configuration for XClaw
 *
 * This module provides a centralized icon system using Phosphor Icons.
 * All icons should be imported from this file to ensure consistency.
 */
export * from '@phosphor-icons/react';

/**
 * Icon configuration presets for different contexts
 */
export const ICON_CONFIG = {
  /** Navigation icons - regular weight */
  nav: { weight: 'regular' as const, size: 20 },

  /** Button icons - bold weight */
  button: { weight: 'bold' as const, size: 16 },

  /** Status icons - fill weight */
  status: { weight: 'fill' as const, size: 20 },

  /** Empty state icons - thin weight */
  empty: { weight: 'thin' as const, size: 48 },

  /** Decorative icons - duotone weight */
  decorative: { weight: 'duotone' as const, size: 24 },

  /** Small icons for inline use */
  inline: { weight: 'regular' as const, size: 14 },

  /** Large icons for headers */
  header: { weight: 'regular' as const, size: 24 },
} as const;

/**
 * Icon size variants
 */
export const ICON_SIZES = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  '2xl': 48,
} as const;

/**
 * Icon weight variants
 */
export const ICON_WEIGHTS = {
  thin: 'thin' as const,
  light: 'light' as const,
  regular: 'regular' as const,
  medium: 'medium' as const,
  bold: 'bold' as const,
  fill: 'fill' as const,
  duotone: 'duotone' as const,
} as const;

// Re-export commonly used icons with semantic names
export {
  // Navigation
  House as HomeIcon,
  ChatCircle as ChatIcon,
  Gear as SettingsIcon,
  User as UserIcon,
  Broadcast as ChannelsIcon,
  PuzzlePiece as SkillsIcon,
  Clock as ClockIcon,
  CheckSquare as TodoIcon,
  NewspaperClipping as BriefingIcon,
  ChartBar as UsageIcon,
  CreditCard as SubscriptionIcon,
  Terminal as TerminalIcon,

  // Actions
  Plus as PlusIcon,
  Minus as MinusIcon,
  X as CloseIcon,
  Check as CheckIcon,
  Trash as TrashIcon,
  Copy as CopyIcon,
  PaperPlaneTilt as SendIcon,
  FloppyDisk as SaveIcon,
  UploadSimple as UploadIcon,
  DownloadSimple as DownloadIcon,
  PencilSimple as EditIcon,
  ArrowClockwise as RefreshIcon,
  ArrowCounterClockwise as UndoIcon,

  // Status
  Spinner as LoadingIcon,
  CircleNotch as SpinnerIcon,
  WarningCircle as ErrorIcon,
  Warning as WarningIcon,
  CheckCircle as SuccessIcon,
  Info as InfoIcon,
  XCircle as FailIcon,

  // AI & Tech
  Lightning as ZapIcon,
  Sparkle as SparklesIcon,
  Brain as BrainIcon,
  Robot as BotIcon,
  Code as CodeIcon,
  Key as KeyIcon,
  Lock as LockIcon,
  LockOpen as UnlockIcon,
  ShieldCheck as ShieldIcon,
  Wrench as WrenchIcon,

  // Files & Media
  File as FileIcon,
  FileText as FileTextIcon,
  FilmStrip as FilmIcon,
  MusicNote as MusicIcon,
  Image as ImageIcon,
  FileZip as FileArchiveIcon,
  Paperclip as AttachmentIcon,
  Folder as FolderIcon,

  // UI Elements
  Eye as EyeIcon,
  EyeSlash as EyeOffIcon,
  MagnifyingGlass as SearchIcon,
  Funnel as FilterIcon,
  DotsThree as MoreIcon,
  DotsThreeVertical as MoreVerticalIcon,
  CaretLeft as ChevronLeftIcon,
  CaretRight as ChevronRightIcon,
  CaretDown as ChevronDownIcon,
  CaretUp as ChevronUpIcon,
  ArrowSquareOut as ExternalLinkIcon,
  ArrowUpRight as ArrowUpRightIcon,
  List as MenuIcon,
  Square as SquareIcon,
  Minus as MinimizeIcon,

  // Special
  Gift as GiftIcon,
  Crown as CrownIcon,
  Rocket as RocketIcon,
  Building as BuildingIcon,
  Buildings as BuildingsIcon,
  SignOut as LogoutIcon,
  SignIn as LoginIcon,
  Moon as MoonIcon,
  Sun as SunIcon,
  Desktop as DesktopIcon,
  Globe as GlobeIcon,
  GearSix as GearSixIcon,
} from '@phosphor-icons/react';
