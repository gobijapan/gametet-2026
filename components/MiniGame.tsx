'use client';

import { useEffect, useRef, useState } from 'react';

interface MiniGameProps {
  duration: number;
  coinPoints: number;
  goldPoints: number;
  bombPoints: number;
  coinSpeed: number;
  goldSpeed: number;
  bombSpeed: number;
  spawnInterval: number;
  coinRate: number;
  goldRate: number;
  bombRate: number;
  onGameEnd: (score: number, stats: any) => void;
}

interface FallingItem {
  id: number;
  type: 'coin' | 'gold' | 'bomb';
  x: number;
  y: number;
  speed: number;
  points: number;
}

export default function MiniGame({
  duration,
  coinPoints,
  goldPoints,
  bombPoints,
  coinSpeed,
  goldSpeed,
  bombSpeed,
  spawnInterval,
  coinRate,
  goldRate,
  bombRate,
  onGameEnd,
}: MiniGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [timeLeft, setTimeLeft] = useState(duration);
  const [score, setScore] = useState(0);
  const [stats, setStats] = useState({
    coins: 0,
    golds: 0,
    bombs: 0,
  });
  const [basketX, setBasketX] = useState(0);

  const gameStateRef = useRef({
    items: [] as FallingItem[],
    nextId: 0,
    lastSpawn: 0,
    isRunning: true,
    basketX: 0,
    basketDirection: 'right' as 'left' | 'right',
    lastBasketX: 0,
  });

  const coinSoundRef = useRef<HTMLAudioElement | null>(null);
  const bombSoundRef = useRef<HTMLAudioElement | null>(null);

  // Initialize sounds
  useEffect(() => {
    coinSoundRef.current = new Audio('/sounds/coin-sound.mp3');
    bombSoundRef.current = new Audio('/sounds/bomb-sound.mp3');

    // Preload
    coinSoundRef.current.load();
    bombSoundRef.current.load();
  }, []);

  // Initialize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const updateSize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      gameStateRef.current.basketX = canvas.width / 2;
      setBasketX(canvas.width / 2);
    };
    updateSize();
    window.addEventListener('resize', updateSize);

    // Load images
    const coinImg = new Image();
    coinImg.src = '/coin.png';
    const goldImg = new Image();
    goldImg.src = '/gold-bar.png';
    const bombImg = new Image();
    bombImg.src = '/bomb.png';
    const basketImg = new Image();
    basketImg.src = '/basket.png';

    // Spawn item function (moved here for clarity)
    const spawnItem = () => {
      // ... same spawn logic
      const rand = Math.random() * 100;
      let type: 'coin' | 'gold' | 'bomb';
      let speed: number;
      let points: number;

      if (rand < coinRate) {
        type = 'coin';
        speed = canvas.height / (coinSpeed * 60);
        points = coinPoints;
      } else if (rand < coinRate + goldRate) {
        type = 'gold';
        speed = canvas.height / (goldSpeed * 60);
        points = goldPoints;
      } else {
        type = 'bomb';
        speed = canvas.height / (bombSpeed * 60);
        points = bombPoints;
      }

      gameStateRef.current.items.push({
        id: gameStateRef.current.nextId++,
        type,
        x: Math.random() * (canvas.width - 60) + 30,
        y: -60,
        speed,
        points,
      });
    };

    // Game loop
    let animationId: number;
    let lastTime = Date.now();

    const gameLoop = () => {
      if (!gameStateRef.current.isRunning) return;

      const now = Date.now();
      const deltaTime = (now - lastTime) / 1000;
      lastTime = now;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Spawn items
      gameStateRef.current.lastSpawn += deltaTime;
      if (gameStateRef.current.lastSpawn >= spawnInterval) {
        spawnItem();
        gameStateRef.current.lastSpawn = 0;
      }

      // Update and draw items
      const basketWidth = 180;
      const basketHeight = 200;
      const basketY = canvas.height - 180;

      gameStateRef.current.items = gameStateRef.current.items.filter((item) => {
        item.y += item.speed;

        // Check collision with basket
        if (
          item.y + 30 >= basketY &&
          item.y <= basketY + basketHeight &&
          item.x + 30 >= gameStateRef.current.basketX - basketWidth / 2 &&
          item.x <= gameStateRef.current.basketX + basketWidth / 2
        ) {
          // Caught!
          setScore((prev) => prev + item.points);

          if (item.type === 'coin') {
            setStats((prev) => ({ ...prev, coins: prev.coins + 1 }));

            if (coinSoundRef.current) {
              coinSoundRef.current.currentTime = 0;
              coinSoundRef.current.play().catch(() => { });
            }
          } else if (item.type === 'gold') {
            setStats((prev) => ({ ...prev, golds: prev.golds + 1 }));

            if (coinSoundRef.current) {
              coinSoundRef.current.currentTime = 0;
              coinSoundRef.current.play().catch(() => { });
            }
          } else {
            setStats((prev) => ({ ...prev, bombs: prev.bombs + 1 }));

            if (bombSoundRef.current) {
              bombSoundRef.current.currentTime = 0;
              bombSoundRef.current.play().catch(() => { });
            }
          }

          return false; // Remove item
        }

        // Remove if out of screen
        if (item.y > canvas.height) {
          return false;
        }

        // Draw item
        const img = item.type === 'coin' ? coinImg : item.type === 'gold' ? goldImg : bombImg;

        // Kích thước theo loại
        let itemWidth = 60;
        let itemHeight = 60;

        if (item.type === 'coin') {
          itemWidth = 50;   // ← CHỈNH Ở ĐÂY (Coin nhỏ hơn)
          itemHeight = 50;
        } else if (item.type === 'gold') {
          itemWidth = 70;   // ← CHỈNH Ở ĐÂY (Đỉnh vàng to hơn)
          itemHeight = 70;
        } else {
          itemWidth = 60;   // ← CHỈNH Ở ĐÂY (Bom vừa)
          itemHeight = 60;
        }

        if (img.complete) {
          ctx.drawImage(img, item.x, item.y, itemWidth, itemHeight);
        } else {
          // Fallback
          ctx.fillStyle = item.type === 'coin' ? '#FFD700' : item.type === 'gold' ? '#FFA500' : '#FF0000';
          ctx.beginPath();
          ctx.arc(item.x + itemWidth / 2, item.y + itemHeight / 2, itemWidth / 2, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#000';
          ctx.font = 'bold 20px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(item.type === 'coin' ? '🪙' : item.type === 'gold' ? '💰' : '💣', item.x + itemWidth / 2, item.y + itemHeight / 2 + 7);
        }

        return true;
      });

      // Draw basket (ngựa chibi)
      const basketImgHeight = 250; // Cao hơn để thấy cả ngựa
      const basketImgY = basketY - (basketImgHeight - basketHeight);

      if (basketImg.complete) {
        ctx.save();

        const direction = gameStateRef.current.basketDirection;

        if (direction === 'left') {
          // Flip ngang khi di chuyển sang trái
          ctx.translate(gameStateRef.current.basketX, basketImgY);
          ctx.scale(-1, 1);
          ctx.drawImage(
            basketImg,
            -basketWidth / 2,
            0,
            basketWidth,
            basketImgHeight
          );
        } else {
          // Bình thường khi di chuyển sang phải
          ctx.drawImage(
            basketImg,
            gameStateRef.current.basketX - basketWidth / 2,
            basketImgY,
            basketWidth,
            basketImgHeight
          );
        }

        ctx.restore();
      } else {
        // Fallback nếu ảnh chưa load
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(
          gameStateRef.current.basketX - basketWidth / 2,
          basketY,
          basketWidth,
          basketHeight
        );

        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.strokeRect(
          gameStateRef.current.basketX - basketWidth / 2,
          basketY,
          basketWidth,
          basketHeight
        );
      }

      animationId = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    // Mouse control (Desktop)
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const newX = e.clientX - rect.left;

      // Xác định hướng di chuyển
      if (newX < gameStateRef.current.basketX) {
        gameStateRef.current.basketDirection = 'left';
      } else if (newX > gameStateRef.current.basketX) {
        gameStateRef.current.basketDirection = 'right';
      }

      gameStateRef.current.basketX = newX;
      setBasketX(newX);
    };

    // Touch control (Mobile)
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      const newX = touch.clientX - rect.left;

      // Xác định hướng
      if (newX < gameStateRef.current.basketX) {
        gameStateRef.current.basketDirection = 'left';
      } else if (newX > gameStateRef.current.basketX) {
        gameStateRef.current.basketDirection = 'right';
      }

      gameStateRef.current.basketX = newX;
      setBasketX(newX);
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });

    // Timer
    const timerInterval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          gameStateRef.current.isRunning = false;
          clearInterval(timerInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      cancelAnimationFrame(animationId);
      clearInterval(timerInterval);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('resize', updateSize);
    };
  }, [duration, coinPoints, goldPoints, bombPoints, coinSpeed, goldSpeed, bombSpeed, spawnInterval, coinRate, goldRate, bombRate]);

  // Game end
  useEffect(() => {
    if (timeLeft === 0 && gameStateRef.current.isRunning === false) {
      onGameEnd(score, stats);
    }
  }, [timeLeft, score, stats, onGameEnd]);

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 px-4 py-3 flex items-center justify-between rounded-t-2xl">
        <div className="flex gap-4 text-white font-bold text-sm">
          <span>🪙 {stats.coins}</span>
          <span>💰 {stats.golds}</span>
          <span>💣 {stats.bombs}</span>
        </div>

        <div className={`text-3xl font-black px-4 py-1 rounded-full ${timeLeft <= 5 ? 'bg-red-600 text-yellow-300 animate-pulse' : 'bg-yellow-400 text-red-900'
          }`}>
          {timeLeft}s
        </div>

        <div className="text-white font-black text-2xl">
          {score}
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="flex-1 bg-gradient-to-b from-sky-400 to-sky-200 cursor-none"
        style={{ minHeight: '400px' }}
      />
    </div>
  );
}