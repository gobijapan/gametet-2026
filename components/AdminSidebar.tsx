'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  FiHome, 
  FiHelpCircle, 
  FiUsers, 
  FiTarget, 
  FiSettings,
  FiMenu,
  FiX,
  FiLogOut
} from 'react-icons/fi';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

const menuItems = [
  { path: '/admin', icon: FiHome, label: 'Dashboard' },
  { path: '/admin/questions', icon: FiHelpCircle, label: 'Quản lý câu hỏi' },
  { path: '/admin/employees', icon: FiUsers, label: 'Quản lý nhân viên' },
  { path: '/admin/secret-word', icon: FiTarget, label: 'Thiết lập Ô Bí Ẩn' },
  { path: '/admin/settings', icon: FiSettings, label: 'Cài đặt Game' },
];

import { FiMonitor, FiTv } from 'react-icons/fi';

const viewPages = [
  { path: '/player', icon: FiMonitor, label: 'Xem trang Player' },
  { path: '/mc', icon: FiTv, label: 'Xem trang MC' },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  return (
    <>
      {/* Sidebar */}
      <div className={`fixed top-0 left-0 h-full bg-gradient-to-b from-gray-900 to-gray-800 text-white shadow-2xl transition-all duration-300 z-50 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}>
        
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          {!isCollapsed && (
            <h2 className="text-xl font-black bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              ADMIN PANEL
            </h2>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            {isCollapsed ? <FiMenu size={24} /> : <FiX size={24} />}
          </button>
        </div>

        {/* Menu */}
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;
            
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                    : 'hover:bg-gray-700 text-gray-300 hover:text-white'
                }`}
                title={isCollapsed ? item.label : ''}
              >
                <Icon size={24} className="flex-shrink-0" />
                {!isCollapsed && (
                  <span className="font-semibold">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Divider */}
        <div className="my-4 border-t border-gray-700"></div>

        {/* View pages */}
        {viewPages.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path;
          
          return (
            <Link
              key={item.path}
              href={item.path}
              target="_blank" // ← MỞ TAB MỚI
              rel="noopener noreferrer"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg'
                  : 'hover:bg-gray-700 text-gray-300 hover:text-white'
              }`}
              title={isCollapsed ? item.label : ''}
            >
              <Icon size={24} className="flex-shrink-0" />
              {!isCollapsed && (
                <span className="font-semibold">{item.label}</span>
              )}
            </Link>
          );
        })}

        {/* Logout */}
        <div className="absolute bottom-4 left-0 right-0 px-4">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-600 transition-all w-full text-gray-300 hover:text-white"
            title={isCollapsed ? 'Đăng xuất' : ''}
          >
            <FiLogOut size={24} className="flex-shrink-0" />
            {!isCollapsed && (
              <span className="font-semibold">Đăng xuất</span>
            )}
          </button>
        </div>
      </div>

      {/* Overlay for mobile */}
      {!isCollapsed && (
        <div 
          className="fixed inset-0 bg-black/50 lg:hidden z-40"
          onClick={() => setIsCollapsed(true)}
        />
      )}
    </>
  );
}