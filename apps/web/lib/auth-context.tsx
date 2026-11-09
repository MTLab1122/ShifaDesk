'use client';

import * as React from 'react';
import { UserRole } from '@matabai/shared';
import { ApiClient } from './api-client';
import { Language, LANGUAGES, getDictionary } from './i18n';

interface UserSession {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  phone?: string;
  organizationId?: string;
  clinicId?: string;
}

interface AuthContextType {
  user: UserSession | null;
  role: UserRole;
  language: Language;
  direction: 'ltr' | 'rtl';
  t: Record<string, string>;
  isLoading: boolean;
  setRole: (role: UserRole) => void;
  setLanguage: (lang: Language) => void;
  login: (email: string, role?: UserRole) => Promise<void>;
  logout: () => void;
  organizationId: string | null;
  setOrganizationId: (orgId: string | null) => void;
  clinicId: string | null;
  setClinicId: (clinicId: string | null) => void;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<UserSession | null>(null);
  const [role, setRoleState] = React.useState<UserRole>(UserRole.CLINIC_ADMIN);
  const [language, setLanguageState] = React.useState<Language>('en');
  const [organizationId, setOrgIdState] = React.useState<string | null>(null);
  const [clinicId, setClinicIdState] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  // Restore session from localStorage or API on load
  React.useEffect(() => {
    async function restore() {
      const savedLang = (localStorage.getItem('matabai_lang') as Language) || 'en';
      setLanguageState(savedLang);

      const savedRole = (localStorage.getItem('matabai_mock_role') as UserRole) || UserRole.CLINIC_ADMIN;
      setRoleState(savedRole);

      const token = ApiClient.getToken();
      if (token) {
        try {
          const me = await ApiClient.auth.getMe();
          setUser({
            id: me.user.id,
            fullName: me.user.fullName,
            email: me.user.email,
            role: me.activeRole || savedRole,
            organizationId: me.activeOrganizationId,
            clinicId: me.activeClinicId,
          });
          if (me.activeOrganizationId) setOrgIdState(me.activeOrganizationId);
          if (me.activeClinicId) setClinicIdState(me.activeClinicId);
        } catch {
          // Fallback to local demo session
          setUser({
            id: 'demo-user-1',
            fullName: 'Muhammad Talha (Founder & Admin)',
            email: 'founder@matabai.local',
            role: savedRole,
          });
        }
      } else {
        // Default demo session for immediate verification
        setUser({
          id: 'demo-user-1',
          fullName: 'Muhammad Talha (Founder & Admin)',
          email: 'founder@matabai.local',
          role: savedRole,
        });
      }
      setIsLoading(false);
    }
    restore();
  }, []);

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    localStorage.setItem('matabai_mock_role', newRole);
    if (user) {
      setUser({ ...user, role: newRole });
    }
  };

  const setLanguage = (newLang: Language) => {
    setLanguageState(newLang);
    localStorage.setItem('matabai_lang', newLang);
    document.documentElement.dir = LANGUAGES[newLang].dir;
    document.documentElement.lang = newLang;
  };

  const setOrganizationId = (orgId: string | null) => {
    setOrgIdState(orgId);
    ApiClient.setOrganizationId(orgId);
  };

  const setClinicId = (cId: string | null) => {
    setClinicIdState(cId);
  };

  const login = async (email: string, userRole = UserRole.CLINIC_ADMIN) => {
    setIsLoading(true);
    // Set development token
    const token = `dev-token-${userRole.toLowerCase()}-${email}`;
    ApiClient.setToken(token);

    try {
      const me = await ApiClient.auth.getMe();
      setUser({
        id: me.user.id,
        fullName: me.user.fullName,
        email: me.user.email,
        role: me.activeRole || userRole,
        organizationId: me.activeOrganizationId,
        clinicId: me.activeClinicId,
      });
      setRoleState(me.activeRole || userRole);
    } catch {
      setUser({
        id: `user-${Date.now()}`,
        fullName: email.split('@')[0] || 'User',
        email,
        role: userRole,
      });
      setRoleState(userRole);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    ApiClient.setToken(null);
    setUser(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  const direction = LANGUAGES[language]?.dir || 'ltr';
  const t = getDictionary(language);

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        language,
        direction,
        t,
        isLoading,
        setRole,
        setLanguage,
        login,
        logout,
        organizationId,
        setOrganizationId,
        clinicId,
        setClinicId,
      }}
    >
      <div dir={direction} className="min-h-screen flex flex-col">
        {children}
      </div>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
