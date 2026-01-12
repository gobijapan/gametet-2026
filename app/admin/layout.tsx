import AdminSidebar from '@/components/AdminSidebar';
import { Toaster } from 'react-hot-toast';

export const metadata = {
  title: 'Admin Panel - Game Tết 2025',
  description: 'Quản lý game Tết',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar />
      <div className="ml-20 lg:ml-64 transition-all duration-300">
        <main className="p-6">
          {children}
        </main>
      </div>
      <Toaster position="top-right" />
    </div>
  );
}