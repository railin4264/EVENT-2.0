// Type definitions for lucide-react
declare module 'lucide-react' {
  import { FC, SVGProps } from 'react';

  export type IconProps = SVGProps<SVGSVGElement> & {
    size?: string | number;
    color?: string;
    strokeWidth?: string | number;
  };

  export type Icon = FC<IconProps>;

  // Common icons used in the app
  export const ArrowRight: Icon;
  export const Bell: Icon;
  export const Calendar: Icon;
  export const Camera: Icon;
  export const Check: Icon;
  export const CheckCheck: Icon;
  export const ChevronDown: Icon;
  export const ChevronLeft: Icon;
  export const ChevronRight: Icon;
  export const ChevronUp: Icon;
  export const Clock: Icon;
  export const Crown: Icon;
  export const Download: Icon;
  export const Edit: Icon;
  export const Edit3: Icon;
  export const Eye: Icon;
  export const EyeOff: Icon;
  export const File: Icon;
  export const Filter: Icon;
  export const Heart: Icon;
  export const History: Icon;
  export const Home: Icon;
  export const Image: Icon;
  export const Instagram: Icon;
  export const Linkedin: Icon;
  export const Loader: Icon;
  export const Loader2: Icon;
  export const Lock: Icon;
  export const LogOut: Icon;
  export const Mail: Icon;
  export const MapPin: Icon;
  export const Menu: Icon;
  export const MessageCircle: Icon;
  export const MessageSquare: Icon;
  export const Monitor: Icon;
  export const Moon: Icon;
  export const MoreHorizontal: Icon;
  export const MoreVertical: Icon;
  export const Paperclip: Icon;
  export const Phone: Icon;
  export const Plus: Icon;
  export const PlusCircle: Icon;
  export const Search: Icon;
  export const Settings: Icon;
  export const Share: Icon;
  export const Shield: Icon;
  export const Smile: Icon;
  export const Star: Icon;
  export const Sun: Icon;
  export const Trash: Icon;
  export const Trash2: Icon;
  export const TrendingUp: Icon;
  export const Twitter: Icon;
  export const Type: Icon;
  export const User: Icon;
  export const UserMinus: Icon;
  export const Users: Icon;
  export const X: Icon;
  export const Zap: Icon;

  // Add more icons as needed
  export const Play: Icon;
  export const Pause: Icon;
  export const Volume2: Icon;
  export const VolumeX: Icon;
  export const Bookmark: Icon;
  export const BookmarkCheck: Icon;
  export const Copy: Icon;
  export const ExternalLink: Icon;
  export const FileText: Icon;
  export const Globe: Icon;
  export const Info: Icon;
  export const AlertCircle: Icon;
  export const CheckCircle: Icon;
  export const XCircle: Icon;
  export const AlertTriangle: Icon;
  export const RefreshCw: Icon;
  export const RotateCcw: Icon;
  export const Send: Icon;
  export const Smile: Icon;
  export const ThumbsUp: Icon;
  export const TrendingUp: Icon;
  export const Wifi: Icon;
  export const WifiOff: Icon;

  // Default export for dynamic imports
  const LucideReact: {
    [key: string]: Icon;
  };
  export default LucideReact;
}