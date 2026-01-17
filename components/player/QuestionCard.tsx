'use client';

import { useState } from 'react';

interface QuestionCardProps {
    selectedQuestionForView: any;
    currentQuestion: any; // for timer info
    isCurrentlyPlaying: boolean;
    isQuestionRevealed: boolean;
    revealedResults: { [key: string]: any };
    timeLeft: number;
}

export default function QuestionCard({
    selectedQuestionForView,
    // currentQuestion, // unused in UI directly, but needed for `isCurrentlyPlaying` logic passed in
    isCurrentlyPlaying,
    isQuestionRevealed,
    revealedResults,
    timeLeft,
}: QuestionCardProps) {
    const [isMediaZoomed, setIsMediaZoomed] = useState(false);
    const [isVideo, setIsVideo] = useState(false);

    if (!selectedQuestionForView) return null;

    // Helper to determine if media is video
    const checkIsVideo = (url: string) => {
        return url?.match(/\.(mp4|webm|ogg|mov)$/i) !== null;
    };

    return (
        <div className="relative rounded-3xl overflow-hidden shadow-[0_40px_90px_rgba(0,0,0,0.55)]">
            {/* nền sân khấu */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#c00000] via-[#7a0000] to-[#2a0000]" />
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[140%] h-64 bg-[radial-gradient(circle,rgba(255,215,0,0.35),transparent_60%)]" />
            <div className="absolute inset-0 opacity-[0.14] bg-[repeating-linear-gradient(60deg,rgba(255,215,0,0.55)_0,rgba(255,215,0,0.55)_1px,transparent_1px,transparent_12px)]" />
            <div className="absolute inset-0 pointer-events-none ring-2 ring-yellow-300/70" />
            <div className="absolute inset-[10px] pointer-events-none rounded-2xl ring-1 ring-white/15" />

            <div className="relative p-4 md:p-6 border-4 border-yellow-400 rounded-3xl">

                {/* 1) PREVIEW TRÊN CÙNG — 1 HÀNG AUTO-FIT, KHÔNG WRAP */}
                <div className="bg-[#fff2d2]/95 rounded-3xl p-3 md:p-4 border-2 border-yellow-300/70 shadow-[inset_0_0_0_2px_rgba(255,255,255,0.45)]">
                    <div className="flex justify-center">
                        <div className="flex flex-wrap justify-center gap-2 md:gap-3">
                            {Array.from({ length: selectedQuestionForView.answer.length }).map((_, index) => {
                                const isKey = index === selectedQuestionForView.keyPosition - 1;
                                const letter = isQuestionRevealed
                                    ? revealedResults[selectedQuestionForView.id]?.correctAnswer?.[index] || ""
                                    : "";

                                return (
                                    <div
                                        key={index}
                                        className={[
                                            "w-[34px] h-[34px] md:w-[56px] md:h-[56px]",
                                            "rounded-2xl border-2 flex items-center justify-center",
                                            "font-black uppercase select-none",
                                            "shadow-[0_10px_0_rgba(0,0,0,0.12)]",
                                            isKey
                                                ? letter
                                                    ? "bg-gradient-to-b from-yellow-300 to-yellow-500 border-yellow-800 text-red-950 border-4"
                                                    : "bg-red-100 border-red-900 border-4"
                                                : letter
                                                    ? "bg-white border-emerald-600 text-emerald-800"
                                                    : "bg-white/80 border-red-700 text-transparent",
                                        ].join(" ")}
                                        style={{ fontSize: "clamp(14px, 2.4vw, 30px)" }}
                                    >
                                        {letter}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* 2) BADGE + CONTENT (+ MEDIA nếu có) */}
                <div className="mt-4 grid grid-cols-1 lg:grid-cols-[210px_1fr] gap-4 lg:gap-6 items-start">

                    {/* BADGE TRÒN: số câu / timer */}
                    <div className="flex justify-center lg:justify-start">
                        <div
                            className={[
                                "w-[180px] h-[180px] md:w-[200px] md:h-[200px]",
                                "rounded-full border-4 shadow-[0_20px_55px_rgba(0,0,0,0.35)] overflow-hidden",
                                isCurrentlyPlaying
                                    ? "border-cyan-200 bg-gradient-to-b from-cyan-200 to-cyan-500"
                                    : "border-yellow-200 bg-gradient-to-b from-yellow-200 to-yellow-500",
                            ].join(" ")}
                        >
                            <div className="w-full h-full relative">
                                <div className="absolute inset-0 opacity-[0.16] bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.25)_0,rgba(255,255,255,0.25)_1px,transparent_1px,transparent_10px)]" />
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.35),transparent_55%)]" />

                                <div className="relative w-full h-full flex flex-col items-center justify-center text-center px-4">
                                    <div
                                        className="font-black leading-none"
                                        style={{
                                            fontSize: "clamp(56px, 6vw, 92px)",
                                            color: isCurrentlyPlaying ? "#083344" : "#450a0a",
                                            textShadow: "2px 2px 0 rgba(122,0,0,0.25)",
                                        }}
                                    >
                                        {isCurrentlyPlaying ? `${timeLeft}` : `${selectedQuestionForView.order}`}
                                    </div>

                                    <div className="mt-1 text-[10px] md:text-xs font-black uppercase tracking-[0.22em] text-red-900/85">
                                        {selectedQuestionForView.type === "crossword"
                                            ? "Ô chữ"
                                            : selectedQuestionForView.type === "image"
                                                ? "Ảnh"
                                                : "Xáo chữ"}
                                    </div>

                                    {/* hint nhỏ cho timer */}
                                    {isCurrentlyPlaying && (
                                        <div className="mt-2 px-3 py-1 rounded-full bg-gradient-to-b from-[#083344] to-[#164e63] border-2 border-cyan-100 shadow-[0_10px_25px_rgba(0,0,0,0.22)]">
                                            <span className="text-cyan-100 font-black text-[10px] uppercase tracking-[0.18em]">
                                                giây
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CONTENT + MEDIA */}
                    <div className="space-y-4">
                        <div className="space-y-4">
                            <div className="bg-[#fff2d2]/95 rounded-3xl p-4 md:p-5 border-2 border-yellow-300/70 shadow-[inset_0_0_0_2px_rgba(255,255,255,0.40)] min-h-[100px] flex items-center justify-center">
                                {(isCurrentlyPlaying || isQuestionRevealed) ? (
                                    <p className="text-red-950 text-base md:text-lg font-extrabold leading-relaxed text-center">
                                        {selectedQuestionForView.content}
                                    </p>
                                ) : (
                                    <div className="flex gap-2">
                                        <span className="w-2 h-2 bg-red-900/20 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                                        <span className="w-2 h-2 bg-red-900/20 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                                        <span className="w-2 h-2 bg-red-900/20 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                    </div>
                                )}
                            </div>

                            {/* Media container - size based on type */}
                            {(selectedQuestionForView.type === "image" || selectedQuestionForView.type === "scramble") && (
                                <div
                                    className={`bg-[#fff2d2]/90 rounded-3xl p-4 border-2 border-yellow-300/70 flex items-center justify-center shadow-[inset_0_0_0_2px_rgba(255,255,255,0.35)] ${selectedQuestionForView.type === "scramble"
                                            ? "min-h-[120px]" // Smaller for scramble
                                            : "h-[200px] md:h-[280px] lg:h-[360px]" // Fixed height for image/video
                                        }`}
                                >
                                    {(isCurrentlyPlaying || isQuestionRevealed) ? (
                                        <>
                                            {selectedQuestionForView.mediaUrl && (
                                                <div
                                                    className={`relative ${selectedQuestionForView.type === "image" ? "cursor-pointer w-full h-full" : "w-full"
                                                        }`}
                                                    onClick={() => {
                                                        if (selectedQuestionForView.type === "image") {
                                                            const videoCheck = checkIsVideo(selectedQuestionForView.mediaUrl);
                                                            setIsVideo(videoCheck);
                                                            setIsMediaZoomed(true);
                                                        }
                                                    }}
                                                >
                                                    {checkIsVideo(selectedQuestionForView.mediaUrl) ? (
                                                        <video
                                                            src={selectedQuestionForView.mediaUrl}
                                                            autoPlay
                                                            loop
                                                            muted
                                                            playsInline
                                                            className="w-full h-full object-contain rounded-2xl"
                                                        />
                                                    ) : (
                                                        <img
                                                            src={selectedQuestionForView.mediaUrl}
                                                            alt="Câu hỏi"
                                                            className="w-full h-full object-contain rounded-2xl"
                                                        />
                                                    )}
                                                </div>
                                            )}

                                            {selectedQuestionForView.type === "scramble" && selectedQuestionForView.scrambledAnswer && (
                                                <div className="w-full">
                                                    <p className="text-center text-red-950 font-black text-xs md:text-sm uppercase tracking-[0.22em] mb-3">
                                                        Xếp lại
                                                    </p>
                                                    <div className="flex flex-wrap gap-2 justify-center">
                                                        {selectedQuestionForView.scrambledAnswer.split("").map((letter: string, idx: number) => (
                                                            <div
                                                                key={idx}
                                                                className="w-10 h-10 md:w-14 md:h-14 rounded-2xl flex items-center justify-center font-black text-white border-2 border-[#2a0000]
                                  bg-gradient-to-b from-[#ff2d2d] via-[#b40000] to-[#2a0000]
                                  shadow-[0_12px_0_rgba(0,0,0,0.18)]"
                                                                style={{ fontSize: "clamp(14px, 2.2vw, 30px)" }}
                                                            >
                                                                {letter}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="text-center text-red-900/40 font-black uppercase tracking-[0.2em] animate-pulse">
                                            ? ? ?
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Zoom Modal */}
            {isMediaZoomed && (
                <div
                    className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4"
                    onClick={() => setIsMediaZoomed(false)}
                >
                    <div className="relative max-w-[95vw] max-h-[95vh]" onClick={(e) => e.stopPropagation()}>
                        {isVideo ? (
                            <video
                                src={selectedQuestionForView.mediaUrl}
                                autoPlay
                                loop
                                muted
                                playsInline
                                className="max-w-full max-h-[95vh] object-contain rounded-lg"
                                onClick={() => setIsMediaZoomed(false)}
                            />
                        ) : (
                            <img
                                src={selectedQuestionForView.mediaUrl}
                                alt="Câu hỏi phóng to"
                                className="max-w-full max-h-[95vh] object-contain rounded-lg cursor-pointer"
                                onClick={() => setIsMediaZoomed(false)}
                            />
                        )}
                    </div>
                    <button
                        onClick={() => setIsMediaZoomed(false)}
                        className="absolute top-4 right-4 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white text-2xl font-bold border-2 border-white/30"
                    >
                        ✕
                    </button>
                </div>
            )}
        </div>
    );
}
