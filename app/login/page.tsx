'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { auth, database } from '@/lib/firebase';

export default function LoginPage() {
  const router = useRouter();
  const [msnv, setMsnv] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
  
    // 1. Làm sạch input (Xóa khoảng trắng)
    const rawMSNV = msnv.trim();
  
    try {
      // 2. Định dạng cho Email: LUÔN VIẾT THƯỜNG (vì mail fake của mày là lowercase)
      const loginEmail = `${rawMSNV.toLowerCase()}@gametet.local`;
  
      // 3. Đăng nhập để lấy quyền
      await signInWithEmailAndPassword(auth, loginEmail, password);
  
      // 4. Định dạng cho Database: LUÔN VIẾT HOA (để khớp với DB của mày)
      const dbKey = rawMSNV.toUpperCase();
      const userRef = ref(database, `users/${dbKey}`);
      
      console.log("Truy vấn Database tại:", `users/${dbKey}`); // Debug xem có đúng chữ HOA không
      const snapshot = await get(userRef);
  
      if (!snapshot.exists()) {
        setError(`Không tìm thấy profile cho mã ${dbKey} trong hệ thống!`);
        return;
      }
  
      const userData = snapshot.val();
      const role = userData.role || 'player';
  
      // 5. Chuyển hướng
      if (role === 'admin') router.push('/admin');
      else if (role === 'mc') router.push('/mc');
      else router.push('/player');
  
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential') {
        setError('Mã số nhân viên hoặc mật khẩu không đúng!');
      } else {
        setError('Lỗi: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-red-800/95 to-red-900/95 backdrop-blur-md rounded-3xl p-6 md:p-8 border-4 border-yellow-500 shadow-2xl max-w-md w-full">
        <h1 className="text-3xl md:text-4xl font-black text-gold-shadow mb-6 text-center">
          ĐĂNG NHẬP
        </h1>

        <form onSubmit={handleLogin} className="space-y-4">
          {/* MSNV */}
          <div>
            <label className="block text-yellow-300 font-bold mb-2">
              Mã số nhân viên
            </label>
            <input
              type="text"
              value={msnv}
              onChange={(e) => setMsnv(e.target.value.toUpperCase())}
              placeholder="VD: NV001"
              className="w-full px-4 py-3 rounded-xl border-2 border-red-700 focus:outline-none focus:ring-4 focus:ring-yellow-400 text-red-900 font-bold uppercase"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-yellow-300 font-bold mb-2">
              Mật khẩu
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 border-2 border-red-700 rounded-lg focus:outline-none focus:ring-4 focus:ring-yellow-400 text-red-900 font-bold"
                placeholder="Nhập mật khẩu"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-red-700 hover:text-red-900 transition-colors"
              >
                {showPassword ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500 text-white px-4 py-3 rounded-xl font-bold">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-br from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-red-900 font-black text-xl px-8 py-4 rounded-2xl border-4 border-red-700 shadow-2xl transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'ĐANG XỬ LÝ...' : 'ĐĂNG NHẬP'}
          </button>
        </form>

        <p className="text-yellow-300 text-center mt-4">
          Chưa có tài khoản?{' '}
          <a href="/register" className="text-yellow-400 font-bold underline hover:text-yellow-200">
            Đăng ký ngay
          </a>
        </p>
      </div>
    </div>
  );
}
