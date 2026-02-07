'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useRef, useEffect } from 'react';
import confetti from 'canvas-confetti';
import MiniGame from '@/components/MiniGame';
import MiniGameChoiceTimer from '@/components/MiniGameChoiceTimer';

interface GameOverlaysProps {
    // Countdown
    isCountingDown: boolean;
    countdown: number;

    // Confirm Submit
    showConfirmModal: boolean;
    onConfirmSubmit: () => void;
    onCancelSubmit: () => void;

    // Confirm Bell
    showBellConfirmModal: boolean;
    onConfirmBell: () => void;
    onCancelBell: () => void;

    // Success
    showSuccessModal: boolean;
    successMessage: string;

    // Mini Game
    isMiniGameActive: boolean;
    showMiniGameChoice: boolean;
    miniGameCountdown: number;
    isMiniGamePlaying: boolean;
    showMiniGameResult: boolean;
    miniGameScore: number;
    miniGameStats: { coins: number; golds: number; bombs: number };
    miniGameConfig: any;
    showSkipConfirm: boolean;
    showResultCloseConfirm: boolean;
    onStartMiniGame: () => void;
    onMiniGameComplete: (score: number, stats: any) => void;
    onMiniGameTimeEnd: () => void; // when choice timer ends
    onSkipMiniGame: () => void;
    onCloseMiniGameResult: () => void;
    setShowSkipConfirm: (show: boolean) => void;
    setShowResultCloseConfirm: (show: boolean) => void;

    // Than Tai
    isThanTaiActive: boolean;
    isThanTaiWinner: boolean;
    showDoor: boolean;
    isDoorOpen: boolean;
    onOpenDoor: () => void;
    onCloseThanTai: () => void;
}

