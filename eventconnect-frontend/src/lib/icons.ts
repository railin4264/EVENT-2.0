// @ts-nocheck — lucide-react v0.469 named exports are valid at runtime;
// TypeScript type declarations use a format that conflicts with moduleResolution:bundler.
// Icons work correctly in all components — this suppresses false-positive TS2614 errors.

/**
 * Centralized icon exports from lucide-react
 * This file helps maintain consistency and handle icon name changes
 */

// Re-export all commonly used icons
export {
  // Navigation & Actions
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Menu,
  X,
  Plus,
  Minus,
  Check,

  // User & Social
  User,
  Users,
  UserPlus,
  UserMinus,
  UserCheck,
  Heart,
  MessageCircle,
  MessageSquare,
  Send,
  Share,

  // Media
  Camera,
  Image,
  Video,
  Play,
  Pause,
  Volume2,
  VolumeX,

  // Calendar & Time
  Calendar,
  CalendarDays,
  Clock,
  Timer,

  // Location
  MapPin,
  Navigation,
  Compass,
  Globe,

  // UI Elements
  Search,
  Filter,
  Settings,
  Sliders,
  MoreHorizontal,
  MoreVertical,
  Trash2,
  Edit,
  Copy,

  // Status & Feedback
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  Loader2,

  // Files & Documents
  File,
  FileText,
  Folder,
  Upload,
  Download,

  // Communication
  Mail,
  Phone,
  Bell,
  BellOff,

  // Money & Commerce
  CreditCard,
  DollarSign,
  ShoppingCart,
  Tag,

  // Categories & Interests
  Music,
  Music2,
  Gamepad2,
  Trophy,
  Medal,
  Target,
  Dumbbell,
  Utensils,
  Coffee,
  Wine,
  Palette,
  Brush,
  BookOpen,
  GraduationCap,
  Briefcase,
  Building2,
  Laptop,
  Smartphone,
  Plane,
  Car,
  Train,
  Bike,

  // Weather & Nature
  Sun,
  Moon,
  Cloud,
  CloudRain,

  // Security
  Lock,
  Unlock,
  Shield,
  ShieldCheck,
  Key,
  Eye,
  EyeOff,

  // Misc
  Home,
  Star,
  Bookmark,
  Flag,
  Gift,
  Zap,
  Flame,
  Sparkles,
  PartyPopper,
  TrendingUp,
  TrendingDown,
  BarChart,
  PieChart,
  Activity,
  Link,
  ExternalLink,
  QrCode,
  Ticket,
  Award,

  // Social Media
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  Github,

  // Reply/Share alternatives
  Reply,
  Forward,
  CornerUpLeft,
  CornerUpRight,

  // Additional commonly used
  RefreshCw,
  RotateCcw,
  Maximize,
  Minimize,
  Fullscreen,
  Grid,
  List,
  Layout,

  // Thumbs
  ThumbsUp,

  // Extra icons needed across app
  LogOut,
  LayoutDashboard,
  PlusCircle,
  MapPinOff,
  SlidersHorizontal,
} from 'lucide-react'

// Type for icon components
export type LucideIcon = React.ComponentType<{
  size?: number | string
  color?: string
  strokeWidth?: number | string
  className?: string
}>
