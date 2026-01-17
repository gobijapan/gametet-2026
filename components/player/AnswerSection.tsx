'use client';

import toast from 'react-hot-toast';

interface AnswerSectionProps {
    selectedQuestionForView: any;
    answers: { [key: string]: string[] };
    submittedAnswers: Set<string>;
    isCurrentlyPlaying: boolean;
    timeLeft: number;
    inputRefs: any;
    handleInputChange: (questionId: string, index: number, value: string) => void;
    handleKeyDown: (e: React.KeyboardEvent, questionId: string, index: number) => void;
    onConfirmSubmit: (questionId: string) => void;
    revealedResults: { [key: string]: any };
    answerDurations?: { [key: string]: number };
}

export default function AnswerSection({
    selectedQuestionForView,
    answers,
    submittedAnswers,
    isCurrentlyPlaying,
    timeLeft,
    inputRefs,
    handleInputChange,
    handleKeyDown,
    onConfirmSubmit,
    revealedResults,
    answerDurations,
}: AnswerSectionProps) {

    if (!selectedQuestionForView) return null;

    const isSubmitted = submittedAnswers.has(selectedQuestionForView.id);

    return (
        <div
            id="answer-section"
            className="relative rounded-3xl overflow-hidden shadow-[0_35px_85px_rgba(0,0,0,0.35)]"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-[#1a0505] via-[#4a0a0a] to-[#2a0000]" />
            <div className="absolute inset-0 opacity-[0.06] bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.15)_0,rgba(255,255,255,0.15)_1px,transparent_1px,transparent_8px)]" />

            <div className="relative p-5 md:p-8">
                <div className="flex items-center justify-center mb-6">
                    <div className="h-[2px] w-12 md:w-24 bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent" />
                    <h2 className="mx-4 text-yellow-200/90 font-black uppercase tracking-[0.3em] text-sm md:text-lg drop-shadow-md text-center">
                        Câu Trả Lời Của Bạn
                    </h2>
                    <div className="h-[2px] w-12 md:w-24 bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent" />
                </div>

                {/* INPUTS ROW */}
                <div className="flex flex-wrap justify-center gap-2 md:gap-3">
                    {Array.from({ length: selectedQuestionForView.answer.length }).map((_, index) => {
                        const val = answers[selectedQuestionForView.id]?.[index] || "";

                        // Check correctness if result is revealed
                        const result = revealedResults?.[selectedQuestionForView.id];
                        const fullUserAnswer = answers[selectedQuestionForView.id]?.join("").toUpperCase() || "";
                        const fullCorrectAnswer = result?.correctAnswer?.toUpperCase() || "";
                        const isFullAnswerCorrect = fullUserAnswer === fullCorrectAnswer;
                        const correctChar = result?.correctAnswer?.[index];
                        const isCharMatch = result && correctChar && val.toUpperCase() === correctChar.toUpperCase();

                        // Style determination
                        let inputStyle = "";
                        let glowStyle = "";

                        if (result) {
                            // RESULT REVEALED
                            if (isFullAnswerCorrect) {
                                // CORRECT: Tet Theme - Red BG + White Text + Yellow Glow
                                inputStyle = "border-yellow-200 text-white bg-gradient-to-b from-[#e74c3c] to-[#c0392b] shadow-[0_0_20px_rgba(255,215,0,0.8)] font-bold";
                                glowStyle = "bg-yellow-400 opacity-80 shadow-[0_0_20px_rgba(255,215,0,0.8)]";
                            } else {
                                // WRONG: Grayscale / Dimmed
                                inputStyle = "border-gray-600 text-gray-400 bg-gray-800/50 shadow-none grayscale opacity-80";
                                glowStyle = "bg-transparent opacity-0";
                            }
                        } else {
                            // NOT REVEALED YET (Typing or Submitted)
                            if (isSubmitted) {
                                inputStyle = "bg-[#8B0000] border-yellow-700/50 text-yellow-500/50 cursor-not-allowed shadow-none";
                                glowStyle = "bg-red-500/0 opacity-0";
                            } else if (val) {
                                // Typing... (Red BG + Yellow Text)
                                inputStyle = "border-yellow-300 text-yellow-200 bg-gradient-to-b from-[#dc143c] to-[#8b0000] shadow-[0_0_15px_rgba(255,215,0,0.5)] font-semibold";
                                glowStyle = "bg-yellow-500/50 opacity-100";
                            } else {
                                // Empty
                                inputStyle = "border-yellow-400 text-transparent focus:border-yellow-300 focus:bg-[#c71515] shadow-inner";
                                glowStyle = "bg-transparent opacity-0 group-focus-within:opacity-40";
                            }
                        }

                        return (
                            <div key={index} className="relative group">
                                <div className={`absolute -inset-[3px] rounded-xl blur-[6px] transition-all duration-300 ${glowStyle}`} />
                                <input
                                    ref={el => {
                                        if (!inputRefs.current[selectedQuestionForView.id]) {
                                            inputRefs.current[selectedQuestionForView.id] = [];
                                        }
                                        inputRefs.current[selectedQuestionForView.id][index] = el;
                                    }}
                                    type="text"
                                    maxLength={1}
                                    disabled={isSubmitted || (isCurrentlyPlaying && timeLeft === 0)}
                                    value={val}
                                    onChange={(e) => handleInputChange(selectedQuestionForView.id, index, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, selectedQuestionForView.id, index)}
                                    className={[
                                        "relative w-11 h-12 md:w-[68px] md:h-[76px]",
                                        "rounded-xl border-b-4 text-center caret-yellow-400",
                                        "font-black text-2xl md:text-4xl shadow-inner",
                                        "transition-all duration-200",
                                        "focus:outline-none focus:-translate-y-1 focus:shadow-[0_15px_30px_rgba(255,215,0,0.15)]",
                                        inputStyle
                                    ].join(" ")}
                                    inputMode="text"
                                    autoComplete="off"
                                />
                            </div>
                        );
                    })}
                </div>

                {/* Submit Button OR Timestamp */}
                <div className="flex justify-center mt-5">
                    {!submittedAnswers.has(selectedQuestionForView.id) ? (
                        <button
                            onClick={() => {
                                const answer = (answers[selectedQuestionForView.id] || []).join("");
                                if (answer.length === selectedQuestionForView.answer.length) {
                                    onConfirmSubmit(selectedQuestionForView.id);
                                } else {
                                    toast.error("Vui lòng điền đầy đủ đáp án!");
                                }
                            }}
                            disabled={!isCurrentlyPlaying || timeLeft === 0}
                            className={`font-black text-base md:text-xl px-10 md:px-16 py-3.5 rounded-full border-4 shadow-[0_22px_55px_rgba(0,0,0,0.28)] transform transition-all ${isCurrentlyPlaying && timeLeft > 0
                                ? "bg-gradient-to-b from-[#ff2d2d] via-[#b40000] to-[#2a0000] hover:from-[#ff4a4a] hover:to-black text-yellow-200 border-yellow-200 hover:scale-105"
                                : "bg-gray-500 text-gray-200 border-gray-600 opacity-50 cursor-not-allowed"
                                }`}
                        >
                            GỬI ĐÁP ÁN
                        </button>
                    ) : (
                        <div className="flex items-center gap-2 bg-black/40 px-6 py-2 rounded-full border border-yellow-500/30">
                            {/* Lucide Clock Icon */}
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#FFD700"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                            <span className="text-yellow-400 font-bold text-lg font-mono">
                                {answerDurations?.[selectedQuestionForView.id]
                                    ? (answerDurations[selectedQuestionForView.id] / 1000).toFixed(2) + "s"
                                    : "Đã gửi"}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
