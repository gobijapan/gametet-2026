'use client';

import { motion } from 'framer-motion';

interface GameHeaderProps {
    questions: any[];
    revealedKeys: { [key: string]: string };
    revealedResults: { [key: string]: any };
    currentQuestion: any;
    selectedQuestionForPreview: any;
    selectedQuestionForView: any;
    onQuestionClick: (question: any) => void;
    onQuestionSelect?: (question: any) => void;
}

export default function GameHeader({
    questions,
    revealedKeys,
    revealedResults,
    currentQuestion,
    selectedQuestionForPreview,
    selectedQuestionForView,
    onQuestionClick,
    onQuestionSelect,
}: GameHeaderProps) {
    return (
        <div className="sticky top-0 z-30">
            <div className="relative bg-gradient-to-br from-[#9b0000] via-[#7a0000] to-[#2a0000] shadow-[0_18px_55px_rgba(0,0,0,0.55)]">
                {/* spotlight + glitter */}
                <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,rgba(255,215,0,0.28),transparent_55%)]" />
                <div className="absolute inset-0 pointer-events-none opacity-[0.14] bg-[repeating-linear-gradient(60deg,rgba(255,215,0,0.55)_0,rgba(255,215,0,0.55)_1px,transparent_1px,transparent_12px)]" />

                {/* stage border */}
                <div className="absolute inset-0 pointer-events-none ring-2 ring-yellow-300/70" />
                <div className="absolute inset-[8px] pointer-events-none rounded-2xl ring-1 ring-white/12" />

                <div
                    className="relative px-2 md:px-4 py-3 md:py-4"
                    style={{
                        ["--n" as any]: Math.max(1, questions.length),
                        ["--gap" as any]: "clamp(6px, 0.9vw, 14px)",
                        ["--pad" as any]: "clamp(32px, 6vw, 64px)",
                        ["--cell" as any]:
                            "clamp(26px, calc((100vw - var(--pad) - (var(--n) - 1) * var(--gap)) / var(--n)), 78px)",
                    }}
                >
                    {/* vùng “đệm” để scale lên không bị cắt */}
                    <div className="w-full overflow-visible py-2">
                        <div
                            className="flex flex-nowrap justify-center items-center gap-[var(--gap)]"
                            style={{ minWidth: 0 }}
                        >
                            {questions.map((q) => {
                                const keyLetter = revealedKeys[q.id];
                                const isRevealed = revealedResults[q.id];
                                const isCurrent = currentQuestion?.questionId === q.order;
                                const isMCSelected = selectedQuestionForPreview?.id === q.id && !isCurrent;
                                const isSelected = selectedQuestionForView?.id === q.id;

                                return (
                                    <motion.button
                                        key={q.id}
                                        onClick={() => {
                                            onQuestionClick(q);
                                            onQuestionSelect?.(q);
                                        }}
                                        // scale nhỏ vừa đủ để không phá 1 hàng
                                        whileHover={{ scale: 1.06 }}
                                        whileTap={{ scale: 0.98 }}
                                        animate={
                                            isCurrent || isMCSelected
                                                ? {
                                                    boxShadow: [
                                                        "0 0 18px rgba(255,215,0,0.45)",
                                                        "0 0 38px rgba(255,215,0,0.92)",
                                                        "0 0 18px rgba(255,215,0,0.45)",
                                                    ],
                                                    scale: [1, 1.06, 1],
                                                }
                                                : {}
                                        }
                                        transition={{
                                            duration: 1.4,
                                            repeat: isCurrent || isMCSelected ? Infinity : 0,
                                            ease: "easeInOut",
                                        }}
                                        className={[
                                            "rounded-full flex items-center justify-center font-black uppercase select-none",
                                            "border-4 transition-all",
                                            // z-index để ô đang hover nổi lên trên các ô khác
                                            "relative z-0 hover:z-20 focus:z-20",
                                            // shadow đỡ “dày” khi ô nhỏ
                                            "shadow-[0_10px_0_rgba(0,0,0,0.16)]",
                                            isCurrent
                                                ? "bg-gradient-to-b from-yellow-200 to-yellow-500 border-yellow-200 text-red-950"
                                                : isMCSelected
                                                    ? "bg-gradient-to-b from-yellow-200 to-yellow-500 border-yellow-200 text-red-950 opacity-85"
                                                    : isSelected
                                                        ? "bg-gradient-to-b from-violet-500 to-violet-800 border-violet-200 text-white ring-2 ring-violet-200"
                                                        : isRevealed
                                                            ? "bg-gradient-to-b from-emerald-500 to-emerald-800 border-emerald-200 text-white"
                                                            : "bg-gradient-to-b from-slate-300 to-slate-500 border-slate-600 text-slate-800 opacity-75",
                                        ].join(" ")}
                                        style={{
                                            width: "var(--cell)",
                                            height: "var(--cell)",
                                            fontSize: "clamp(12px, calc(var(--cell) * 0.42), 34px)",
                                        }}
                                    >
                                        {isRevealed ? keyLetter : q.order}
                                    </motion.button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
