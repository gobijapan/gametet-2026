'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, get, set } from 'firebase/database';
import { auth, database } from '@/lib/firebase';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [miniGameType, setMiniGameType] = useState<'afterQuestion' | 'afterEveryXQuestions'>('afterQuestion');
  const [miniGameValue, setMiniGameValue] = useState<string>('5');
  const [thanTaiType, setThanTaiType] = useState<'afterQuestion' | 'afterEveryXQuestions'>('afterQuestion');
  const [thanTaiValue, setThanTaiValue] = useState<string>('7,13');
  const [defaultTimer, setDefaultTimer] = useState(30);
  const [thanTaiCount, setThanTaiCount] = useState(10);
  const [miniGameDuration, setMiniGameDuration] = useState(30);
  const [coinPoints, setCoinPoints] = useState(50);
  const [goldPoints, setGoldPoints] = useState(100);
  const [bombPoints, setBombPoints] = useState(-100);
  const [coinRate, setCoinRate] = useState(50);
  const [goldRate, setGoldRate] = useState(30);
  const [bombRate, setBombRate] = useState(20);
  const [coinSpeed, setCoinSpeed] = useState(3);
  const [goldSpeed, setGoldSpeed] = useState(5);
  const [bombSpeed, setBombSpeed] = useState(2);
  const [spawnInterval, setSpawnInterval] = useState(0.5);
  const [topPlayerCount, setTopPlayerCount] = useState(5);
  const [miniGamePlayerCount, setMiniGamePlayerCount] = useState(20);

  // Check authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        router.push('/login');
        return;
      }

      const usersRef = ref(database, 'users');
      const snapshot = await get(usersRef);

      if (snapshot.exists()) {
        let foundUser: any = null;
        snapshot.forEach((childSnapshot) => {
          const userData = childSnapshot.val();
          if (userData.uid === firebaseUser.uid) {
            foundUser = { ...userData, maNV: childSnapshot.key };
          }
        });

        if (foundUser && foundUser.role === 'admin') {
          setUser(foundUser);
        } else {
          router.push('/player');
        }
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      const configRef = ref(database, 'config');
      const snapshot = await get(configRef);

      if (snapshot.exists()) {
        const config = snapshot.val();

        if (config.miniGameTrigger) {
          setMiniGameType(config.miniGameTrigger.type);
          setMiniGameValue(
            Array.isArray(config.miniGameTrigger.value)
              ? config.miniGameTrigger.value.join(',')
              : config.miniGameTrigger.value.toString()
          );
        }

        if (config.miniGame) {
          setMiniGameDuration(config.miniGame.duration || 30);
          setCoinPoints(config.miniGame.coinPoints || 50);
          setGoldPoints(config.miniGame.goldPoints || 100);
          setBombPoints(config.miniGame.bombPoints || -100);
          setCoinRate(config.miniGame.coinRate || 50);
          setGoldRate(config.miniGame.goldRate || 30);
          setBombRate(config.miniGame.bombRate || 20);
          setCoinSpeed(config.miniGame.coinSpeed || 3);
          setGoldSpeed(config.miniGame.goldSpeed || 5);
          setBombSpeed(config.miniGame.bombSpeed || 2);
          setSpawnInterval(config.miniGame.spawnInterval || 0.5);
        }

        if (config.thanTaiTrigger) {
          setThanTaiType(config.thanTaiTrigger.type);
          setThanTaiValue(
            Array.isArray(config.thanTaiTrigger.value)
              ? config.thanTaiTrigger.value.join(',')
              : config.thanTaiTrigger.value.toString()
          );
        }

        if (config.defaultTimer) {
          setDefaultTimer(config.defaultTimer);
        }

        if (config.thanTaiCount) {
          setThanTaiCount(config.thanTaiCount);
        }

        if (config.topPlayerCount) {
          setTopPlayerCount(config.topPlayerCount);
        }

        if (config.miniGamePlayerCount) {
          setMiniGamePlayerCount(config.miniGamePlayerCount);
        }
      }
    };

    loadSettings();
  }, []);

  // Handle save
  const handleSave = async () => {
    try {
      const configRef = ref(database, 'config');
      const existingConfig = await get(configRef);
      const currentConfig = existingConfig.exists() ? existingConfig.val() : {};

      const miniGameValueParsed = miniGameType === 'afterQuestion'
        ? miniGameValue.split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v))
        : parseInt(miniGameValue) || 5;

      const thanTaiValueParsed = thanTaiType === 'afterQuestion'
        ? thanTaiValue.split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v))
        : parseInt(thanTaiValue) || 5;

      await set(configRef, {
        ...currentConfig,
        miniGameTrigger: {
          type: miniGameType,
          value: miniGameValueParsed,
        },
        miniGame: { // ← THÊM
          duration: miniGameDuration,
          coinPoints,
          goldPoints,
          bombPoints,
          coinRate,
          goldRate,
          bombRate,
          coinSpeed,
          goldSpeed,
          bombSpeed,
          spawnInterval,
        },
        thanTaiCount,
        topPlayerCount,
        miniGamePlayerCount,
        defaultTimer,
      });

      toast.success('Đã lưu cài đặt!');
    } catch (error) {
      console.error(error);
      toast.error('Có lỗi xảy ra!');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600 text-xl font-bold">Đang tải...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-3xl font-black text-gray-800">Cài đặt Game</h1>
        <p className="text-gray-600 mt-1">Thiết lập Mini Game, Thần Tài, Timer</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Mini Game Settings - FULL */}
        <div className="bg-white rounded-xl shadow-lg p-6 col-span-2">
          <h2 className="text-xl font-black text-gray-800 mb-4 flex items-center gap-2">
            🎮 Cài đặt Mini Game
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Cột 1: Điểm số */}
            <div className="space-y-4">
              <h3 className="font-bold text-gray-700 border-b pb-2">Điểm số</h3>

              <div>
                <label className="block text-gray-700 font-semibold mb-2 text-sm">💰 Coin</label>
                <input
                  type="number"
                  value={coinPoints}
                  onChange={(e) => setCoinPoints(parseInt(e.target.value) || 50)}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 font-bold text-center"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2 text-sm">🏆 Đỉnh vàng</label>
                <input
                  type="number"
                  value={goldPoints}
                  onChange={(e) => setGoldPoints(parseInt(e.target.value) || 100)}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 font-bold text-center"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2 text-sm">💣 Bom (âm)</label>
                <input
                  type="number"
                  value={bombPoints}
                  onChange={(e) => setBombPoints(parseInt(e.target.value) || -100)}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 font-bold text-center"
                />
              </div>
            </div>

            {/* Cột 2: Tỷ lệ */}
            <div className="space-y-4">
              <h3 className="font-bold text-gray-700 border-b pb-2">Tỷ lệ xuất hiện (%)</h3>

              <div>
                <label className="block text-gray-700 font-semibold mb-2 text-sm">💰 Coin: {coinRate}%</label>
                <input
                  type="range"
                  min="10"
                  max="80"
                  value={coinRate}
                  onChange={(e) => setCoinRate(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2 text-sm">🏆 Đỉnh: {goldRate}%</label>
                <input
                  type="range"
                  min="10"
                  max="60"
                  value={goldRate}
                  onChange={(e) => setGoldRate(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2 text-sm">💣 Bom: {bombRate}%</label>
                <input
                  type="range"
                  min="5"
                  max="40"
                  value={bombRate}
                  onChange={(e) => setBombRate(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <p className="text-xs text-gray-500">
                Tổng: {coinRate + goldRate + bombRate}% (nên = 100%)
              </p>
            </div>

            {/* Cột 3: Tốc độ */}
            <div className="space-y-4">
              <h3 className="font-bold text-gray-700 border-b pb-2">Tốc độ & Thời gian</h3>

              <div>
                <label className="block text-gray-700 font-semibold mb-2 text-sm">⏱️ Thời gian chơi (giây)</label>
                <input
                  type="number"
                  min="10"
                  max="60"
                  value={miniGameDuration}
                  onChange={(e) => setMiniGameDuration(parseInt(e.target.value) || 30)}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 font-bold text-center"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2 text-sm">🎯 Spawn mỗi (giây): {spawnInterval}s</label>
                <input
                  type="range"
                  min="0.2"
                  max="2"
                  step="0.1"
                  value={spawnInterval}
                  onChange={(e) => setSpawnInterval(parseFloat(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Càng nhỏ = Spawn càng nhiều (~{Math.floor(miniGameDuration / spawnInterval)} vật)
                </p>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2 text-sm">⚡ Tốc độ Coin (giây): {coinSpeed}s</label>
                <input
                  type="range"
                  min="1"
                  max="6"
                  step="0.5"
                  value={coinSpeed}
                  onChange={(e) => setCoinSpeed(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2 text-sm">⚡ Tốc độ Đỉnh (giây): {goldSpeed}s</label>
                <input
                  type="range"
                  min="2"
                  max="8"
                  step="0.5"
                  value={goldSpeed}
                  onChange={(e) => setGoldSpeed(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2 text-sm">⚡ Tốc độ Bom (giây): {bombSpeed}s</label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="0.5"
                  value={bombSpeed}
                  onChange={(e) => setBombSpeed(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Thần Tài - CHỈ CÓ SỐ LƯỢNG */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-black text-gray-800 mb-4 flex items-center gap-2">
            🧧 Thần Tài Gõ Cửa
          </h2>

          <div>
            <label className="block text-gray-700 font-bold mb-2">Số lượng người được chọn</label>
            <input
              type="number"
              min="1"
              max="50"
              value={thanTaiCount}
              onChange={(e) => setThanTaiCount(parseInt(e.target.value) || 10)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 font-bold text-2xl text-center"
            />
            <p className="text-sm text-gray-500 mt-2 text-center">
              Random {thanTaiCount} người từ danh sách online
            </p>
          </div>
        </div>

        {/* Leaderboard Settings */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-black text-gray-800 mb-4 flex items-center gap-2">
            🏆 Bảng Xếp Hạng
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 font-bold mb-2">Số lượng Top Player</label>
              <input
                type="number"
                min="1"
                max="20"
                value={topPlayerCount}
                onChange={(e) => setTopPlayerCount(parseInt(e.target.value) || 5)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 font-bold text-2xl text-center"
              />
              <p className="text-sm text-gray-500 mt-2 text-center">
                Hiển thị Top {topPlayerCount} người nhanh nhất
              </p>
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-2">Số người hiển thị trên bảng xếp hạng Mini Game</label>
              <input
                type="number"
                min="1"
                max="100"
                value={miniGamePlayerCount}
                onChange={(e) => setMiniGamePlayerCount(parseInt(e.target.value) || 20)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 font-bold text-2xl text-center"
              />
              <p className="text-sm text-gray-500 mt-2 text-center">
                Hiển thị Top {miniGamePlayerCount} người trên bảng xếp hạng (Tất cả đều chơi được)
              </p>
            </div>
          </div>
        </div>

        {/* Timer mặc định */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-black text-gray-800 mb-4 flex items-center gap-2">
            ⏱️ Timer mặc định
          </h2>

          <div>
            <label className="block text-gray-700 font-bold mb-2">Thời gian (giây)</label>
            <input
              type="number"
              min="10"
              max="120"
              value={defaultTimer}
              onChange={(e) => setDefaultTimer(parseInt(e.target.value) || 30)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 font-bold text-2xl text-center"
            />
            <p className="text-sm text-gray-500 mt-2 text-center">
              Timer mặc định cho câu hỏi mới
            </p>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="mt-6">
        <button
          onClick={handleSave}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-black text-xl px-8 py-4 rounded-xl shadow-2xl transform hover:scale-105 transition-all"
        >
          💾 Lưu tất cả cài đặt
        </button>
      </div>
    </div>
  );
}