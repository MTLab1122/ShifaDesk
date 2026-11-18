'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { UserRole } from '@matabai/shared';
import { Language, LANGUAGES } from '@/lib/i18n';
import { Badge } from '@/components/ui/badge';
import { ApiClient } from '@/lib/api-client';
import {
  Activity,
  LayoutDashboard,
  Building2,
  Stethoscope,
  Users,
  UserCheck,
  Calendar,
  ListOrdered,
  FileText,
  Pill,
  Clock,
  MessageSquare,
  Bot,
  PhoneCall,
  FlaskConical,
  Receipt,
  Bell,
  FileBarChart,
  Settings,
  ShieldAlert,
  CreditCard,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Globe,
  User,
} from 'lucide-react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: [
      UserRole.SUPER_ADMIN,
      UserRole.CLINIC_ADMIN,
      UserRole.DOCTOR,
      UserRole.RECEPTIONIST,
      UserRole.LAB_STAFF,
    ],
  },
  {
    title: 'Clinics',
    href: '/dashboard/clinics',
    icon: Building2,
    roles: [UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN],
  },
  {
    title: 'Doctors',
    href: '/dashboard/doctors',
    icon: Stethoscope,
    roles: [UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN],
  },
  {
    title: 'Receptionists',
    href: '/dashboard/receptionists',
    icon: UserCheck,
    roles: [UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN],
  },
  {
    title: 'Patients',
    href: '/dashboard/patients',
    icon: Users,
    roles: [
      UserRole.SUPER_ADMIN,
      UserRole.CLINIC_ADMIN,
      UserRole.DOCTOR,
      UserRole.RECEPTIONIST,
    ],
  },
  {
    title: 'Appointments',
    href: '/dashboard/appointments',
    icon: Calendar,
    roles: [
      UserRole.SUPER_ADMIN,
      UserRole.CLINIC_ADMIN,
      UserRole.DOCTOR,
      UserRole.RECEPTIONIST,
    ],
  },
  {
    title: 'Live Queue',
    href: '/dashboard/queue',
    icon: ListOrdered,
    roles: [
      UserRole.SUPER_ADMIN,
      UserRole.CLINIC_ADMIN,
      UserRole.DOCTOR,
      UserRole.RECEPTIONIST,
    ],
  },
  {
    title: 'Encounters (EMR)',
    href: '/dashboard/encounters',
    icon: FileText,
    roles: [
      UserRole.SUPER_ADMIN,
      UserRole.CLINIC_ADMIN,
      UserRole.DOCTOR,
      UserRole.RECEPTIONIST,
    ],
  },
  {
    title: 'Prescriptions',
    href: '/dashboard/prescriptions',
    icon: Pill,
    roles: [
      UserRole.SUPER_ADMIN,
      UserRole.CLINIC_ADMIN,
      UserRole.DOCTOR,
      UserRole.RECEPTIONIST,
    ],
  },
  {
    title: 'Follow-ups',
    href: '/dashboard/follow-ups',
    icon: Clock,
    roles: [
      UserRole.SUPER_ADMIN,
      UserRole.CLINIC_ADMIN,
      UserRole.DOCTOR,
      UserRole.RECEPTIONIST,
    ],
  },
  {
    title: 'WhatsApp Chat',
    href: '/dashboard/conversations',
    icon: MessageSquare,
    roles: [
      UserRole.SUPER_ADMIN,
      UserRole.CLINIC_ADMIN,
      UserRole.RECEPTIONIST,
    ],
  },
  {
    title: 'AI Receptionist',
    href: '/dashboard/ai-assistant',
    icon: Bot,
    roles: [
      UserRole.SUPER_ADMIN,
      UserRole.CLINIC_ADMIN,
      UserRole.RECEPTIONIST,
    ],
  },
  {
    title: 'Voice Assistant',
    href: '/dashboard/voice-assistant',
    icon: PhoneCall,
    roles: [
      UserRole.SUPER_ADMIN,
      UserRole.CLINIC_ADMIN,
      UserRole.RECEPTIONIST,
      UserRole.DOCTOR,
    ],
  },
  {
    title: 'Laboratory',
    href: '/dashboard/laboratory',
    icon: FlaskConical,
    roles: [
      UserRole.SUPER_ADMIN,
      UserRole.CLINIC_ADMIN,
      UserRole.DOCTOR,
      UserRole.LAB_STAFF,
      UserRole.LAB_MANAGER,
      UserRole.LAB_REVIEWER,
      UserRole.RECEPTIONIST,
    ],
  },
  {
    title: 'Billing & Finance',
    href: '/dashboard/finance',
    icon: Receipt,
    roles: [
      UserRole.SUPER_ADMIN,
      UserRole.CLINIC_ADMIN,
      UserRole.ACCOUNTANT,
      UserRole.RECEPTIONIST,
    ],
  },
  {
    title: 'Analytics & BI',
    href: '/dashboard/analytics',
    icon: FileBarChart,
    roles: [
      UserRole.SUPER_ADMIN,
      UserRole.CLINIC_ADMIN,
      UserRole.DOCTOR,
      UserRole.ACCOUNTANT,
      UserRole.LAB_MANAGER,
      UserRole.RECEPTIONIST,
    ],
  },
  {
    title: 'Report Builder',
    href: '/dashboard/analytics/reports',
    icon: Activity,
    roles: [
      UserRole.SUPER_ADMIN,
      UserRole.CLINIC_ADMIN,
      UserRole.DOCTOR,
      UserRole.ACCOUNTANT,
      UserRole.LAB_MANAGER,
    ],
  },
  {
    title: 'Notifications',
    href: '/dashboard/notifications',
    icon: Bell,
    roles: [
      UserRole.SUPER_ADMIN,
      UserRole.CLINIC_ADMIN,
      UserRole.DOCTOR,
      UserRole.RECEPTIONIST,
      UserRole.LAB_STAFF,
    ],
  },
  {
    title: 'Audit Logs',
    href: '/dashboard/audit-logs',
    icon: ShieldAlert,
    roles: [UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN],
  },
  {
    title: 'Subscription',
    href: '/dashboard/subscription',
    icon: CreditCard,
    roles: [UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.ACCOUNTANT],
  },
  {
    title: 'Platform Admin',
    href: '/dashboard/platform',
    icon: ShieldAlert,
    roles: [UserRole.SUPER_ADMIN],
  },
  {
    title: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
    roles: [
      UserRole.SUPER_ADMIN,
      UserRole.CLINIC_ADMIN,
      UserRole.DOCTOR,
      UserRole.RECEPTIONIST,
      UserRole.LAB_STAFF,
    ],
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, role, setRole, language, setLanguage, logout, t, direction } =
    useAuth();

  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState<number>(0);

  React.useEffect(() => {
    let isMounted = true;
    const fetchUnread = async () => {
      try {
        const res = await ApiClient.inApp.getUnreadCount();
        if (isMounted) setUnreadCount(res.unreadCount || 0);
      } catch {
        // Silently skip if unauthenticated or network error
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Filter navigation items by active role
  const visibleNavItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(role),
  );

  return (
    <div
      dir={direction}
      className="min-h-screen flex bg-muted/20 text-foreground font-sans antialiased"
    >
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:sticky top-0 z-50 h-screen bg-card border-r border-border transition-all duration-300 flex flex-col justify-between ${mobileMenuOpen
          ? 'translate-x-0 w-64'
          : '-translate-x-full md:translate-x-0'
          } ${sidebarCollapsed ? 'md:w-20' : 'md:w-64'}`}
      >
        <div>
          {/* Brand Header */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-border">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 overflow-hidden"
            >
              <Activity className="h-7 w-7 text-clinical-600 shrink-0" />
              {!sidebarCollapsed && (
                <div className="font-extrabold text-lg tracking-tight truncate">
                  MatabAI <span className="text-clinical-600 font-medium">Shifa</span>
                </div>
              )}
            </Link>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Nav List */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-10rem)]">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                    ? 'bg-clinical-600 text-white shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  title={sidebarCollapsed ? item.title : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!sidebarCollapsed && <span>{item.title}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Controls */}
        <div className="p-3 border-t border-border space-y-2">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden md:flex items-center justify-center w-full py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <div className="flex items-center gap-2">
                <ChevronLeft className="h-4 w-4" />
                <span>Collapse Sidebar</span>
              </div>
            )}
          </button>

          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!sidebarCollapsed && <span>{t.logout || 'Sign Out'}</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 md:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden text-muted-foreground hover:text-foreground"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="text-sm font-medium text-muted-foreground hidden sm:block">
              Clinic Operations &bull; <span className="text-foreground font-semibold">Al-Shifa Healthcare</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Switcher */}
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-md text-xs">
              <Globe className="h-3.5 w-3.5 text-muted-foreground ml-1" />
              {(['en', 'ur', 'ps'] as Language[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${language === lang
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  {LANGUAGES[lang].nativeName}
                </button>
              ))}
            </div>

            {/* Role Demo Switcher */}
            <div className="hidden lg:flex items-center gap-1.5 text-xs">
              <span className="text-muted-foreground">Role:</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value={UserRole.CLINIC_ADMIN}>Clinic Admin</option>
                <option value={UserRole.DOCTOR}>Doctor</option>
                <option value={UserRole.RECEPTIONIST}>Receptionist</option>
                <option value={UserRole.LAB_STAFF}>Lab Staff</option>
                <option value={UserRole.SUPER_ADMIN}>Super Admin</option>
                <option value={UserRole.PATIENT}>Patient</option>
              </select>
            </div>

            {/* Notification Icon */}
            <Link
              href="/dashboard/notifications"
              className="relative p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 ? (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-clinical-600 px-1 text-[9px] font-bold text-white shadow-sm">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              ) : (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-clinical-500 animate-pulse" />
              )}
            </Link>

            {/* User Profile Pill */}
            <div className="flex items-center gap-2 pl-2 border-l border-border">
              <div className="h-8 w-8 rounded-full bg-clinical-100 text-clinical-700 flex items-center justify-center font-bold text-xs">
                <User className="h-4 w-4" />
              </div>
              <div className="hidden sm:block text-left text-xs">
                <div className="font-semibold text-foreground truncate max-w-[120px]">
                  {user?.fullName || 'Dr. Talha'}
                </div>
                <div className="text-muted-foreground text-[10px]">
                  <Badge variant="outline" className="text-[9px] px-1 py-0">
                    {role}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Viewport */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">{children}</main>
      </div>
    </div>
  );
}

