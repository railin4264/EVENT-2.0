import { ReactNode } from 'react';

// Type for Lucide icons (compatible with lucide-react 0.408.0)
export type LucideIcon = React.ComponentType<any>;

// Common component props
export interface BaseComponentProps {
  className?: string;
  children?: ReactNode;
  id?: string;
  testId?: string;
}

// Layout Types
export interface LayoutProps extends BaseComponentProps {
  title?: string;
  description?: string;
}

export interface SidebarItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  badge?: string | number;
  isActive?: boolean;
  onClick?: () => void;
}

export interface TabItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  badge?: string | number;
  isActive?: boolean;
}

// Form Types
export interface FormFieldProps extends BaseComponentProps {
  label?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
}

export interface SelectOption {
  value: string;
  label: string;
  icon?: LucideIcon;
  description?: string;
  disabled?: boolean;
}

// Card Types
export interface CardProps extends BaseComponentProps {
  title?: string;
  description?: string;
  image?: string;
  imageAlt?: string;
  actions?: ReactNode;
  hover?: boolean;
  loading?: boolean;
}

// Button Types
export type ButtonVariant = 
  | 'default' 
  | 'destructive' 
  | 'outline' 
  | 'secondary' 
  | 'ghost' 
  | 'link' 
  | 'gradient';

export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends BaseComponentProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
  fullWidth?: boolean;
  onClick?: () => void;
}

// Modal Types
export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
}

// Loading Types
export interface LoadingProps extends BaseComponentProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  text?: string;
}

export interface SkeletonProps extends BaseComponentProps {
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
  lines?: number;
}

// Navigation Types
export interface BreadcrumbItem {
  label: string;
  href?: string;
  isActive?: boolean;
}

export interface PaginationProps extends BaseComponentProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showFirstLast?: boolean;
  showPrevNext?: boolean;
  siblingCount?: number;
}

// Search Types
export interface SearchProps extends BaseComponentProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  loading?: boolean;
  results?: SearchResult[];
  showResults?: boolean;
}

export interface SearchResult {
  id: string;
  type: 'user' | 'event' | 'tribe';
  title: string;
  description?: string;
  image?: string;
  href: string;
}

// Filter Types
export interface FilterOption {
  id: string;
  label: string;
  value: any;
  count?: number;
}

export interface FilterGroup {
  id: string;
  label: string;
  type: 'checkbox' | 'radio' | 'range' | 'date' | 'select';
  options?: FilterOption[];
  min?: number;
  max?: number;
  step?: number;
}

export interface ActiveFilter {
  groupId: string;
  optionId: string;
  label: string;
  value: any;
}

// Map Types
export interface MapProps extends BaseComponentProps {
  center?: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  onMarkerClick?: (marker: MapMarker) => void;
  onMapClick?: (coordinates: [number, number]) => void;
  showUserLocation?: boolean;
  clustered?: boolean;
}

export interface MapMarker {
  id: string;
  position: [number, number];
  title?: string;
  description?: string;
  type?: 'event' | 'user' | 'tribe' | 'custom';
  data?: any;
  icon?: string;
}

// Chat Types
export interface ChatBubbleProps extends BaseComponentProps {
  message: string;
  sender: string;
  timestamp: string;
  isOwn?: boolean;
  avatar?: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  attachments?: any[];
  reactions?: any[];
}

export interface ChatInputProps extends BaseComponentProps {
  value?: string;
  onChange?: (value: string) => void;
  onSend?: (message: string) => void;
  placeholder?: string;
  disabled?: boolean;
  allowAttachments?: boolean;
  allowVoice?: boolean;
  typing?: boolean;
}

// Media Types
export interface ImageProps extends BaseComponentProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  aspectRatio?: string;
  objectFit?: 'cover' | 'contain' | 'fill';
  loading?: 'lazy' | 'eager';
  placeholder?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export interface VideoProps extends BaseComponentProps {
  src: string;
  poster?: string;
  controls?: boolean;
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
  width?: number;
  height?: number;
}

// Animation Types
export interface AnimationProps {
  initial?: any;
  animate?: any;
  exit?: any;
  transition?: any;
  delay?: number;
  duration?: number;
}

// Toast Types
export interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Theme Types
export interface ThemeConfig {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    muted: string;
    border: string;
  };
  fonts: {
    sans: string;
    mono: string;
  };
  spacing: Record<string, string>;
  borderRadius: Record<string, string>;
}

// Error Types
export interface ErrorBoundaryProps extends BaseComponentProps {
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
}

// Infinite Scroll Types
export interface InfiniteScrollProps extends BaseComponentProps {
  hasMore: boolean;
  loadMore: () => void;
  loading?: boolean;
  threshold?: number;
  loader?: ReactNode;
  endMessage?: ReactNode;
}

// Avatar Types
export interface AvatarProps extends BaseComponentProps {
  src?: string;
  alt?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  fallback?: string;
  online?: boolean;
  badge?: string | number;
}

// Badge Types
export interface BadgeProps extends BaseComponentProps {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  rounded?: boolean;
}

// Progress Types
export interface ProgressProps extends BaseComponentProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  showValue?: boolean;
  animated?: boolean;
}