'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

interface GameHUDProps {
    user: any;
    totalCorrect: number;
    totalWrong: number;
    totalQuestions: number;
    totalAnswered: number;
    canRingBell: boolean;
    onRingBell: () => void;
}

export default function GameHUD({
    user,
    totalCorrect,
    totalWrong,
    totalQuestions,
    totalAnswered,
    canRingBell,
    onRingBell,
}: GameHUDProps) {
    const [isInfoExpanded, setIsInfoExpanded] = useState(true);

    return (
        <>
            {/* Bell Button - Left Side, Vertically Centered */}
            <button
                onClick={onRingBell}
                disabled={!canRingBell}
                className={`fixed left-3 md:left-4 top-1/2 -translate-y-1/2 z-[20]
    w-[90px] h-[90px] md:w-[110px] md:h-[110px]
    rounded-full
    border-4 border-yellow-300
    shadow-[0_22px_60px_rgba(0,0,0,0.45)]
    transition-all ${canRingBell
                        ? "bg-gradient-to-br from-[#b40000] via-[#8b0000] to-[#2a0000] hover:scale-110 active:scale-95"
                        : "bg-slate-700 opacity-50 cursor-not-allowed"
                    }`}
            >
                <div className="absolute inset-0 rounded-full pointer-events-none bg-[radial-gradient(circle_at_top,rgba(255,215,0,0.25),transparent_55%)]" />
                <div className="absolute inset-0 rounded-full pointer-events-none opacity-[0.14] bg-[repeating-linear-gradient(60deg,rgba(255,215,0,0.55)_0,rgba(255,215,0,0.55)_1px,transparent_1px,transparent_12px)]" />

                <div className="relative w-full h-full flex items-center justify-center">
                    {/* Bell SVG Icon */}
                    <svg
                        className="w-12 h-12 md:w-16 md:h-16"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                        style={{ color: canRingBell ? '#fef08a' : '#94a3b8' }}
                    >
                        <path d="M12 2c-1.7 0-3 1.3-3 3v.3C6.4 6.1 4 8.8 4 12v4l-2 2v1h20v-1l-2-2v-4c0-3.2-2.4-5.9-5-6.7V5c0-1.7-1.3-3-3-3zm0 20c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2z" />
                    </svg>
                </div>
            </button>

            {/* =========================
   HUD: INFO - Collapsible Top-Right
========================= */}
            <motion.div
                initial={false}
                animate={{ x: isInfoExpanded ? '0%' : '100%' }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="fixed right-0 top-[85px] md:top-[120px] z-[50] flex items-start"
            >
                {/* Toggle Button (shifts with panel) */}
                <button
                    onClick={() => setIsInfoExpanded(!isInfoExpanded)}
                    className="bg-gradient-to-br from-yellow-400 to-yellow-600 text-red-950 
              rounded-l-xl p-2 md:p-3 font-black border-l-2 border-y-2 border-red-900 
              shadow-lg mt-2 md:mt-4 hover:brightness-110 flex items-center justify-center
              absolute left-[-32px] md:left-[-40px] w-[34px] md:w-[42px]"
                    title={isInfoExpanded ? "Thu gọn" : "Mở rộng"}
                >
                    {isInfoExpanded ? "▶" : "◀"}
                </button>

                {/* Main Panel */}
                <div className="
            w-[200px] md:w-[260px] 
            bg-gradient-to-br from-[#2a0000] via-[#5a0000] to-[#b40000] 
            border-l-4 border-y-4 border-yellow-300 
            rounded-bl-3xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] 
            overflow-hidden
          ">
                    <div className="relative p-3 md:p-4">
                        {/* Pattern overlay */}
                        <div className="absolute inset-0 pointer-events-none opacity-[0.10] bg-[repeating-linear-gradient(120deg,rgba(255,255,255,0.22)_0,rgba(255,255,255,0.22)_1px,transparent_1px,transparent_10px)]" />

                        {user && (
                            <div className="relative z-10 bg-gradient-to-br from-yellow-200 to-yellow-500 rounded-2xl border-2 border-yellow-100 p-2 md:p-3 shadow-md mb-3">
                                <p className="text-red-950 font-black text-sm md:text-base leading-tight truncate">
                                    {user.name}
                                </p>
                                <p className="text-red-900/80 font-extrabold text-[10px] md:text-xs uppercase tracking-[0.18em]">
                                    {user.maNV}
                                </p>
                            </div>
                        )}

                        <div className="relative z-10 bg-[#fff2d2]/95 rounded-2xl border-2 border-yellow-300/70 p-2 md:p-3">
                            <div className="flex items-center justify-between font-black text-sm md:text-base">
                                <div className="flex flex-col items-center">
                                    <span className="text-emerald-700 text-lg md:text-xl">{totalCorrect}</span>
                                    <span className="text-[8px] md:text-[10px] uppercase text-emerald-900/70">Đúng</span>
                                </div>
                                <div className="w-[1px] h-8 bg-black/10"></div>
                                <div className="flex flex-col items-center">
                                    <span className="text-red-700 text-lg md:text-xl">{totalWrong}</span>
                                    <span className="text-[8px] md:text-[10px] uppercase text-red-900/70">Sai</span>
                                </div>
                                <div className="w-[1px] h-8 bg-black/10"></div>
                                <div className="flex flex-col items-center">
                                    <span className="text-slate-700 text-lg md:text-xl">{totalQuestions - totalAnswered}</span>
                                    <span className="text-[8px] md:text-[10px] uppercase text-slate-700/70">Chưa</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </>
    );
}
