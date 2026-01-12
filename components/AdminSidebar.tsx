'use client';

import { ref, remove } from 'firebase/database';
import { database } from '@/lib/firebase';
import toast from 'react-hot-toast';
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
  const [showResetModal, setShowResetModal] = useState(false);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const handleResetGame = async () => {
  setShowResetModal(false);
  
  const loadingToast = toast.loading('Đang reset game...');
  
  try {
    await Promise.all([
      remove(ref(database, 'game')),
      remove(ref(database, 'answers')),
      remove(ref(database, 'results')),
      remove(ref(database, 'bellQueue')),
      remove(ref(database, 'playerStats')),
      remove(ref(database, 'online')),
    ]);

    toast.success('✅ Đã reset game thành công!', { id: loadingToast });
    
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  } catch (error) {
    console.error(error);
    toast.error('❌ Có lỗi xảy ra khi reset!', { id: loadingToast });
  }
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

        {/* Reset Game */}
        <div className="absolute bottom-20 left-0 right-0 px-4">
          <button
            onClick={() => setShowResetModal(true)}
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-600/20 transition-all w-full text-red-400 hover:text-red-300 border-2 border-red-600/30 hover:border-red-500"
            title={isCollapsed ? 'Reset Game' : ''}
          >
            <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {!isCollapsed && (
              <span className="font-semibold">Reset Game</span>
            )}
          </button>
        </div>

        {/* Reset confirm modal */}
        {showResetModal && (
          <div 
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999]" 
            onClick={() => setShowResetModal(false)}
          >
            <div 
              className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border-4 border-red-500 shadow-2xl max-w-md w-full mx-4" 
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-black text-red-400 mb-3">
                  RESET GAME
                </h2>
                <p className="text-white font-bold leading-relaxed mb-2">
                  Bạn có chắc chắn muốn reset game?
                </p>
                <p className="text-red-300 text-sm font-semibold">
                  Hành động này sẽ xóa tất cả đáp án, kết quả, rung chuông!
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleResetGame}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black text-lg px-6 py-4 rounded-lg shadow-xl transform hover:scale-105 transition-all"
                >
                  XÁC NHẬN
                </button>
                <button
                  onClick={() => setShowResetModal(false)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-black text-lg px-6 py-4 rounded-lg"
                >
                  HỦY
                </button>
              </div>
            </div>
          </div>
        )}

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