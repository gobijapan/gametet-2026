export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-5xl font-black text-gold-shadow mb-8">
        ĐẠI MÃ KHAI XUÂN 2026
      </h1>
      <div className="flex gap-4 flex-wrap justify-center">
        <a 
          href="/login" 
          className="bg-gradient-to-br from-yellow-400 to-yellow-600 text-red-900 font-black text-xl px-8 py-4 rounded-2xl border-4 border-red-700 shadow-2xl hover:scale-105 transition-all"
        >
          ĐĂNG NHẬP
        </a>
        <a 
          href="/register" 
          className="bg-gradient-to-br from-red-600 to-red-800 text-yellow-300 font-black text-xl px-8 py-4 rounded-2xl border-4 border-yellow-500 shadow-2xl hover:scale-105 transition-all"
        >
          ĐĂNG KÝ
        </a>
      </div>
    </div>
  );
}
