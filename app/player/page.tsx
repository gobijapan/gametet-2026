'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue, update, get, onDisconnect, set } from 'firebase/database';
import { auth, database } from '@/lib/firebase';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import MiniGame from '@/components/MiniGame';
import MiniGameChoiceTimer from '@/components/MiniGameChoiceTimer';

export default function PlayerPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedQuestionForPreview, setSelectedQuestionForPreview] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<{ [key: string]: string[] }>({});
  const [submittedAnswers, setSubmittedAnswers] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState(0);
  const [canRingBell, setCanRingBell] = useState(true);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [revealedResults, setRevealedResults] = useState<{ [key: string]: any }>({});
  const [revealedKeys, setRevealedKeys] = useState<{ [key: string]: string }>({});
  const [myAnswersCorrect, setMyAnswersCorrect] = useState<{ [key: string]: boolean }>({});
  const [highlightedQuestion, setHighlightedQuestion] = useState<string | null>(null);
  const [clickedRevealedQuestion, setClickedRevealedQuestion] = useState<any>(null);
  const [isThanTaiActive, setIsThanTaiActive] = useState(false);
  const [isThanTaiWinner, setIsThanTaiWinner] = useState(false);
  const [showDoor, setShowDoor] = useState(false);
  const [isDoorOpen, setIsDoorOpen] = useState(false);
  const [hasClosedThanTai, setHasClosedThanTai] = useState(() => {
  // Load từ localStorage
  if (typeof window !== 'undefined') {
    return localStorage.getItem('thanTaiClosed') === 'true';
  }
  return false;
});
  
  // Modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmQuestionId, setConfirmQuestionId] = useState<string | null>(null);
  const [showBellConfirmModal, setShowBellConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const [isRevealingSecret, setIsRevealingSecret] = useState(false);
  const [animatingKeys, setAnimatingKeys] = useState<any[]>([]);

  const inputRefs = useRef<{ [key: string]: (HTMLInputElement | null)[] }>({});

  // Mini Game states
const [isMiniGameActive, setIsMiniGameActive] = useState(false);
const [showMiniGameChoice, setShowMiniGameChoice] = useState(false);
const [miniGameCountdown, setMiniGameCountdown] = useState(3);
const [isMiniGamePlaying, setIsMiniGamePlaying] = useState(false);
const [showMiniGameResult, setShowMiniGameResult] = useState(false);
const [miniGameScore, setMiniGameScore] = useState(0);
const [miniGameStats, setMiniGameStats] = useState({ coins: 0, golds: 0, bombs: 0 });
const [miniGameConfig, setMiniGameConfig] = useState<any>(null);
const [showSkipConfirm, setShowSkipConfirm] = useState(false);
const [showResultCloseConfirm, setShowResultCloseConfirm] = useState(false);

  // Handle Escape key globally
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowConfirmModal(false);
        setConfirmQuestionId(null);
        setShowBellConfirmModal(false);
        setClickedRevealedQuestion(null);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

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
        snapshot.forEach((childSnapshot) => {
          const userData = childSnapshot.val();
          if (userData.uid === firebaseUser.uid) {
            const userWithMaNV = { ...userData, maNV: childSnapshot.key };
            setUser(userWithMaNV);
            
            const onlineRef = ref(database, `online/${childSnapshot.key}`);
            set(onlineRef, true);
            onDisconnect(onlineRef).remove();
            
            const statsRef = ref(database, `playerStats/${childSnapshot.key}`);
            get(statsRef).then(statsSnapshot => {
              if (statsSnapshot.exists()) {
                const stats = statsSnapshot.val();
                setCanRingBell(stats.canRingBell !== false);
              }
            });
          }
        });
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // Listen to countdown
  useEffect(() => {
    const countdownRef = ref(database, 'game/countdown');
    const unsubscribe = onValue(countdownRef, (snapshot) => {
      if (snapshot.exists()) {
        const countdownData = snapshot.val();
        if (countdownData.isActive) {
          setIsCountingDown(true);
          
          const elapsed = Date.now() - countdownData.startTime;
          const remaining = Math.max(0, 3 - Math.floor(elapsed / 1000));
          setCountdown(remaining);

          const interval = setInterval(() => {
            const newElapsed = Date.now() - countdownData.startTime;
            const newRemaining = Math.max(0, 3 - Math.floor(newElapsed / 1000));
            setCountdown(newRemaining);

            if (newRemaining === 0) {
              setIsCountingDown(false);
              clearInterval(interval);
            }
          }, 100);

          return () => clearInterval(interval);
        } else {
          setIsCountingDown(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen to selected question
  useEffect(() => {
    const selectedRef = ref(database, 'game/selectedQuestion');
    const unsubscribe = onValue(selectedRef, async (snapshot) => {
      if (snapshot.exists()) {
        const selectedData = snapshot.val();
        const question = questions.find(q => q.id === selectedData.questionId);
        if (question) {
          setSelectedQuestionForPreview(question);
        }
      } else {
        setSelectedQuestionForPreview(null);
      }
    });

    return () => unsubscribe();
  }, [questions]);

  // Listen to current question
  useEffect(() => {
    if (!user) return;

    const gameRef = ref(database, 'game/currentQuestion');
    const unsubscribe = onValue(gameRef, (snapshot) => {
      if (snapshot.exists()) {
        setCurrentQuestion(snapshot.val());
      } else {
        setCurrentQuestion(null);
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Listen to all questions
  useEffect(() => {
    const questionsRef = ref(database, 'questions');
    const unsubscribe = onValue(questionsRef, (snapshot) => {
      if (snapshot.exists()) {
        const questionsData = snapshot.val();
        const questionsArray = Object.keys(questionsData).map((key) => ({
          id: key,
          ...questionsData[key],
        }));
        questionsArray.sort((a, b) => a.order - b.order);
        setQuestions(questionsArray);
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen to results
  useEffect(() => {
    const resultsRef = ref(database, 'results');
    const unsubscribe = onValue(resultsRef, (snapshot) => {
      if (snapshot.exists()) {
        const resultsData = snapshot.val();
        setRevealedResults(resultsData);
        
        const keys: { [key: string]: string } = {};
        Object.keys(resultsData).forEach(questionId => {
          if (resultsData[questionId].keyLetter) {
            keys[questionId] = resultsData[questionId].keyLetter;
          }
        });
        setRevealedKeys(keys);
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen to secret revealed
useEffect(() => {
  const gameRef = ref(database, 'game');
  const unsubscribe = onValue(gameRef, async (snapshot) => {
    if (snapshot.exists()) {
      const gameData = snapshot.val();
      
      if (gameData.secretRevealed === true && gameData.keyMapping) {
        const secretWord = gameData.secretWord;
        const keyMapping = gameData.keyMapping;
        
        setIsRevealingSecret(true);
        
        const keysToAnimate = Object.keys(keyMapping).map(position => ({
          position: parseInt(position),
          letter: keyMapping[position].letter,
          fromQuestion: keyMapping[position].fromQuestion,
        }));
        
        setAnimatingKeys(keysToAnimate);
        
        // Confetti sau 3s
        setTimeout(() => {
          confetti({
            particleCount: 200,
            spread: 100,
            origin: { y: 0.6 },
            colors: ['#FFD700', '#FFA500', '#FF6347', '#DC143C'],
          });
        }, 3000);
        
        // Cập nhật ô bí ẩn ở dưới
        const updatedKeys: { [key: string]: string } = {};
        keysToAnimate.forEach(keyData => {
          const question = questions.find(q => q.order === keyData.fromQuestion);
          if (question) {
            updatedKeys[question.id] = keyData.letter;
          }
        });
        setRevealedKeys(updatedKeys);
      }
    }
  });

  return () => unsubscribe();
}, [questions]);

  // Listen to my answers and check if correct
  useEffect(() => {
    if (!user) return;

    questions.forEach(async (q) => {
      if (revealedResults[q.id]) {
        const myAnswerRef = ref(database, `answers/${q.id}/${user.maNV}`);
        const snapshot = await get(myAnswerRef);
        
        if (snapshot.exists()) {
          const myAnswer = snapshot.val().answer.toUpperCase();
          const correctAnswer = revealedResults[q.id].correctAnswer.toUpperCase();
          setMyAnswersCorrect(prev => ({ ...prev, [q.id]: myAnswer === correctAnswer }));
        }
      }
    });
  }, [user, questions, revealedResults]);

  // Listen to submitted answers
  useEffect(() => {
    if (!user) return;

    questions.forEach(q => {
      const answerRef = ref(database, `answers/${q.id}/${user.maNV}`);
      onValue(answerRef, (snapshot) => {
        if (snapshot.exists()) {
          setSubmittedAnswers(prev => new Set([...prev, q.id]));
          // Load submitted answer vào state
          const submittedAnswer = snapshot.val().answer;
          setAnswers(prev => ({
            ...prev,
            [q.id]: submittedAnswer.split('')
          }));
        }
      });
    });
  }, [user, questions]);

  // Listen to Thần Tài
useEffect(() => {
  if (!user) return;

  const thanTaiRef = ref(database, 'game/thanTai');
  const unsubscribe = onValue(thanTaiRef, async (snapshot) => {
    if (snapshot.exists()) {
      const thanTaiData = snapshot.val();
      
      if (thanTaiData.active && !hasClosedThanTai) {
        const isWinner = thanTaiData.winners && thanTaiData.winners[user.maNV];
        
        setIsThanTaiWinner(isWinner || false);
        setIsThanTaiActive(true);
        
        // Tối màn hình 1s
        setTimeout(() => {
          setShowDoor(true);
        }, 1000);
        
        // KHÔNG CÓ setTimeout 10s nữa!
        // Player sẽ tự click mở cửa
        
      } else {
        // MC đã đóng Thần Tài hoặc Player đã đóng
        setIsThanTaiActive(false);
        setShowDoor(false);
        setIsDoorOpen(false);
        
        // Clear pháo hoa
        if ((window as any).__thanTaiFireworks) {
          clearInterval((window as any).__thanTaiFireworks);
          (window as any).__thanTaiFireworks = null;
        }
        
        // Reset localStorage khi MC đóng (để lần sau có thể xem lại)
        if (!thanTaiData || !thanTaiData.active) {
          localStorage.removeItem('thanTaiClosed');
          setHasClosedThanTai(false);
        }
      }
    }
  });

  return () => unsubscribe();
}, [user]);

// Listen to Mini Game
useEffect(() => {
  if (!user) return;

  const miniGameRef = ref(database, 'game/miniGame');
  const unsubscribe = onValue(miniGameRef, async (snapshot) => {
    if (snapshot.exists()) {
      const miniGameData = snapshot.val();
      
      if (miniGameData.active) {
        // Load config
        const configRef = ref(database, 'config/miniGame');
        const configSnapshot = await get(configRef);
        const config = configSnapshot.exists() ? configSnapshot.val() : {
          duration: 30,
          coinPoints: 50,
          goldPoints: 100,
          bombPoints: -100,
          coinSpeed: 3,
          goldSpeed: 5,
          bombSpeed: 2,
          spawnInterval: 0.5,
          coinRate: 50,
          goldRate: 30,
          bombRate: 20,
        };
        
        setMiniGameConfig(config);
        setIsMiniGameActive(true);
        setShowMiniGameChoice(true);
      } else {
        // MC đã đóng
        setIsMiniGameActive(false);
        setShowMiniGameChoice(false);
        setIsMiniGamePlaying(false);
        setShowMiniGameResult(false);
      }
    }
  });

  return () => unsubscribe();
}, [user]);

  // Timer countdown
useEffect(() => {
  if (!currentQuestion?.timerEnd) return;

  const interval = setInterval(() => {
    const now = Date.now();
    const timeRemaining = Math.max(0, Math.floor((currentQuestion.timerEnd - now) / 1000));
    setTimeLeft(timeRemaining);

    if (timeRemaining === 0) {
      clearInterval(interval);
      
      // Tự động bỏ highlight khi hết giờ
      if (highlightedQuestion === currentQuestion?.questionDbId) {
        setHighlightedQuestion(null);
      }
    }
  }, 100);

  return () => clearInterval(interval);
}, [currentQuestion?.timerEnd, currentQuestion?.questionDbId, highlightedQuestion]);

  // Handle input change with auto focus
  const handleInputChange = (questionId: string, index: number, value: string) => {
    if (submittedAnswers.has(questionId)) return;

    const newAnswers = { ...answers };
    if (!newAnswers[questionId]) {
      newAnswers[questionId] = [];
    }
    newAnswers[questionId][index] = value.toUpperCase();
    setAnswers(newAnswers);

    // Auto focus next input
    if (value.length === 1 && inputRefs.current[questionId]) {
      const nextInput = inputRefs.current[questionId][index + 1];
      if (nextInput) {
        nextInput.focus();
      }
    }
  };

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent, questionId: string, index: number) => {
    const question = questions.find(q => q.id === questionId);
    if (!question) return;

    // Enter: Show confirm modal or submit
    if (e.key === 'Enter') {
      e.preventDefault();
      
      if (showConfirmModal && confirmQuestionId === questionId) {
        // Enter lần 2 - Submit
        handleSubmitAnswer();
      } else {
        // Enter lần 1 - Show confirm
        const answer = (answers[questionId] || []).join('');
        if (answer.length === question.answer.length) {
          setConfirmQuestionId(questionId);
          setShowConfirmModal(true);
        }
      }
    }

    // Backspace: Clear and move back
    if (e.key === 'Backspace') {
      const currentValue = answers[questionId]?.[index] || '';
      
      if (currentValue === '') {
        e.preventDefault();
        if (index > 0 && inputRefs.current[questionId]) {
          const prevInput = inputRefs.current[questionId][index - 1];
          if (prevInput) {
            prevInput.focus();
          }
        }
      } else {
        const newAnswers = { ...answers };
        if (!newAnswers[questionId]) {
          newAnswers[questionId] = [];
        }
        newAnswers[questionId][index] = '';
        setAnswers(newAnswers);
      }
    }

    // Delete: Clear current box
    if (e.key === 'Delete') {
      e.preventDefault();
      const newAnswers = { ...answers };
      if (!newAnswers[questionId]) {
        newAnswers[questionId] = [];
      }
      newAnswers[questionId][index] = '';
      setAnswers(newAnswers);
    }
  };

  // Handle Mini Game choice
const handlePlayMiniGame = async () => {
  setShowMiniGameChoice(false);
  
  // Countdown 3s
  for (let i = 3; i > 0; i--) {
    setMiniGameCountdown(i);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Start game
  setIsMiniGamePlaying(true);
};

const handleSkipMiniGame = () => {
  setShowSkipConfirm(true);
};

const confirmSkipMiniGame = () => {
  setShowSkipConfirm(false);
  setShowMiniGameChoice(false);
  setIsMiniGameActive(false);
  
  // Gửi kết quả 0 điểm
  if (user) {
    const resultRef = ref(database, `game/miniGameResults/${user.maNV}`);
    update(resultRef, {
      score: 0,
      skipped: true,
      timestamp: Date.now(),
    });
  }
};

const handleMiniGameEnd = async (finalScore: number, finalStats: any) => {
  setMiniGameScore(finalScore);
  setMiniGameStats(finalStats);
  setIsMiniGamePlaying(false);
  setShowMiniGameResult(true);
  
  // Gửi kết quả lên Firebase
  if (user) {
    const resultRef = ref(database, `game/miniGameResults/${user.maNV}`);
    await update(resultRef, {
      score: finalScore,
      stats: finalStats,
      timestamp: Date.now(),
      skipped: false,
    });
  }
};

const handleCloseMiniGameResult = () => {
  setShowResultCloseConfirm(true);
};

const confirmCloseMiniGameResult = () => {
  setShowResultCloseConfirm(false);
  setShowMiniGameResult(false);
  setIsMiniGameActive(false);
};

  // Handle submit answer
  const handleSubmitAnswer = async () => {
    if (!user || !confirmQuestionId) return;

    const answer = (answers[confirmQuestionId] || []).join('');
    
    try {
      const answerRef = ref(database, `answers/${confirmQuestionId}/${user.maNV}`);
      await update(answerRef, {
        answer,
        timestamp: Date.now(),
      });

      setSubmittedAnswers(prev => new Set([...prev, confirmQuestionId]));
      setShowConfirmModal(false);
      setConfirmQuestionId(null);
      
      setSuccessMessage('Đã gửi đáp án thành công!');
      setShowSuccessModal(true);
      setTimeout(() => setShowSuccessModal(false), 2000);
    } catch (error) {
      console.error('Lỗi khi gửi đáp án:', error);
      setSuccessMessage('Có lỗi xảy ra khi gửi đáp án!');
      setShowSuccessModal(true);
      setTimeout(() => setShowSuccessModal(false), 2000);
    }
  };

  // Handle ring bell
  const handleRingBell = () => {
    if (!canRingBell) return;
    setShowBellConfirmModal(true);
  };

  const confirmRingBell = async () => {
    if (!user) return;

    try {
      const bellRef = ref(database, `bellQueue/${user.maNV}`);
      await update(bellRef, {
        name: user.name,
        timestamp: Date.now(),
      });

      setCanRingBell(false);
      
      const playerRef = ref(database, `playerStats/${user.maNV}`);
      await update(playerRef, {
        canRingBell: false,
      });

      setShowBellConfirmModal(false);
      setSuccessMessage('Đã rung chuông! Vui lòng chờ MC gọi tên!');
      setShowSuccessModal(true);
      setTimeout(() => setShowSuccessModal(false), 2000);
    } catch (error) {
      console.error('Lỗi khi rung chuông:', error);
      setSuccessMessage('Có lỗi xảy ra khi rung chuông!');
      setShowSuccessModal(true);
      setTimeout(() => setShowSuccessModal(false), 2000);
    }
  };

  // Handle click on question row
  const handleClickQuestion = (question: any, targetIndex?: number) => {
    if (submittedAnswers.has(question.id)) {
      // Nếu đã submit, hiện thông tin câu hỏi đã hỏi
      if (revealedResults[question.id]) {
        setClickedRevealedQuestion(question);
      }
      return;
    }
    
    if (revealedResults[question.id] && !submittedAnswers.has(question.id)) {
      // Câu đã hỏi nhưng player chưa submit
      setClickedRevealedQuestion(question);
      return;
    }
    
    setHighlightedQuestion(question.id);
    setClickedRevealedQuestion(null);
    
    setTimeout(() => {
      if (!inputRefs.current[question.id]) return;
      
      // Nếu click vào ô cụ thể
      if (targetIndex !== undefined) {
        inputRefs.current[question.id][targetIndex]?.focus();
        return;
      }
      
      // Tìm ô trống đầu tiên
      const currentAnswers = answers[question.id] || [];
      let firstEmptyIndex = currentAnswers.findIndex((val) => !val || val === '');
      
      // Nếu không có ô trống, focus ô đầu tiên
      if (firstEmptyIndex === -1) {
        firstEmptyIndex = 0;
      }
      
      inputRefs.current[question.id][firstEmptyIndex]?.focus();
    }, 100);
  };

  // Get question type label
  const getQuestionTypeLabel = (type: string) => {
    switch(type) {
      case 'crossword': return 'Ô chữ';
      case 'image': return 'Đuổi hình bắt chữ';
      case 'scramble': return 'Xáo chữ';
      default: return 'Câu hỏi';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-yellow-300 text-2xl font-bold">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3 md:p-4">
      
      {/* Countdown overlay */}
      {isCountingDown && (
        <div className="fixed inset-0 flex items-center justify-center z-40 pointer-events-none">
          <div className="text-yellow-300 text-9xl font-black animate-pulse" style={{
            textShadow: '4px 4px 0 #DC143C, 8px 8px 0 #8B0000, 12px 12px 20px rgba(0,0,0,0.8)'
          }}>
            {countdown}
          </div>
        </div>
      )}

      {/* Thần Tài overlay - HOÀN CHỈNH */}
<AnimatePresence>
  {isThanTaiActive && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 overflow-hidden"
    >
      {/* Nút đóng - GÓC PHẢI TRÊN */}
      <motion.button
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 2 }}
        onClick={() => {
          setIsThanTaiActive(false);
          setShowDoor(false);
          setIsDoorOpen(false);
          setHasClosedThanTai(true);
          
          // Lưu localStorage
          localStorage.setItem('thanTaiClosed', 'true');
          
          // Clear pháo hoa
          if ((window as any).__thanTaiFireworks) {
            clearInterval((window as any).__thanTaiFireworks);
            (window as any).__thanTaiFireworks = null;
          }
        }}
        className="fixed top-6 right-6 z-[60] bg-red-600 hover:bg-red-700 text-white font-bold w-14 h-14 rounded-full flex items-center justify-center shadow-2xl border-4 border-white hover:scale-110 transition-all"
        title="Đóng"
      >
        <span className="text-2xl">✕</span>
      </motion.button>

      {!showDoor ? (
        // Màn hình tối (1s đầu)
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-yellow-300 text-3xl font-bold animate-pulse"
        >
          Đang chuẩn bị...
        </motion.div>
      ) : (
        <div className="relative w-full h-full flex flex-col items-center justify-center">
          
          {/* Text ở trên */}
          <AnimatePresence mode="wait">
            {!isDoorOpen ? (
              // Trước khi mở - "GÕ CỬA"
              <motion.div
                key="before"
                initial={{ y: -30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.5 }}
                className="absolute top-10 md:top-12 text-center z-40 w-full px-4 overflow-visible"
              >
                <motion.h1
                  animate={{ scale: [1, 1.04, 1] }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="text-2xl md:text-4xl font-black mb-3 flex items-center justify-center gap-2"
                >
                  <span className="text-4xl">🧧</span>
                  <span style={{
                    background: 'linear-gradient(90deg, #FFD700 0%, #FFA500 50%, #FFD700 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    filter: 'drop-shadow(2px 2px 3px rgba(220, 20, 60, 0.5))',
                    paddingTop: '0.5rem',
                    paddingBottom: '0.5rem',
                  }}>
                    THẦN TÀI ĐANG GÕ CỬA NHÀ BẠN
                  </span>
                  <span className="text-4xl">🧧</span>
                </motion.h1>
                
                <motion.p
                  animate={{ 
                    scale: [1, 1.08, 1],
                    y: [0, -5, 0],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="text-lg md:text-2xl font-bold text-yellow-200"
                  style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.9)' }}
                >
                  👆 Hãy nhanh tay chạm vào cửa để mở! 👆
                </motion.p>
              </motion.div>
            ) : (
              // Sau khi mở - "CHÚC MỪNG"
              <motion.div
                key="after"
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ 
                  delay: isThanTaiWinner ? 2.3 : 1.3,
                  duration: 0.7,
                  ease: "backOut"
                }}
                className="absolute top-8 md:top-12 text-center z-70 w-full px-4"
              >
                {isThanTaiWinner ? (
                  <>
                    <motion.h1
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{
                        duration: 1.8,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="text-5xl md:text-6xl font-black mb-4 flex items-center justify-center gap-3"
                    >
                      <span className="text-5xl">🧧</span>
                      <span style={{
                        background: 'linear-gradient(90deg, #FFD700 0%, #FFA500 50%, #FFD700 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        filter: 'drop-shadow(3px 3px 6px rgba(220, 20, 60, 0.7))',
                        paddingTop: '0.5rem',
                        paddingBottom: '0.5rem',
                      }}>
                        CHÚC MỪNG!
                      </span>
                      <span className="text-5xl">🧧</span>
                    </motion.h1>
                    <p className="text-2xl md:text-3xl font-black text-white" style={{
                      textShadow: '2px 2px 0 #DC143C, 4px 4px 6px rgba(0,0,0,0.8)'
                    }}>
                      BẠN NHẬN ĐƯỢC LÌ XÌ!
                    </p>
                  </>
                ) : (
                  <>
                    <h1 className="text-5xl md:text-6xl font-black mb-5 flex items-center justify-center gap-3">
                      <span className="text-5xl">🎊</span>
                      <span style={{
                        background: 'linear-gradient(90deg, #FFD700 0%, #FFA500 50%, #FFD700 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        filter: 'drop-shadow(3px 3px 6px rgba(220, 20, 60, 0.7))',
                        paddingTop: '0.5rem',
                        paddingBottom: '0.5rem',
                      }}>
                        CHÚC MỪNG NĂM MỚI
                      </span>
                      <span className="text-5xl">🎊</span>
                    </h1>
                    <p className="text-xl md:text-2xl font-bold text-white" style={{
                      textShadow: '2px 2px 0 #DC143C, 4px 4px 6px rgba(0,0,0,0.8)'
                    }}>
                      VẠN SỰ NHƯ Ý - AN KHANG THỊNH VƯỢNG
                    </p>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* CỬA - CLICK VÀO ĐỂ MỞ */}
          <div className="relative" style={{ perspective: '1500px' }}>
            
            <div 
              onClick={() => {
                if (!isDoorOpen) {
                  setIsDoorOpen(true);
                  
                  // PHÁO HOA KHI MỞ CỬA
                  if (isThanTaiWinner) {
                    const fireworks = setInterval(() => {
                      confetti({
                        particleCount: 40,
                        angle: 60,
                        spread: 50,
                        origin: { x: 0, y: 0.8 },
                        colors: ['#FFD700', '#FF6347', '#FFA500'],
                        ticks: 100,
                      });
                      confetti({
                        particleCount: 40,
                        angle: 120,
                        spread: 50,
                        origin: { x: 1, y: 0.8 },
                        colors: ['#FFD700', '#FF6347', '#FFA500'],
                        ticks: 100,
                      });
                    }, 800);
                    
                    (window as any).__thanTaiFireworks = fireworks;
                  } else {
                    confetti({
                      particleCount: 50,
                      spread: 55,
                      origin: { y: 0.7 },
                      colors: ['#FFD700', '#FFA500'],
                      ticks: 120,
                    });
                  }
                }
              }}
              className={`relative flex ${!isDoorOpen ? 'cursor-pointer hover:scale-[1.03]' : ''} transition-transform`}
              style={{ 
                filter: 'drop-shadow(0 25px 50px rgba(0,0,0,0.9))',
              }}
            >
              {/* Khung vàng */}
              <div 
                className="absolute -inset-3 rounded-2xl"
                style={{
                  background: 'linear-gradient(135deg, #B8860B, #FFD700, #DAA520, #B8860B)',
                  boxShadow: isDoorOpen ? '0 0 80px rgba(255, 215, 0, 0.9)' : '0 0 60px rgba(255, 215, 0, 0.6)',
                }}
              />
              
              {/* Cánh TRÁI */}
              <motion.div
                animate={{ 
                  rotateY: isDoorOpen ? -130 : 0,
                  x: !isDoorOpen ? [0, -6, 6, -6, 6, 0] : 0,
                }}
                transition={{
                  rotateY: { duration: 1.5, ease: [0.34, 1.56, 0.64, 1] },
                  x: isDoorOpen ? {} : { 
                    duration: 0.6, 
                    repeat: Infinity, 
                    repeatDelay: 1.2,
                  }
                }}
                className="relative z-10"
                style={{
                  width: '180px',
                  height: '480px',
                  background: 'linear-gradient(135deg, #5A2D0C 0%, #6B3410 20%, #8B4513 40%, #A0522D 50%, #8B4513 60%, #6B3410 80%, #5A2D0C 100%)',
                  border: '8px solid #3D1F0A',
                  borderRight: '4px solid #3D1F0A',
                  borderRadius: '12px 0 0 12px',
                  boxShadow: 'inset -8px 0 20px rgba(0,0,0,0.5)',
                  transformStyle: 'preserve-3d',
                  transformOrigin: 'left center',
                }}
              >
                <div className="absolute inset-5 border-4 border-yellow-900/50 rounded"></div>
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-24 h-40 border-4 border-yellow-800/40 rounded-lg"></div>
                <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-24 h-40 border-4 border-yellow-800/40 rounded-lg"></div>
                
                <div
                  style={{
                    position: 'absolute',
                    right: '20px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '45px',
                    height: '45px',
                    background: 'radial-gradient(circle at 35% 35%, #FFD700, #FFA500, #DAA520)',
                    borderRadius: '50%',
                    border: '5px solid #5A2D0C',
                    boxShadow: !isDoorOpen 
                      ? '0 6px 12px rgba(0,0,0,0.7), 0 0 35px rgba(255,215,0,1)' 
                      : '0 6px 12px rgba(0,0,0,0.7)',
                  }}
                />
              </motion.div>
              
              {/* Cánh PHẢI */}
              <motion.div
                animate={{ 
                  rotateY: isDoorOpen ? 130 : 0,
                  x: !isDoorOpen ? [0, -6, 6, -6, 6, 0] : 0,
                }}
                transition={{
                  rotateY: { duration: 1.5, ease: [0.34, 1.56, 0.64, 1] },
                  x: isDoorOpen ? {} : { 
                    duration: 0.6, 
                    repeat: Infinity, 
                    repeatDelay: 1.2,
                  }
                }}
                className="relative z-10"
                style={{
                  width: '180px',
                  height: '480px',
                  background: 'linear-gradient(135deg, #5A2D0C 0%, #6B3410 20%, #8B4513 40%, #A0522D 50%, #8B4513 60%, #6B3410 80%, #5A2D0C 100%)',
                  border: '8px solid #3D1F0A',
                  borderLeft: '4px solid #3D1F0A',
                  borderRadius: '0 12px 12px 0',
                  boxShadow: 'inset 8px 0 20px rgba(0,0,0,0.5)',
                  transformStyle: 'preserve-3d',
                  transformOrigin: 'right center',
                }}
              >
                <div className="absolute inset-5 border-4 border-yellow-900/50 rounded"></div>
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-24 h-40 border-4 border-yellow-800/40 rounded-lg"></div>
                <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-24 h-40 border-4 border-yellow-800/40 rounded-lg"></div>
                
                <div
                  style={{
                    position: 'absolute',
                    left: '20px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '45px',
                    height: '45px',
                    background: 'radial-gradient(circle at 35% 35%, #FFD700, #FFA500, #DAA520)',
                    borderRadius: '50%',
                    border: '5px solid #5A2D0C',
                    boxShadow: !isDoorOpen 
                      ? '0 6px 12px rgba(0,0,0,0.7), 0 0 35px rgba(255,215,0,1)' 
                      : '0 6px 12px rgba(0,0,0,0.7)',
                  }}
                />
              </motion.div>
              
              {/* THẦN TÀI - CHỈ HIỆN NẾU TRÚNG */}
              {isDoorOpen && isThanTaiWinner && (
                <motion.div
                  initial={{ x: -280, scale: 0.3, opacity: 0 }}
                  animate={{ x: 0, scale: 2.5, opacity: 1 }}
                  transition={{ 
                    duration: 1.4, 
                    ease: [0.34, 1.56, 0.64, 1],
                    delay: 1.2,
                  }}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
                >
                  {/* Ánh sáng phía sau */}
                  <motion.div 
                    animate={{ 
                      scale: [1, 1.3, 1],
                      opacity: [0.5, 0.8, 0.5],
                    }}
                    transition={{
                      duration: 2.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: 'radial-gradient(circle, rgba(255,215,0,0.7) 0%, transparent 70%)',
                      filter: 'blur(70px)',
                      width: '600px',
                      height: '600px',
                      left: '50%',
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                    }}
                  />
                  
                  <img
                    src="/than-tai.gif"
                    alt="Thần Tài"
                    className="relative w-[300px] h-[300px] object-contain"
                    style={{
                      filter: 'drop-shadow(0 0 60px rgba(255, 215, 0, 1))',
                    }}
                  />
                </motion.div>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )}
</AnimatePresence>


      {/* Mini Game overlay */}
<AnimatePresence>
  {isMiniGameActive && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
    >
      
      {/* Choice screen - 10s */}
      {showMiniGameChoice && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl p-8 border-4 border-yellow-500 shadow-2xl max-w-md w-full text-center"
        >
          <h1 className="text-4xl md:text-5xl font-black mb-6" style={{
            background: 'linear-gradient(90deg, #FFD700 0%, #FFA500 50%, #FFD700 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(2px 2px 4px rgba(220, 20, 60, 0.6))',
          }}>
            🎮 MINI GAME 🎮
          </h1>
          
          <p className="text-white text-xl font-bold mb-6">
            Bạn có muốn tham gia?
          </p>
          
          <MiniGameChoiceTimer 
            onTimeout={() => {
              setShowMiniGameChoice(false);
              setIsMiniGameActive(false);
              if (user) {
                update(ref(database, `game/miniGameResults/${user.maNV}`), {
                  score: 0,
                  skipped: true,
                  timeout: true,
                  timestamp: Date.now(),
                });
              }
            }}
          />
          
          <div className="flex gap-4 mt-6">
            <button
              onClick={handlePlayMiniGame}
              className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-black text-xl px-6 py-4 rounded-xl border-3 border-white shadow-xl transform hover:scale-105 transition-all"
            >
              CHƠI
            </button>
            <button
              onClick={handleSkipMiniGame}
              className="flex-1 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-black text-xl px-6 py-4 rounded-xl border-3 border-white shadow-xl transform hover:scale-105 transition-all"
            >
              BỎ QUA
            </button>
          </div>
        </motion.div>
      )}

      {/* Countdown 3s */}
      {!showMiniGameChoice && !isMiniGamePlaying && !showMiniGameResult && (
        <div className="text-yellow-300 text-9xl font-black animate-pulse">
          {miniGameCountdown}
        </div>
      )}

      {/* Game playing */}
      {isMiniGamePlaying && miniGameConfig && (
        <div className="absolute inset-0 w-full h-full">
          <MiniGame
            duration={miniGameConfig.duration}
            coinPoints={miniGameConfig.coinPoints}
            goldPoints={miniGameConfig.goldPoints}
            bombPoints={miniGameConfig.bombPoints}
            coinSpeed={miniGameConfig.coinSpeed}
            goldSpeed={miniGameConfig.goldSpeed}
            bombSpeed={miniGameConfig.bombSpeed}
            spawnInterval={miniGameConfig.spawnInterval}
            coinRate={miniGameConfig.coinRate}
            goldRate={miniGameConfig.goldRate}
            bombRate={miniGameConfig.bombRate}
            onGameEnd={handleMiniGameEnd}
          />
        </div>
      )}

      {/* Result screen */}
      {showMiniGameResult && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-8 border-4 border-yellow-500 shadow-2xl max-w-lg w-full"
        >
          <h2 className="text-3xl font-black text-center mb-6" style={{
            background: 'linear-gradient(90deg, #FFD700 0%, #FFA500 50%, #FFD700 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(2px 2px 4px rgba(220, 20, 60, 0.6))',
            paddingTop: '0.5rem',
            paddingBottom: '0.5rem',
          }}>
            KẾT QUẢ CỦA BẠN
          </h2>
          
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 mb-6 space-y-3">
            <div className="flex justify-between items-center text-white font-bold text-lg">
              <span>🪙 Xu: {miniGameStats.coins}</span>
              <span className="text-yellow-300">× {miniGameConfig?.coinPoints || 50}</span>
              <span className="text-green-400">= {miniGameStats.coins * (miniGameConfig?.coinPoints || 50)}</span>
            </div>
            
            <div className="flex justify-between items-center text-white font-bold text-lg">
              <span>💰 Vàng: {miniGameStats.golds}</span>
              <span className="text-yellow-300">× {miniGameConfig?.goldPoints || 100}</span>
              <span className="text-green-400">= {miniGameStats.golds * (miniGameConfig?.goldPoints || 100)}</span>
            </div>
            
            <div className="flex justify-between items-center text-white font-bold text-lg">
              <span>💣 Bom: {miniGameStats.bombs}</span>
              <span className="text-yellow-300">× {miniGameConfig?.bombPoints || -100}</span>
              <span className="text-red-400">= {miniGameStats.bombs * (miniGameConfig?.bombPoints || -100)}</span>
            </div>
            
            <div className="border-t-2 border-white/30 pt-3 mt-3">
              <div className="flex justify-between items-center">
                <span className="text-white font-black text-2xl">🎯 TỔNG CỘNG:</span>
                <span className={`font-black text-4xl ${miniGameScore >= 0 ? 'text-yellow-300' : 'text-red-400'}`}>
                  {miniGameScore}
                </span>
              </div>
            </div>
          </div>
          
          <p className="text-yellow-200 text-center font-bold mb-6">
            Vui lòng chờ MC công bố kết quả...
          </p>
          
          <button
            onClick={handleCloseMiniGameResult}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-black text-lg px-6 py-3 rounded-lg"
          >
            ĐÓNG
          </button>
        </motion.div>
      )}

      {/* Skip confirm modal */}
      {showSkipConfirm && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10">
          <div className="bg-gradient-to-br from-gray-700 to-gray-900 rounded-2xl p-6 border-4 border-white shadow-2xl max-w-md w-full mx-4">
            <h3 className="text-2xl font-black text-yellow-300 mb-4 text-center">
              XÁC NHẬN BỎ QUA
            </h3>
            <p className="text-white font-bold text-center mb-6">
              Bạn có chắc chắn muốn bỏ qua Mini Game?
            </p>
            <div className="flex gap-3">
              <button
                onClick={confirmSkipMiniGame}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 rounded-lg"
              >
                BỎ QUA
              </button>
              <button
                onClick={() => setShowSkipConfirm(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold px-6 py-3 rounded-lg"
              >
                HỦY
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result close confirm modal */}
      {showResultCloseConfirm && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10">
          <div className="bg-gradient-to-br from-gray-700 to-gray-900 rounded-2xl p-6 border-4 border-white shadow-2xl max-w-md w-full mx-4">
            <h3 className="text-2xl font-black text-yellow-300 mb-4 text-center">
              XÁC NHẬN ĐÓNG
            </h3>
            <p className="text-white font-bold text-center mb-6">
              Bạn có chắc chắn muốn đóng kết quả?
            </p>
            <div className="flex gap-3">
              <button
                onClick={confirmCloseMiniGameResult}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-3 rounded-lg"
              >
                ĐÓNG
              </button>
              <button
                onClick={() => setShowResultCloseConfirm(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold px-6 py-3 rounded-lg"
              >
                HỦY
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )}
</AnimatePresence>

      {/* Secret reveal animation */}
      {isRevealingSecret && (
        <div className="fixed inset-0 bg-black/95 flex flex-col items-center justify-center z-50 p-4">
          <h1 className="text-yellow-300 text-3xl md:text-5xl font-black mb-8 animate-pulse text-center">
            🎯 ĐÁP ÁN BÍ ẨN 🎯
          </h1>
          
          {/* Animated keys */}
          <div className="flex gap-2 md:gap-3 mb-8 flex-wrap justify-center">
            {animatingKeys.map((keyData, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-yellow-400 to-yellow-600 text-red-900 font-black text-2xl md:text-4xl w-14 h-14 md:w-20 md:h-20 rounded-lg flex items-center justify-center border-4 border-yellow-700 shadow-2xl"
                style={{
                  animation: `flyAndArrange 4s ease-in-out forwards`,
                  animationDelay: `${index * 0.15}s`,
                }}
              >
                {keyData.letter}
              </div>
            ))}
          </div>
          
          <p className="text-yellow-300 text-3xl md:text-4xl font-black mb-8 tracking-widest">
            {animatingKeys.map(k => k.letter).join('')}
          </p>

          {/* Nút đóng */}
          <button
            onClick={() => setIsRevealingSecret(false)}
            className="bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 text-yellow-300 font-black text-lg px-8 py-3 rounded-lg border-3 border-yellow-400 shadow-xl transform hover:scale-105 transition-all"
          >
            ĐÓNG
          </button>
        </div>
      )}

      {/* Confirm submit modal */}
      {showConfirmModal && confirmQuestionId && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-yellow-600 to-yellow-700 rounded-2xl p-6 border-4 border-red-700 shadow-2xl max-w-md w-full mx-4">
            <h2 className="text-2xl font-black text-red-900 mb-4 text-center">
              XÁC NHẬN GỬI ĐÁP ÁN
            </h2>
            <div className="bg-white rounded-xl p-4 mb-4">
              <p className="text-red-900 font-black text-center text-2xl tracking-wider">
                {(answers[confirmQuestionId] || []).join('')}
              </p>
            </div>
            <p className="text-red-900 font-bold text-center mb-4">
              Bấm Enter lần nữa để xác nhận!<br/>
              Bấm Esc để hủy!
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleSubmitAnswer}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSubmitAnswer();
                  }
                }}
                className="flex-1 bg-gradient-to-br from-green-600 to-green-800 hover:from-green-700 hover:to-green-900 text-white font-black text-lg px-6 py-3 rounded-lg"
              >
                XÁC NHẬN
              </button>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setConfirmQuestionId(null);
                }}
                className="flex-1 bg-gradient-to-br from-gray-600 to-gray-800 hover:from-gray-700 hover:to-gray-900 text-white font-black text-lg px-6 py-3 rounded-lg"
              >
                HỦY
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bell confirm modal */}
      {showBellConfirmModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-red-800 to-red-900 rounded-2xl p-6 border-4 border-yellow-500 shadow-2xl max-w-md w-full mx-4">
            <h2 className="text-2xl font-black text-gold-shadow mb-4 text-center">
              🔔 RUNG CHUÔNG
            </h2>
            <p className="text-yellow-300 font-bold text-center mb-6 text-lg">
              Bạn chỉ được rung chuông 1 lần duy nhất!<br/>
              Bạn có chắc chắn?
            </p>
            <div className="flex gap-2">
              <button
                onClick={confirmRingBell}
                className="flex-1 bg-gradient-to-br from-yellow-500 to-yellow-700 hover:from-yellow-600 hover:to-yellow-800 text-red-900 font-black text-lg px-6 py-3 rounded-lg"
              >
                CHẮC CHẮN
              </button>
              <button
                onClick={() => setShowBellConfirmModal(false)}
                className="flex-1 bg-gradient-to-br from-gray-600 to-gray-800 hover:from-gray-700 hover:to-gray-900 text-white font-black text-lg px-6 py-3 rounded-lg"
              >
                HỦY
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-2xl p-6 border-4 border-white shadow-2xl max-w-md w-full mx-4">
            <p className="text-white font-black text-xl text-center">
              {successMessage}
            </p>
          </div>
        </div>
      )}

      {/* Revealed question detail modal */}
      {clickedRevealedQuestion && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setClickedRevealedQuestion(null)}>
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 border-4 border-white shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-black text-white mb-4 text-center">
              CÂU HỎI SỐ {clickedRevealedQuestion.order}
            </h2>
            
            <div className="bg-white rounded-xl p-4 mb-4">
              <p className="text-blue-900 text-lg font-bold leading-relaxed">
                {clickedRevealedQuestion.content}
              </p>
            </div>

            {clickedRevealedQuestion.mediaUrl && (
              <div className="bg-white rounded-xl p-3 mb-4">
                <img src={clickedRevealedQuestion.mediaUrl} alt="Câu hỏi" className="w-full h-48 object-cover rounded-lg" />
              </div>
            )}

            <div className="bg-white rounded-xl p-4 mb-4">
              <p className="text-blue-900 font-bold mb-2">Đáp án đúng:</p>
              <div className="flex gap-2 justify-center flex-wrap">
                {String(clickedRevealedQuestion.answer).split('').map((letter: string, index: number) => (
                  <div 
                    key={index}
                    className={`w-12 h-12 rounded-md border-3 flex items-center justify-center font-black text-xl ${
                      index === clickedRevealedQuestion.keyPosition - 1
                        ? 'bg-yellow-400 border-yellow-600 text-red-900 shadow-md'
                        : 'bg-white border-green-500 text-green-800'
                    }`}
                  >
                    {letter}
                  </div>
                ))}
              </div>
            </div>

            {submittedAnswers.has(clickedRevealedQuestion.id) && (
              <div className="bg-white rounded-xl p-4">
                <p className="text-blue-900 font-bold mb-2">Đáp án của bạn:</p>
                <div className="flex gap-2 justify-center flex-wrap">
                  {(answers[clickedRevealedQuestion.id] || []).map((letter: string, index: number) => (
                    <div 
                      key={index}
                      className={`w-12 h-12 rounded-md border-2 flex items-center justify-center font-black text-xl ${
                        myAnswersCorrect[clickedRevealedQuestion.id]
                          ? 'bg-white border-green-500 text-green-800'
                          : 'bg-white border-red-400 text-red-700'
                      }`}
                    >
                      {letter}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setClickedRevealedQuestion(null)}
              className="w-full mt-4 bg-white hover:bg-gray-100 text-blue-900 font-black text-lg px-6 py-3 rounded-lg"
            >
              ĐÓNG (Esc)
            </button>
          </div>
        </div>
      )}

      {/* Huy hiệu tên player - GÓC TRÁI TRÊN */}
      {user && (
        <div className="absolute top-4 left-4 z-40">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 backdrop-blur-md rounded-2xl px-4 py-3 border-3 border-yellow-400 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center border-3 border-white shadow-lg">
                <span className="text-2xl">👤</span>
              </div>
              <div>
                <p className="text-yellow-300 text-sm font-bold leading-tight">
                  {user.name}
                </p>
                <p className="text-yellow-200 text-xs font-semibold">
                  {user.maNV}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nút rung chuông */}
      <div className="flex justify-center mb-4">
        <button 
          onClick={handleRingBell}
          disabled={!canRingBell}
          className={`w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-yellow-500 shadow-2xl flex items-center justify-center transition-all ${
            canRingBell 
              ? 'bg-gradient-to-br from-red-700 to-red-900 hover:from-red-800 hover:to-red-950 hover:scale-110 hover:rotate-12 cursor-pointer' 
              : 'bg-gray-600 opacity-50 cursor-not-allowed'
          }`}
        >
          <svg className="w-12 h-12 md:w-16 md:h-16 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
          </svg>
        </button>
      </div>

      {/* Khung câu hỏi - LUÔN HIỆN, CĂN GIỮA */}
      <div className="w-full mx-auto mb-4 px-1">
        <div className="bg-gradient-to-br from-yellow-600/95 to-yellow-700/95 backdrop-blur-md rounded-xl p-2 md:p-4 mb-4 border-2 md:border-3 border-red-700 shadow-2xl">
          
          {/* Khi MC đã chọn câu nhưng chưa bấm Bắt đầu */}
          {selectedQuestionForPreview && !currentQuestion && (
            <>
              <div className="mb-3">
                <h3 className="text-lg md:text-xl font-black text-red-900 text-center">
                  CÂU HỎI SỐ {selectedQuestionForPreview.order}
                </h3>
                <p className="text-red-800 text-sm font-bold text-center">
                  {getQuestionTypeLabel(selectedQuestionForPreview.type)} • {selectedQuestionForPreview.answer.length} chữ cái
                </p>
              </div>
              
              <div className="bg-white/95 rounded-xl p-3 md:p-4 border-2 border-red-700 mb-3">
                <p className="text-red-900 text-base md:text-lg font-bold leading-relaxed text-center">
                  Đang chờ MC bắt đầu câu hỏi...
                </p>
              </div>

              {/* Hiển thị số ô đáp án */}
              <div className="flex gap-2 justify-center flex-wrap">
                {Array.from({ length: selectedQuestionForPreview.answer.length }).map((_, index) => (
                  <div 
                    key={index}
                    className={`w-10 h-10 md:w-12 md:h-12 rounded-md border-2 ${
                      index === selectedQuestionForPreview.keyPosition - 1
                        ? 'bg-red-200 border-red-800 border-3 shadow-md'
                        : 'bg-white/80 border-red-700'
                    }`}
                  />
                ))}
              </div>
            </>
          )}

          {/* Khi MC đã bấm Bắt đầu - Hiện câu hỏi */}
          {currentQuestion && (
            <>
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h3 className="text-lg md:text-xl font-black text-red-900">
                    CÂU HỎI SỐ {currentQuestion.questionId}
                  </h3>
                  <p className="text-red-800 text-sm font-bold">
                    {getQuestionTypeLabel(questions.find(q => q.order === currentQuestion.questionId)?.type || '')} • {currentQuestion.answerLength} chữ cái
                  </p>
                </div>
                <div className={`font-black text-xl md:text-2xl px-4 md:px-6 py-1.5 md:py-2 rounded-full border-2 ${
                  timeLeft <= 5 
                    ? 'bg-red-800 text-yellow-400 border-yellow-400 animate-pulse' 
                    : 'bg-red-800 text-yellow-400 border-yellow-400'
                }`}>
                  {timeLeft}s
                </div>
              </div>
              
              {/* Nội dung câu hỏi */}
              <div className="bg-white/95 rounded-xl p-3 md:p-4 border-2 border-red-700 mb-3">
                <p className="text-red-900 text-base md:text-lg font-bold leading-relaxed">
                  {currentQuestion.content}
                </p>
              </div>

              {/* Nếu có hình ảnh/video */}
              {currentQuestion.mediaUrl && (
                <div className="bg-white/95 rounded-xl p-3 border-2 border-red-700 mb-3">
                  <img src={currentQuestion.mediaUrl} alt="Câu hỏi" className="w-full h-40 md:h-48 object-cover rounded-lg" />
                </div>
              )}

              {/* Scrambled text - CHỈ HIỆN KHI TYPE = SCRAMBLE */}
              {currentQuestion.scrambledAnswer && (
                <div className="bg-purple-50 rounded-xl p-3 md:p-4 border-2 border-purple-300 mb-3">
                  <p className="text-purple-900 font-bold mb-2 text-center text-xs md:text-base">Xếp lại các chữ sau:</p>
                  <div className="flex gap-1.5 md:gap-2 justify-center flex-wrap">
                    {currentQuestion.scrambledAnswer.split('').map((letter: string, index: number) => (
                      <div
                        key={index}
                        className="bg-gradient-to-br from-purple-500 to-purple-700 text-white font-black text-lg md:text-xl w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center border-2 md:border-3 border-purple-800 shadow-lg"
                      >
                        {letter}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hiển thị đáp án đúng khi hết giờ */}
              {timeLeft === 0 && revealedResults[currentQuestion.questionDbId] && (
                <div>
                  <p className="text-red-900 font-bold text-center mb-2">Đáp án đúng:</p>
                  <div className="flex gap-2 justify-center flex-wrap">
                    {String(revealedResults[currentQuestion.questionDbId].correctAnswer).split('').map((letter: string, index: number) => (
                      <div 
                        key={index}
                        className={`w-10 h-10 md:w-12 md:h-12 rounded-md border-2 flex items-center justify-center font-black text-lg md:text-xl ${
                          index === currentQuestion.keyPosition - 1
                            ? 'bg-yellow-400 border-yellow-600 text-red-900 border-3 shadow-md'
                            : 'bg-white border-green-500 text-green-800'
                        }`}
                      >
                        {letter}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Khi chưa có gì */}
          {!selectedQuestionForPreview && !currentQuestion && (
            <div className="bg-white/95 rounded-xl p-3 md:p-4 border-2 border-red-700">
              <p className="text-red-900 text-base md:text-lg font-bold leading-relaxed text-center">
                Vui lòng chờ MC chọn câu hỏi...
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Danh sách 13 câu hỏi */}
      <div className="space-y-2 mb-4">
        {questions.map((question) => {
          const questionAnswer = answers[question.id] || [];
          const isCurrentQuestion = currentQuestion?.questionId === question.order;
          const isSubmitted = submittedAnswers.has(question.id);
          const isRevealed = revealedResults[question.id];
          const correctAnswer = isRevealed ? revealedResults[question.id].correctAnswer : null;
          const keyLetter = revealedKeys[question.id];
          const myAnswerCorrect = myAnswersCorrect[question.id];
          const isHighlighted = highlightedQuestion === question.id;
          
          if (!inputRefs.current[question.id]) {
            inputRefs.current[question.id] = [];
          }
          
          return (
            <div 
              key={question.id}
              onClick={() => handleClickQuestion(question)}
              className={`backdrop-blur-md rounded-xl p-2.5 border-2 shadow-lg transition-all ${
                (isCurrentQuestion || isHighlighted) && !isSubmitted
                  ? 'cursor-pointer bg-gradient-to-br from-yellow-500/95 to-yellow-600/95 border-yellow-300 ring-2 ring-yellow-400 animate-border-glow' // ← THÊM animate-border-glow
                  : isSubmitted && myAnswerCorrect === true
                  ? 'bg-gradient-to-br from-green-600/90 to-green-700/90 border-green-400 cursor-pointer'
                  : isSubmitted && myAnswerCorrect === false
                  ? 'bg-gradient-to-br from-red-600/70 to-red-700/70 border-red-400 opacity-75 cursor-pointer'
                  : isRevealed
                  ? 'bg-gradient-to-br from-blue-600/70 to-blue-700/70 border-blue-400 opacity-80 cursor-pointer'
                  : 'bg-gradient-to-br from-gray-600/70 to-gray-700/70 border-gray-500 opacity-50'
              }`}
            >
              <div className="grid grid-cols-[45px_1fr_auto_1fr_80px] md:grid-cols-[60px_1fr_auto_1fr_90px] items-center gap-1 md:gap-2">
                
                {/* Label Q - CỐ ĐỊNH 60px */}
                <span className={`px-3 py-1 rounded-full text-sm md:text-base font-black text-center ${
                  (isCurrentQuestion || isHighlighted) && !isSubmitted
                    ? 'bg-red-800 text-yellow-300' 
                    : isSubmitted && myAnswerCorrect === true
                    ? 'bg-green-800 text-yellow-300'
                    : isSubmitted && myAnswerCorrect === false
                    ? 'bg-red-800 text-yellow-300'
                    : isRevealed
                    ? 'bg-blue-800 text-white'
                    : 'bg-gray-700 text-gray-300'
                }`}>
                  Q{question.order}
                </span>

                {/* Left boxes */}
                <div className="flex gap-1 justify-end">
                  {Array.from({ length: question.keyPosition - 1 }).map((_, index) => {
                    const inputValue = isRevealed && correctAnswer 
                      ? correctAnswer[index] 
                      : questionAnswer[index] || '';
                    
                    return (isCurrentQuestion || isHighlighted) && !isSubmitted && !isRevealed ? (
                      <input
                        key={index}
                        ref={(el) => {
                          inputRefs.current[question.id][index] = el;
                        }}
                        type="text"
                        maxLength={1}
                        value={questionAnswer[index] || ''}
                        onChange={(e) => handleInputChange(question.id, index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, question.id, index)}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClickQuestion(question, index);
                        }}
                        data-question={question.id}
                        className="w-8 h-8 md:w-12 md:h-12 bg-white rounded-md text-center text-red-900 font-black text-base md:text-lg border-2 border-red-700 focus:ring-2 focus:ring-yellow-400 uppercase"
                        disabled={isSubmitted || timeLeft === 0}
                      />
                    ) : (
                      <div 
                        key={index}
                        className={`w-10 h-10 md:w-12 md:h-12 rounded-md border flex items-center justify-center font-black text-base md:text-lg uppercase ${
                          isRevealed 
                            ? 'bg-white border-green-500 text-green-800'
                            : isSubmitted
                            ? myAnswerCorrect 
                              ? 'bg-white border-green-500 text-green-800'
                              : 'bg-white border-red-400 text-red-700'
                            : 'bg-gray-400 border-gray-500'
                        }`}
                      >
                        {inputValue}
                      </div>
                    );
                  })}
                </div>

                {/* KEY box */}
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-md flex items-center justify-center font-black text-lg md:text-xl uppercase ${
                  isRevealed
                    ? 'bg-yellow-400 border-yellow-600 text-red-900 border-3 shadow-md'
                    : (isCurrentQuestion || isHighlighted) && !isSubmitted
                    ? 'bg-red-200 border-3 border-red-700 shadow-md'
                    : isSubmitted
                    ? myAnswerCorrect
                      ? 'bg-yellow-400 border-yellow-600 text-red-900 border-3'
                      : 'bg-yellow-400/60 border-red-500 text-red-800 border-3 opacity-80'
                    : 'bg-gray-500 border-2 border-gray-600'
                }`}>
                  {(isCurrentQuestion || isHighlighted) && !isSubmitted && !isRevealed ? (
                    <input
                      ref={(el) => {
                        inputRefs.current[question.id][question.keyPosition - 1] = el;
                      }}
                      type="text"
                      maxLength={1}
                      value={questionAnswer[question.keyPosition - 1] || ''}
                      onChange={(e) => handleInputChange(question.id, question.keyPosition - 1, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, question.id, question.keyPosition - 1)}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClickQuestion(question, question.keyPosition - 1);
                      }}
                      data-question={question.id}
                      className="w-full h-full bg-transparent text-center text-red-900 font-black text-lg md:text-xl focus:ring-0 uppercase"
                      disabled={isSubmitted || timeLeft === 0}
                    />
                  ) : isRevealed ? (
                    keyLetter
                  ) : isSubmitted && correctAnswer ? (
                    correctAnswer[question.keyPosition - 1]
                  ) : null}
                </div>

                {/* Right boxes */}
                <div className="flex gap-1 justify-start">
                  {Array.from({ length: question.answer.length - question.keyPosition }).map((_, index) => {
                    const actualIndex = question.keyPosition + index;
                    const inputValue = isRevealed && correctAnswer 
                      ? correctAnswer[actualIndex] 
                      : questionAnswer[actualIndex] || '';
                    
                    return (isCurrentQuestion || isHighlighted) && !isSubmitted && !isRevealed ? (
                      <input
                        key={index}
                        ref={(el) => {
                          inputRefs.current[question.id][actualIndex] = el;
                        }}
                        type="text"
                        maxLength={1}
                        value={questionAnswer[actualIndex] || ''}
                        onChange={(e) => handleInputChange(question.id, actualIndex, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, question.id, actualIndex)}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClickQuestion(question, actualIndex);
                        }}
                        data-question={question.id}
                        className="w-8 h-8 md:w-12 md:h-12 bg-white rounded-md text-center text-red-900 font-black text-base md:text-lg border-2 border-red-700 focus:ring-2 focus:ring-yellow-400 uppercase"
                        disabled={isSubmitted || timeLeft === 0}
                      />
                    ) : (
                      <div 
                        key={index}
                        className={`w-10 h-10 md:w-12 md:h-12 rounded-md border flex items-center justify-center font-black text-base md:text-lg uppercase ${
                          isRevealed 
                            ? 'bg-white border-green-500 text-green-800'
                            : isSubmitted
                            ? myAnswerCorrect 
                              ? 'bg-white border-green-500 text-green-800'
                              : 'bg-white border-red-400 text-red-700'
                            : 'bg-gray-400 border-gray-500'
                        }`}
                      >
                        {inputValue}
                      </div>
                    );
                  })}
                </div>

                {/* Status badge - CỐ ĐỊNH 90px */}
                <div className="flex items-center justify-end w-[90px]">
                  {(isCurrentQuestion || isHighlighted) && !isSubmitted && !isRevealed ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const answer = (answers[question.id] || []).join('');
                      if (answer.length === question.answer.length) {
                        setConfirmQuestionId(question.id);
                        setShowConfirmModal(true);
                      }
                    }}
                    disabled={!isCurrentQuestion || timeLeft === 0} // ← THÊM DÒNG NÀY
                    className={`font-black text-xs px-4 py-1.5 rounded-full border-2 shadow-md transform transition-all duration-200 whitespace-nowrap ${
                      isCurrentQuestion 
                        ? 'bg-gradient-to-br from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 text-yellow-300 border-yellow-400 hover:scale-105 active:scale-95 cursor-pointer'
                        : 'bg-gray-500 text-gray-300 border-gray-600 opacity-50 cursor-not-allowed'
                    }`} // ← SỬA CLASS
                  >
                    GỬI
                  </button>
                  ) : isSubmitted && myAnswerCorrect === true ? (
                    <span className="bg-green-500 text-white px-1.5 py-0.5 md:px-2 md:py-1 rounded-full text-[10px] md:text-xs font-bold whitespace-nowrap">✓</span>
                  ) : isSubmitted && myAnswerCorrect === false ? (
                    <span className="bg-red-500 text-white px-1.5 py-0.5 md:px-2 md:py-1 rounded-full text-[10px] md:text-xs font-bold whitespace-nowrap">✗</span>
                  ) : isRevealed ? (
                    <span className="bg-blue-500 text-white px-1.5 py-0.5 md:px-2 md:py-1 rounded-full text-[10px] md:text-xs font-bold whitespace-nowrap">ĐÃ HỎI</span>
                  ) : (
                    <span className="bg-gray-500 text-white px-1.5 py-0.5 md:px-2 md:py-1 rounded-full text-[10px] md:text-xs font-bold whitespace-nowrap">CHƯA MỞ</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ô chữ bí ẩn - Thay thế User info */}
      <div className="bg-gradient-to-br from-purple-800/95 via-purple-900/95 to-red-900/95 backdrop-blur-md rounded-3xl p-4 md:p-6 border-4 border-yellow-500 shadow-2xl relative overflow-hidden">
        {/* Hiệu ứng sáng */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/20 to-transparent animate-pulse"></div>
        
        <div className="relative z-10">
          <h2 className="text-xl md:text-2xl font-black text-gold-shadow mb-4 text-center animate-pulse-slow">
            🎯 Ô CHỮ BÍ ẨN 🎯
          </h2>
          
          <div className="flex gap-2 md:gap-3 justify-center flex-wrap">
            {questions.map((q) => {
              const keyLetter = revealedKeys[q.id];
              const isRevealed = revealedResults[q.id];
              
              return (
                <div 
                  key={q.id}
                  className={`w-12 h-12 md:w-16 md:h-16 rounded-full text-base md:text-2xl flex items-center justify-center font-black text-xl md:text-2xl border-4 shadow-lg transition-all ${
                    isRevealed
                      ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 border-red-700 text-red-900 animate-pulse-slow'
                      : 'bg-gradient-to-br from-gray-400 to-gray-500 border-gray-600 text-gray-700 opacity-60'
                  }`}
                >
                  {isRevealed ? keyLetter : q.order}
                </div>
              );
            })}
          </div>
          
          
        </div>
      </div>

    </div>
  );
}