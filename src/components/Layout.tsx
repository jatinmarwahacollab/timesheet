import React, { useState } from 'react';
import { Link, NavLink, useLocation, Outlet } from 'react-router-dom';
import { 
  Clock, 
  Calendar, 
  BarChart2, 
  Settings, 
  Users, 
  Briefcase,
  ListTodo,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import Avatar from './Avatar';

interface LayoutProps {
  user: any;
}

const Layout: React.FC<LayoutProps> = ({ user }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  
  const navigationItems = [
    { 
      name: 'Time Tracker', 
      path: '/', 
      icon: Clock 
    },
    { 
      name: 'Timesheet', 
      path: '/timesheet', 
      icon: Calendar 
    },
    { 
      name: 'Projects', 
      path: '/projects', 
      icon: Briefcase 
    },
    { 
      name: 'Tasks', 
      path: '/tasks', 
      icon: ListTodo 
    },
    { 
      name: 'Reports', 
      path: '/reports', 
      icon: BarChart2 
    },
    { 
      name: 'Team', 
      path: '/team', 
      icon: Users 
    },
    { 
      name: 'Settings', 
      path: '/settings', 
      icon: Settings 
    },
  ];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const getCurrentPageTitle = () => {
    const currentRoute = navigationItems.find(item => item.path === location.pathname);
    return currentRoute ? currentRoute.name : 'Dashboard';
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar for desktop */}
      <aside className="hidden md:flex md:w-64 flex-col fixed inset-y-0 border-r bg-white">
        <div className="flex h-16 items-center justify-between px-4 border-b">
          <Link to="/" className="flex items-center space-x-2">
            <Clock className="h-6 w-6 text-blue-600" />
            <span className="text-xl font-semibold text-gray-900">Timesheet</span>
          </Link>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) => cn(
                  "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-50"
                )}
              >
                <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                {item.name}
              </NavLink>
            );
          })}
        </nav>

        {user && (
          <div className="border-t p-4">
            <div className="flex items-center space-x-3">
              <Avatar name={user.full_name || user.email || 'User'} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.full_name || 'User'}
                </p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
              <button 
                onClick={handleSignOut}
                className="text-gray-400 hover:text-gray-500"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile header and menu */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-10 bg-white border-b">
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center space-x-2">
            <Clock className="h-6 w-6 text-blue-600" />
            <span className="text-lg font-semibold text-gray-900">Timesheet</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={toggleMobileMenu}
              className="text-gray-500 hover:text-gray-700 focus:outline-none"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
        
        {isMobileMenuOpen && (
          <div className="fixed inset-0 top-16 bg-gray-800 bg-opacity-75 z-50">
            <div className="bg-white h-full overflow-y-auto">
              <nav className="px-2 py-4 space-y-1">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.name}
                      to={item.path}
                      onClick={closeMobileMenu}
                      className={({ isActive }) => cn(
                        "group flex items-center px-3 py-3 text-base font-medium rounded-md",
                        isActive
                          ? "bg-blue-50 text-blue-700"
                          : "text-gray-700 hover:bg-gray-50"
                      )}
                    >
                      <Icon className="mr-4 h-6 w-6 flex-shrink-0" />
                      {item.name}
                    </NavLink>
                  );
                })}
                
                {user && (
                  <div className="border-t mt-4 pt-4">
                    <div className="flex items-center px-3 py-3">
                      <Avatar name={user.full_name || user.email || 'User'} size="sm" />
                      <div className="ml-3">
                        <p className="text-base font-medium text-gray-900">
                          {user.full_name || 'User'}
                        </p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <button 
                      onClick={handleSignOut}
                      className="flex w-full items-center px-3 py-3 text-base font-medium text-gray-700 hover:bg-gray-50 rounded-md"
                    >
                      <LogOut className="mr-4 h-6 w-6 text-gray-400" />
                      Sign out
                    </button>
                  </div>
                )}
              </nav>
            </div>
          </div>
        )}
      </div>

      {/* Main content */}
      <main className="flex-1 md:pl-64 pt-16 md:pt-0">
        <div className="mx-auto px-4 sm:px-6 md:px-8">
          <div className="py-6">
            <div className="md:flex md:items-center md:justify-between mb-4">
              <div className="min-w-0 flex-1">
                <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate">
                  {getCurrentPageTitle()}
                </h2>
              </div>
            </div>
            
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;