export default function GameOverlays({
    isCountingDown,
    countdown,
    showConfirmModal,
    onConfirmSubmit,
    onCancelSubmit,
    showBellConfirmModal,
    onConfirmBell,
    onCancelBell,
    showSuccessModal,
    successMessage,
    isMiniGameActive,
    showMiniGameChoice,
    miniGameCountdown,
    isMiniGamePlaying,
    showMiniGameResult,
    miniGameScore,
    miniGameStats,
    miniGameConfig,
    showSkipConfirm,
    showResultCloseConfirm,
    onStartMiniGame,
    onMiniGameComplete,
    onMiniGameTimeEnd,
    onSkipMiniGame,
    onCloseMiniGameResult,
    setShowSkipConfirm,
    setShowResultCloseConfirm,
    isThanTaiActive,
    isThanTaiWinner,
    showDoor,
    isDoorOpen,
    onOpenDoor,
    onCloseThanTai,
}: GameOverlaysProps) {

    // Confetti effect for Than Tai
    useEffect(() => {
        if (isDoorOpen && isThanTaiWinner) {
            const duration = 5 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 60 };

            const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

            const interval: any = setInterval(function () {
                const timeLeft = animationEnd - Date.now();

                if (timeLeft <= 0) {
                    return clearInterval(interval);
                }

                const particleCount = 50 * (timeLeft / duration);
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
            }, 250);

            return () => clearInterval(interval);
        }
    }, [isDoorOpen, isThanTaiWinner]);

    // Keyboard shortcuts for modals (Safe Instant Access - 50ms buffer)
    useEffect(() => {
        let isReady = false;
        // 50ms buffer to prevent double-trigger from initial KeyDown bubble
        const timer = setTimeout(() => { isReady = true; }, 50);

        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isReady) return;

            if (showConfirmModal) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    onConfirmSubmit();
                } else if (e.key === 'Escape') {
                    onCancelSubmit();
                }
            } else if (showBellConfirmModal) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    onConfirmBell();
                } else if (e.key === 'Escape') {
                    onCancelBell();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            clearTimeout(timer);
        };
    }, [showConfirmModal, showBellConfirmModal, onConfirmSubmit, onCancelSubmit, onConfirmBell, onCancelBell]);


    return (
        <>
            {/* 1. COUNTDOWN START GAME (3..2..1) */}
            <AnimatePresence>
                {isCountingDown && countdown > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
                    >
                        <motion.div
                            key={countdown}
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1.5, opacity: 1 }}
                            exit={{ scale: 2, opacity: 0 }}
                            transition={{ duration: 0.8 }}
                            className="text-[#ffed00] font-black text-[120px] md:text-[200px] drop-shadow-[0_0_30px_rgba(255,237,0,0.8)]"
                        >
                            {countdown}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 2. MODAL XÁC NHẬN NỘP BÀI */}
            <AnimatePresence>
                {showConfirmModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.8 }}
                            className="bg-white rounded-2xl p-6 md:p-8 max-w-sm w-full text-center border-4 border-yellow-400"
                        >
                            <h3 className="text-xl md:text-2xl font-black text-red-900 mb-4 uppercase">
                                Xác nhận gửi ?
                            </h3>
                            <p className="text-gray-600 mb-6 font-medium">
                                Bạn có chắc chắn muốn gửi đáp án này không?<br />
                                Sau khi gửi sẽ <span className="text-red-600 font-bold">không thể sửa lại</span>.
                            </p>
                            <div className="flex gap-4 justify-center font-bold">
                                <button
                                    onClick={onCancelSubmit}
                                    className="px-6 py-2 rounded-xl bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={onConfirmSubmit}
                                    className="px-6 py-2 rounded-xl bg-gradient-to-tr from-red-600 to-red-500 text-white hover:brightness-110 shadow-lg"
                                >
                                    Gửi ngay
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 3. MODAL XÁC NHẬN RUNG CHUÔNG */}
            <AnimatePresence>
                {showBellConfirmModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.8 }}
                            className="bg-white rounded-2xl p-6 md:p-8 max-w-sm w-full text-center border-4 border-yellow-400"
                        >
                            <h3 className="text-xl md:text-2xl font-black text-red-900 mb-4 uppercase">
                                Xác nhận rung chuông?
                            </h3>
                            <p className="text-gray-600 mb-6 font-medium">
                                Bạn có chắc chắn muốn rung chuông giành quyền trả lời không?<br />
                                <span className="text-red-600 font-bold text-sm">(Chỉ được rung 1 lần duy nhất!)</span>
                            </p>
                            <div className="flex gap-4 justify-center font-bold">
                                <button
                                    onClick={onCancelBell}
                                    className="px-6 py-2 rounded-xl bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={onConfirmBell}
                                    className="px-6 py-2 rounded-xl bg-gradient-to-tr from-yellow-500 to-yellow-400 text-red-900 border border-yellow-300 hover:brightness-110 shadow-lg"
                                >
                                    Rung ngay
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 4. SUCCESS MODAL */}
            <AnimatePresence>
                {showSuccessModal && (
                    <motion.div
                        initial={{ opacity: 0, x: 100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 100 }}
                        className="fixed bottom-6 right-6 z-[100] bg-white border-l-4 border-emerald-500 shadow-2xl rounded-r-lg p-4 md:p-6 flex items-center gap-4"
                    >
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <div>
                            <p className="font-bold text-gray-800 text-sm md:text-base">Thành công!</p>
                            <p className="text-gray-600 text-xs md:text-sm">{successMessage}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 5. MINI GAME & THAN TAI */}
            {/* Mini Game */}
            <AnimatePresence>
                {isMiniGameActive && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
                    >
                        {/* SCREEN 1: CHOICE + CONFIRM */}
                        {showMiniGameChoice && (
                            <div className="flex flex-col items-center">
                                <MiniGameChoiceTimer
                                    onTimeout={onMiniGameTimeEnd}
                                />
                                <button
                                    onClick={onStartMiniGame}
                                    className="mt-8 px-12 py-4 bg-gradient-to-b from-yellow-400 to-yellow-600 text-red-900 font-black text-2xl rounded-full border-4 border-yellow-200 shadow-[0_0_30px_rgba(255,215,0,0.6)] hover:scale-105 active:scale-95 transition-transform"
                                >
                                    THAM GIA NGAY
                                </button>
                                <button
                                    onClick={() => setShowSkipConfirm(true)}
                                    className="mt-4 px-8 py-2 text-gray-400 font-bold hover:text-white transition-colors"
                                >
                                    Bỏ qua
                                </button>

                                {/* Confirm Skip Modal */}
                                {showSkipConfirm && (
                                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80">
                                        <div className="bg-white p-6 rounded-2xl text-center max-w-sm mx-4">
                                            <h3 className="font-black text-red-600 text-xl mb-2">BẠN CHẮC CHẮN?</h3>
                                            <p className="mb-6 font-medium text-gray-700">Nếu bỏ qua, bạn sẽ mất cơ hội nhận điểm thưởng từ Mini Game này!</p>
                                            <div className="flex gap-3 justify-center">
                                                <button
                                                    onClick={() => setShowSkipConfirm(false)}
                                                    className="px-4 py-2 bg-gray-200 rounded-lg font-bold"
                                                >
                                                    Quay lại
                                                </button>
                                                <button
                                                    onClick={onSkipMiniGame}
                                                    className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold"
                                                >
                                                    Bỏ qua luôn
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* SCREEN 2: COUNTDOWN */}
                        {!showMiniGameChoice && !isMiniGamePlaying && !showMiniGameResult && (
                            <motion.div
                                key={miniGameCountdown}
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1.5, opacity: 1 }}
                                exit={{ scale: 2, opacity: 0 }}
                                className="text-yellow-400 font-black text-[150px]"
                            >
                                {miniGameCountdown}
                            </motion.div>
                        )}

                        {/* SCREEN 3: PLAYING */}
                        {isMiniGamePlaying && miniGameConfig && (
                            <MiniGame
                                {...miniGameConfig}
                                onGameEnd={onMiniGameComplete}
                            />
                        )}

                        {/* SCREEN 4: RESULT */}
                        {showMiniGameResult && (
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="bg-gradient-to-b from-indigo-900 to-purple-900 p-8 rounded-3xl border-4 border-yellow-400 text-center max-w-md w-full relative"
                            >
                                <div className="absolute -top-16 left-1/2 -translate-x-1/2">
                                    <div className="text-6xl animate-bounce">🏆</div>
                                </div>

                                <h2 className="text-3xl md:text-4xl font-black text-yellow-300 mt-8 mb-2">KẾT QUẢ</h2>
                                <div className="text-6xl md:text-7xl font-black text-white mb-6 drop-shadow-[0_4px_0_rgba(0,0,0,0.5)]">
                                    {miniGameScore > 0 ? `+${miniGameScore}` : miniGameScore}
                                </div>

                                <div className="grid grid-cols-3 gap-2 mb-8 bg-black/20 p-4 rounded-xl">
                                    <div className="text-center">
                                        <div className="text-2xl text-white">🪙 XU</div>
                                        <div className="font-bold text-white">x{miniGameStats.coins}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl text-white">💰 VÀNG</div>
                                        <div className="font-bold text-yellow-300">x{miniGameStats.golds}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl text-white">💣 BOM</div>
                                        <div className="font-bold text-red-400">x{miniGameStats.bombs}</div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setShowResultCloseConfirm(true)}
                                    className="px-8 py-3 bg-white text-purple-900 font-black rounded-full hover:bg-yellow-100 transition-colors"
                                >
                                    ĐÓNG
                                </button>

                                {/* Confirm Close Result Modal */}
                                {showResultCloseConfirm && (
                                    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80">
                                        <div className="bg-white p-6 rounded-2xl text-center max-w-sm mx-4">
                                            <h3 className="font-black text-red-600 text-xl mb-2">XÁC NHẬN ĐÓNG?</h3>
                                            <p className="mb-6 font-medium text-gray-700">Điểm số đã được lưu. Bạn có chắc muốn đóng bảng kết quả?</p>
                                            <div className="flex gap-3 justify-center">
                                                <button
                                                    onClick={() => setShowResultCloseConfirm(false)}
                                                    className="px-4 py-2 bg-gray-200 rounded-lg font-bold"
                                                >
                                                    Hủy
                                                </button>
                                                <button
                                                    onClick={onCloseMiniGameResult}
                                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg font-bold"
                                                >
                                                    Đóng ngay
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Thần Tài Overlay */}
            <AnimatePresence>
                {isThanTaiActive && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 overflow-visible"
                    >
                        {/* Background Effects */}
                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(255,0,0,0.2),transparent_70%)] animate-pulse" />
                            {[...Array(20)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                                    initial={{
                                        x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
                                        y: -20,
                                        opacity: 1
                                    }}
                                    animate={{
                                        y: typeof window !== 'undefined' ? window.innerHeight + 20 : 1000,
                                        opacity: 0,
                                        rotate: 360
                                    }}
                                    transition={{
                                        duration: Math.random() * 3 + 2,
                                        repeat: Infinity,
                                        delay: Math.random() * 2
                                    }}
                                />
                            ))}
                        </div>

                        <div className="relative z-10 flex flex-col items-center">
                            {!showDoor ? (
                                <motion.div
                                    initial={{ scale: 0, rotate: -180 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    className="text-6xl md:text-9xl mb-8 filter drop-shadow-[0_0_30px_rgba(255,215,0,0.8)]"
                                >
                                    🧧
                                </motion.div>
                            ) : (
                                <div className="relative">
                                    {/* CỬA THẦN TÀI */}
                                    <motion.div
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="relative w-[320px] h-[480px] md:w-[400px] md:h-[600px] cursor-pointer group perspective-1000"
                                        onClick={!isDoorOpen ? onOpenDoor : undefined}
                                    >
                                        {/* KHUNG CỬA */}
                                        <div className="absolute inset-0 border-[12px] border-yellow-600 rounded-t-full bg-[#2a0e0e] shadow-[0_0_100px_rgba(255,215,0,0.3)]">
                                            {/* CÁNH CỬA TRÁI */}
                                            <motion.div
                                                className="absolute top-0 left-0 w-1/2 h-full bg-red-800 rounded-tl-full border-r-4 border-yellow-700 origin-left z-20 flex items-center justify-center overflow-hidden"
                                                animate={{ rotateY: isDoorOpen ? -110 : 0 }}
                                                transition={{ duration: 1.5, type: "spring", bounce: 0.2 }}
                                            >
                                                <div className="absolute inset-0 border-4 border-yellow-400/30 m-2 rounded-tl-full" />
                                                <div className="w-16 h-16 border-4 border-yellow-500 rounded-full flex items-center justify-center bg-red-900 shadow-inner">
                                                    <span className="text-4xl text-yellow-400 font-serif">福</span>
                                                </div>
                                            </motion.div>

                                            {/* CÁNH CỬA PHẢI */}
                                            <motion.div
                                                className="absolute top-0 right-0 w-1/2 h-full bg-red-800 rounded-tr-full border-l-4 border-yellow-700 origin-right z-20 flex items-center justify-center overflow-hidden"
                                                animate={{ rotateY: isDoorOpen ? 110 : 0 }}
                                                transition={{ duration: 1.5, type: "spring", bounce: 0.2 }}
                                            >
                                                <div className="absolute inset-0 border-4 border-yellow-400/30 m-2 rounded-tr-full" />
                                                <div className="w-16 h-16 border-4 border-yellow-500 rounded-full flex items-center justify-center bg-red-900 shadow-inner">
                                                    <span className="text-4xl text-yellow-400 font-serif">禄</span>
                                                </div>
                                            </motion.div>

                                            {/* NỘI DUNG BÊN TRONG (SAU KHI MỞ) */}
                                            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-6 text-center">
                                                <div className="absolute inset-0 bg-gradient-to-b from-yellow-200 to-yellow-500 opacity-20 animate-pulse rounded-t-full" />

                                                {isDoorOpen ? (
                                                    isThanTaiWinner ? (
                                                        <motion.div
                                                            initial={{ scale: 0.5, opacity: 0 }}
                                                            animate={{ scale: 1, opacity: 1 }}
                                                            transition={{ delay: 0.5 }}
                                                            className="relative"
                                                        >
                                                            <img
                                                                src="/than-tai.gif"
                                                                alt="Thần Tài"
                                                                className="w-72 h-72 md:w-[400px] md:h-[400px] object-contain mb-4 animate-bounce drop-shadow-2xl mx-auto"
                                                            />
                                                            <h2 className="text-3xl md:text-4xl font-black text-yellow-400 mb-2 uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                                                                <span style={{
                                                                    background: 'linear-gradient(to bottom, #FFD700, #FFA500)',
                                                                    WebkitTextFillColor: 'transparent',
                                                                    backgroundClip: 'text',
                                                                    filter: 'drop-shadow(2px 2px 4px rgba(220, 20, 60, 0.6))',
                                                                    display: 'inline-block',
                                                                    padding: '0.2em 0',
                                                                    lineHeight: '1.2',
                                                                }}>
                                                                    CHÚC MỪNG!
                                                                </span>
                                                            </h2>
                                                            <p className="text-white font-bold text-lg md:text-xl drop-shadow-md">
                                                                Bạn đã nhận được lì xì<br />từ Thần Tài!
                                                            </p>
                                                        </motion.div>
                                                    ) : (
                                                        <motion.div
                                                            initial={{ scale: 0.5, opacity: 0 }}
                                                            animate={{ scale: 1, opacity: 1 }}
                                                            transition={{ delay: 0.5 }}
                                                        >
                                                            <div className="text-7xl md:text-9xl mb-4">
                                                                🧧
                                                            </div>
                                                            <h2 className="text-2xl md:text-3xl font-black text-yellow-200 mb-2 uppercase whitespace-nowrap drop-shadow-md">
                                                                CHÚC MỪNG NĂM MỚI
                                                            </h2>
                                                            <p className="text-white/90 font-medium drop-shadow-sm">
                                                                Chúc bạn may mắn lần sau nha!
                                                            </p>
                                                        </motion.div>
                                                    )
                                                ) : (
                                                    <div className="text-yellow-200/50 font-black text-2xl uppercase tracking-widest animate-pulse">
                                                        Gõ cửa đi!
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>

                                    {/* INFO TEXT */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 }}
                                        className="mt-8 text-center"
                                    >
                                        {!isDoorOpen ? (
                                            <p className="text-yellow-400 text-xl font-bold animate-pulse uppercase tracking-widest">
                                                <span style={{
                                                    background: 'linear-gradient(to right, #FFD700, #ffecb3, #FFD700)',
                                                    WebkitTextFillColor: 'transparent',
                                                    backgroundClip: 'text',
                                                    filter: 'drop-shadow(2px 2px 3px rgba(220, 20, 60, 0.5))',
                                                    display: 'inline-block',
                                                    padding: '0.2em 0',
                                                    lineHeight: '1.2',
                                                }}>
                                                    THẦN TÀI ĐANG GÕ CỬA NHÀ BẠN
                                                </span>
                                            </p>
                                        ) : (
                                            <button
                                                onClick={onCloseThanTai}
                                                className="mt-6 px-8 py-3 bg-red-600 hover:bg-red-500 text-white font-black rounded-full shadow-[0_0_20px_rgba(220,38,38,0.6)] transition-all transform hover:scale-105"
                                            >
                                                CẢM ƠN THẦN TÀI
                                            </button>
                                        )}
                                    </motion.div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
