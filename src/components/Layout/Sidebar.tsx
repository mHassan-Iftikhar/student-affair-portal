import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Bell, 
  Users, 
  Calendar,
  BookOpen,
  Activity,
  LogOut,
  Shield
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar: React.FC = () => {
  const { logout, user } = useAuth();

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/lostnfound', icon: Package, label: 'LostNFound' },
    { to: '/events', icon: Calendar, label: 'Events' },
    { to: '/academic-resources', icon: BookOpen, label: 'Academic Resources' },
    { to: '/users', icon: Users, label: 'Users' },
    { to: '/notifications', icon: Bell, label: 'Notification' },
    { to: '/logs', icon: Activity, label: 'Audit Log' },
    { to: '/content-moderation-test', icon: Shield, label: 'Content AI Test' },
  ];

  return (
    <div className="bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white w-64 min-h-screen flex flex-col shadow-2xl">
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 rounded-lg p-2">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Admin Portal</h1>
            <p className="text-xs text-gray-400">Management System</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      {user && (
        <div className="px-4 py-3 bg-gray-800/50 mx-4 my-4 rounded-lg border border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
              {user.email?.[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user.displayName || 'Admin'}
              </p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Navigation - scrollable */}
      <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Logout Button - fixed at bottom */}
      <div className="p-4 border-t border-gray-700">
        <button
          onClick={logout}
          className="flex items-center space-x-3 px-4 py-3 w-full rounded-lg text-gray-300 hover:bg-red-600 hover:text-white transition-all duration-200 group"
        >
          <LogOut className="h-5 w-5 group-hover:animate-pulse" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;