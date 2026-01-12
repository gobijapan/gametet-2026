'use client';

import { useEffect, useState } from 'react';

interface Props {
  onTimeout: () => void;
}

export default function MiniGameChoiceTimer({ onTimeout }: Props) {
  const [timeLeft, setTimeLeft] = useState(10);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onTimeout]);

  return (
    <div className="flex items-center justify-center gap-3">
      <span className="text-yellow-200 font-bold text-lg">
        Thời gian quyết định:
      </span>
      <div className={`text-3xl font-black px-4 py-2 rounded-full ${
        timeLeft <= 3 ? 'bg-red-600 text-yellow-300 animate-pulse' : 'bg-yellow-400 text-red-900'
      }`}>
        {timeLeft}s
      </div>
    </div>
  );
}