# 🚀 EventConnect 2.0 - Frontend

A modern, enterprise-level frontend application for EventConnect 2.0, built with Next.js 14, TypeScript, and Tailwind CSS. This application provides a beautiful, responsive, and feature-rich interface for discovering events, connecting with people, and building communities.

## ✨ Features

### 🎨 Modern Design System
- **Custom Color Palette**: Primary (#6366F1), Secondary (#8B5CF6), Accent (#EC4899)
- **Dark Mode Support**: Automatic theme switching with system preference detection
- **Glass Morphism Effects**: Modern backdrop blur and transparency effects
- **Micro-interactions**: Smooth animations and transitions using Framer Motion
- **Responsive Design**: Mobile-first approach with perfect tablet and desktop layouts

### 🔐 Authentication System
- **Multi-step Registration**: Clean, guided user onboarding process
- **Secure Login**: JWT-based authentication with refresh tokens
- **Social Login Ready**: Google and GitHub integration prepared
- **Form Validation**: Real-time validation with Zod schemas
- **Password Strength**: Visual feedback and security requirements

### 🏗️ Architecture & Performance
- **Next.js 14**: Latest App Router with Server Components
- **TypeScript**: Full type safety throughout the application
- **Zustand**: Lightweight state management
- **TanStack Query**: Powerful server state management
- **API Integration**: Axios-based client with interceptors
- **Error Handling**: Comprehensive error boundaries and user feedback

### 🎯 UI Components Library
- **Custom Components**: Button, Input, Card, Avatar, Badge, Loading
- **Accessibility**: ARIA labels and keyboard navigation
- **Variants**: Multiple sizes and styles for each component
- **Consistent**: Design system tokens for spacing, colors, and typography

## 🛠️ Tech Stack

### Core Framework
- **Next.js 14** - React framework with App Router
- **React 18** - UI library with modern features
- **TypeScript** - Type safety and developer experience

### Styling & UI
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Animation library
- **Lucide React** - Beautiful icon library
- **Radix UI** - Headless UI components

### State Management
- **Zustand** - Lightweight state management
- **TanStack Query** - Server state and caching
- **React Hook Form** - Form state management

### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Husky** - Git hooks
- **TypeScript** - Static type checking

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── login/             # Authentication pages
│   ├── register/
│   ├── dashboard/
│   └── layout.tsx         # Root layout
│
├── components/            # React components
│   ├── ui/               # Base UI components
│   ├── features/         # Feature-specific components
│   ├── layouts/          # Layout components
│   └── shared/           # Shared components
│
├── hooks/                # Custom React hooks
├── lib/                  # Utilities and configurations
│   ├── api/             # API client and endpoints
│   ├── providers/       # Context providers
│   ├── utils/           # Helper functions
│   └── constants/       # App constants
│
├── stores/              # Zustand stores
├── styles/              # Global styles and themes
└── types/               # TypeScript type definitions
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm 9+
- Backend API running on `http://localhost:5000`

### Installation

1. **Clone the repository**
   ```bash
   git clone [repository-url]
   cd eventconnect-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local`:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 📄 Available Pages

### Public Pages
- **Home** (`/`) - Landing page with hero section and features
- **Login** (`/login`) - User authentication
- **Register** (`/register`) - Multi-step user registration

### Protected Pages
- **Dashboard** (`/dashboard`) - Personalized user dashboard
- **Events** (`/events`) - Event discovery and management
- **Profile** (`/profile`) - User profile management
- **Settings** (`/settings`) - Account settings

## 🎨 Design System

### Colors
```css
Primary: #6366F1 (Indigo)
Secondary: #8B5CF6 (Purple) 
Accent: #EC4899 (Pink)
Success: #10B981 (Emerald)
Warning: #F59E0B (Amber)
Error: #EF4444 (Red)
```

### Typography
- **Font Family**: Inter (Google Fonts)
- **Font Weights**: 300, 400, 500, 600, 700, 800, 900
- **Responsive Scales**: Mobile-first with proper scaling

### Components
All components follow consistent patterns:
- **Variants**: Different visual styles
- **Sizes**: Multiple size options
- **States**: Loading, error, disabled states
- **Accessibility**: ARIA labels and keyboard support

## 🔗 API Integration

The application integrates with the EventConnect 2.0 backend API:

### Authentication Endpoints
- `POST /auth/login` - User login
- `POST /auth/register` - User registration  
- `POST /auth/refresh` - Token refresh
- `GET /auth/me` - Get current user

### Features Ready for Integration
- **Events**: CRUD operations for events
- **Users**: Profile management and user discovery
- **Chat**: Real-time messaging with Socket.IO
- **Notifications**: Push notifications system
- **Gamification**: Points, levels, and achievements

## 🧪 Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
npm run format       # Format code with Prettier

# Testing
npm run test         # Run tests
npm run test:ui      # Run tests with UI
npm run test:e2e     # End-to-end tests
```

## 🌟 Key Features Implemented

### ✅ Completed Features
- [x] Modern landing page with animations
- [x] Complete authentication system (login/register)
- [x] Responsive design system
- [x] Dark mode support
- [x] TypeScript integration
- [x] API client with error handling
- [x] State management setup
- [x] Form validation
- [x] UI components library
- [x] Dashboard layout

### 🚧 Ready for Implementation
- [ ] Event discovery and creation
- [ ] Real-time chat system
- [ ] User profiles and social features
- [ ] Maps integration
- [ ] Push notifications
- [ ] Gamification system
- [ ] Stories feature
- [ ] PWA capabilities

## 🎯 Performance Goals

- **Lighthouse Score**: 95+ for all metrics
- **Core Web Vitals**: Green for LCP, FID, CLS
- **Bundle Size**: < 200KB initial load
- **Time to Interactive**: < 3.5s

## 🔒 Security Features

- **XSS Protection**: Input sanitization
- **CSRF Protection**: Built-in Next.js protection  
- **Secure Headers**: CSP, X-Frame-Options
- **Token Storage**: Secure JWT handling
- **Input Validation**: Client and server validation

## 📱 Browser Support

- **Chrome**: 88+
- **Firefox**: 85+
- **Safari**: 14+
- **Edge**: 88+
- **Mobile**: iOS 14+, Android 10+

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if needed
5. Submit a pull request

## 📧 Support

For questions or support, please contact the development team or create an issue in the repository.

---

**EventConnect 2.0 Frontend** - Built with ❤️ using modern web technologies