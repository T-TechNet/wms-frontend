import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  UsersIcon,
  CubeIcon,
  UserGroupIcon,
  ShoppingCartIcon,
  ClipboardDocumentListIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import ChangePasswordModal from './ChangePasswordModal';
import AvatarUploadModal from './AvatarUploadModal';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon, roles: ['superadmin', 'manager', 'user'] },
  { name: 'Users', href: '/users', icon: UsersIcon, roles: ['superadmin', 'manager'] },
  { name: 'Products', href: '/products', icon: CubeIcon, roles: ['superadmin', 'manager'] },
  { name: 'Customers', href: '/customers', icon: UserGroupIcon, roles: ['superadmin', 'manager'] },
  { name: 'Orders', href: '/orders', icon: ShoppingCartIcon, roles: ['superadmin', 'manager'] },
  { name: 'Tasks', href: '/tasks', icon: ClipboardDocumentListIcon, roles: ['superadmin', 'manager', 'user'] },
  { name: 'Roles', href: '/roles', icon: UsersIcon, roles: ['superadmin'] },
  { name: 'Profile', href: '/profile', icon: UsersIcon, roles: ['superadmin', 'manager', 'user'] },
  { name: 'Logs', href: '/logs', icon: ClipboardDocumentListIcon, roles: ['superadmin', 'manager', 'user'] },
];

export default function Layout({ children, user, onLogout }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  // Add state for password and avatar modals
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showAvatarUpload, setShowAvatarUpload] = useState(false);
  const location = useLocation();

  // If user is null, redirect to login or show a loading state
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading user data...</p>
          </div>
        </div>
      </div>
    );
  }

  const filteredNavigation = navigation.filter(item => item.roles.includes(user.role));

  // Add a click-away handler to close the menu when clicking outside
  React.useEffect(() => {
    if (!profileMenuOpen) return;
    function handleClick() {
      setProfileMenuOpen(false);
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [profileMenuOpen]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-40 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
          <div className="flex h-16 items-center justify-between px-4">
            <span className="text-xl font-bold text-primary-600">WMS</span>
            <button onClick={() => setSidebarOpen(false)} className="text-gray-500 hover:text-gray-700">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {filteredNavigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`sidebar-link ${location.pathname === item.href ? 'active' : ''}`}
              >
                <item.icon className="h-6 w-6" />
                {item.name}
              </Link>
            ))}
          </nav>
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-primary-600 font-medium">{user.name[0]}</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.role}</p>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex min-h-0 flex-1 flex-col border-r border-gray-200 bg-white">
          <div className="flex h-16 items-center px-4">
            <span className="text-xl font-bold text-primary-600">WMS</span>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {filteredNavigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`sidebar-link ${location.pathname === item.href ? 'active' : ''}`}
              >
                <item.icon className="h-6 w-6" />
                {item.name}
              </Link>
            ))}
          </nav>
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <button
                  className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary-500 relative"
                  onClick={e => {
                    e.stopPropagation();
                    setProfileMenuOpen((v) => !v);
                  }}
                  aria-label="Open user menu"
                  type="button"
                >
                  <span className="text-primary-600 font-medium">{user.name[0]}</span>
                  <svg
                    className={`absolute -right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="ml-3 relative">
                  <button
                    className="text-sm font-medium text-gray-700 hover:underline focus:outline-none"
                    onClick={e => {
                      e.stopPropagation();
                      setProfileMenuOpen((v) => !v);
                    }}
                  >
                    {user.name}
                  </button>
                  <p className="text-xs text-gray-500">{user.role}</p>
                  {profileMenuOpen && (
                    <div className="absolute left-0 mt-2 w-48 bg-white border border-gray-200 rounded shadow-lg z-50">
                      <Link
                        to="/profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setProfileMenuOpen(false)}
                      >
                        View Profile
                      </Link>
                      <button
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => { setProfileMenuOpen(false); setShowChangePassword(true); }}
                      >
                        Change Password
                      </button>
                      <button
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => { setProfileMenuOpen(false); setShowAvatarUpload(true); }}
                      >
                        Upload Avatar
                      </button>
                      <button
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={onLogout}
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        <div className="sticky top-0 z-10 flex h-16 flex-shrink-0 bg-white shadow items-center justify-between px-4">
          <button
            type="button"
            className="px-4 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
          <div className="flex flex-1 items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-900 my-auto">
              {filteredNavigation.find(item => item.href === location.pathname)?.name || 'Dashboard'}
            </h1>
            <button
              className="ml-4 px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600 focus:outline-none"
              onClick={onLogout}
            >
              Logout
            </button>
          </div>
        </div>

        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>

      {/* Modals for password and avatar */}
      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}
      {showAvatarUpload && (
        <AvatarUploadModal onClose={() => setShowAvatarUpload(false)} />
      )}
    </div>
  );
}