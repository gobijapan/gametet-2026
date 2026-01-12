'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue, update, get, set, remove } from 'firebase/database';
import { auth, database } from '@/lib/firebase';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';


export default function MCPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<any[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [bellQueue, setBellQueue] = useState<any[]>([]);
  const [showBellModal, setShowBellModal] = useState(false);
  const [showTop5Modal, setShowTop5Modal] = useState(false);
  const [top5Results, setTop5Results] = useState<any[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [revealedQuestions, setRevealedQuestions] = useState<Set<number>>(new Set());
  const [revealedKeys, setRevealedKeys] = useState<{ [key: string]: string }>({});
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [isRevealingSecret, setIsRevealingSecret] = useState(false);
const [revealedSecretWord, setRevealedSecretWord] = useState('');
const circleRefs = useRef<{ [key: number]: HTMLButtonElement | null }>({});
const [isThanTaiCountdown, setIsThanTaiCountdown] = useState(false);
const [thanTaiCountdown, setThanTaiCountdown] = useState(5);
const [thanTaiWinners, setThanTaiWinners] = useState<any[]>([]);
const [showThanTaiListButton, setShowThanTaiListButton] = useState(false);
const [isMusicPlaying, setIsMusicPlaying] = useState(true);

const [isMiniGameActive, setIsMiniGameActive] = useState(false);
const [showMiniGameLeaderboard, setShowMiniGameLeaderboard] = useState(false);
const [miniGameResults, setMiniGameResults] = useState<any[]>([]);
const [showMiniGameMenu, setShowMiniGameMenu] = useState(false);
const [showThanTaiMenu, setShowThanTaiMenu] = useState(false);


  // Get question type label
  const getQuestionTypeLabel = (type: string) => {
    switch(type) {
      case 'crossword': return 'Ô chữ';
      case 'image': return 'Đuổi hình bắt chữ';
      case 'scramble': return 'Xáo chữ';
      default: return 'Câu hỏi';
    }
  };

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

        if (foundUser && (foundUser.role === 'mc' || foundUser.role === 'admin')) {
          setUser(foundUser);
        } else {
          router.push('/player');
        }
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // Listen to questions
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

  // Listen to current question
  useEffect(() => {
    const gameRef = ref(database, 'game/currentQuestion');
    const unsubscribe = onValue(gameRef, (snapshot) => {
      if (snapshot.exists()) {
        setCurrentQuestion(snapshot.val());
      } else {
        setCurrentQuestion(null);
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
        const revealed = new Set<number>();
        const keys: { [key: string]: string } = {};
        
        questions.forEach(q => {
          if (resultsData[q.id]) {
            revealed.add(q.order);
            if (resultsData[q.id].keyLetter) {
              keys[q.id] = resultsData[q.id].keyLetter;
            }
          }
        });
        
        setRevealedQuestions(revealed);
        setRevealedKeys(keys);
      }
    });

    return () => unsubscribe();
  }, [questions]);

  // Listen to bell queue
  useEffect(() => {
    const bellRef = ref(database, 'bellQueue');
    const unsubscribe = onValue(bellRef, (snapshot) => {
      if (snapshot.exists()) {
        const bellData = snapshot.val();
        const bellArray = Object.keys(bellData).map((key) => ({
          maNV: key,
          ...bellData[key],
        }));
        bellArray.sort((a, b) => a.timestamp - b.timestamp);
        setBellQueue(bellArray);
      } else {
        setBellQueue([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen to online count
  useEffect(() => {
    const onlineRef = ref(database, 'online');
    const unsubscribe = onValue(onlineRef, (snapshot) => {
      if (snapshot.exists()) {
        setOnlineCount(Object.keys(snapshot.val()).length);
      } else {
        setOnlineCount(0);
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen to Mini Game results
useEffect(() => {
  const resultsRef = ref(database, 'game/miniGameResults');
  const unsubscribe = onValue(resultsRef, async (snapshot) => {
    if (snapshot.exists()) {
      const resultsData = snapshot.val();
      
      // Get user info
      const usersRef = ref(database, 'users');
      const usersSnapshot = await get(usersRef);
      const usersData = usersSnapshot.exists() ? usersSnapshot.val() : {};
      
      const resultsArray = Object.keys(resultsData).map((msnv) => ({
        msnv,
        name: usersData[msnv]?.name || 'Unknown',
        ...resultsData[msnv],
      }));
      
      // Sort by score
      resultsArray.sort((a, b) => b.score - a.score);
      
      setMiniGameResults(resultsArray);
    } else {
      setMiniGameResults([]);
    }
  });

  return () => unsubscribe();
}, []);

// Close menu when click outside
useEffect(() => {
  const handleClickOutside = () => {
    setShowMiniGameMenu(false);
    setShowThanTaiMenu(false);
  };

  if (showMiniGameMenu || showThanTaiMenu) {
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }
}, [showMiniGameMenu, showThanTaiMenu]);

  // Timer countdown
useEffect(() => {
  if (!currentQuestion?.timerEnd) return;

  const interval = setInterval(() => {
    const now = Date.now();
    const timeRemaining = Math.max(0, Math.floor((currentQuestion.timerEnd - now) / 1000));
    setTimeLeft(timeRemaining);

    if (timeRemaining === 0) {
      clearInterval(interval);
      // Tự động tính kết quả khi hết giờ
      if (currentQuestion?.questionDbId) {
        autoCalculateResults(currentQuestion.questionDbId);
      }
    }
  }, 100);

  return () => clearInterval(interval);
}, [currentQuestion?.timerEnd, currentQuestion?.questionDbId]);

  // Handle select question
  const handleSelectQuestion = async (question: any) => {
    setSelectedQuestion(question);
    
    // Gửi signal cho Player
    await update(ref(database, 'game'), {
      selectedQuestion: {
        questionId: question.id,
        order: question.order,
        answerLength: question.answer.length,
        keyPosition: question.keyPosition,
        type: question.type,
      }
    });
    
    // Load kết quả nếu câu đã hỏi
    if (revealedQuestions.has(question.order)) {
      const resultRef = ref(database, `results/${question.id}`);
      const snapshot = await get(resultRef);
      if (snapshot.exists()) {
        const resultData = snapshot.val();
        setTop5Results(resultData.top5 || []);
      }
    } else {
      setTop5Results([]);
    }
  };

  // Handle start question
  const handleStartQuestion = async () => {
    if (!selectedQuestion) return;

    setIsCountingDown(true);
    
    await update(ref(database, 'game'), {
  countdown: {
    isActive: true,
    startTime: Date.now(),
  },
});

    for (let i = 3; i > 0; i--) {
      setCountdown(i);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    setIsCountingDown(false);

    const startTimestamp = Date.now();
    const timerEnd = startTimestamp + (selectedQuestion.timer || 30) * 1000;
    
    await update(ref(database, 'game'), {
      countdown: {
        isActive: false,
      },
      currentQuestion: {
        questionId: selectedQuestion.order,
        questionDbId: selectedQuestion.id,
        content: selectedQuestion.content,
        mediaUrl: selectedQuestion.mediaUrl || null,
        scrambledAnswer: selectedQuestion.scrambledAnswer || null,
        answerLength: selectedQuestion.answer.length,
        keyPosition: selectedQuestion.keyPosition,
        timerEnd,
        timer: selectedQuestion.timer || 30,
        startTimestamp,
      },
    });
  };

  // Handle Mini Game
const handleMiniGame = async () => {
  // Reset kết quả cũ
  await remove(ref(database, 'game/miniGameResults'));
  
  // Kích hoạt mới
  await set(ref(database, 'game/miniGame'), {
    active: true,
    timestamp: Date.now(),
    round: Date.now(), // ← Dùng timestamp làm round ID
  });
  
  setIsMiniGameActive(true);
  setMiniGameResults([]); // Reset bảng xếp hạng
  
  toast.success('Đã kích hoạt Mini Game!');
};

const handleViewLeaderboard = () => {
  setShowMiniGameLeaderboard(true);
};

const handleCloseMiniGame = async () => {
  setShowMiniGameLeaderboard(false);
  
  // Đóng Mini Game cho tất cả
  await update(ref(database, 'game/miniGame'), {
    active: false,
  });
  
  setIsMiniGameActive(false);
  
  toast.success('Đã đóng Mini Game!');
};

  // Handle show top 5
  const handleShowTop5 = async () => {
  if (!selectedQuestion) return;

  // Nếu câu đã hỏi rồi, CHỈ LẤY KẾT QUẢ ĐÃ LƯU
  if (isQuestionRevealed) {
    const resultRef = ref(database, `results/${selectedQuestion.id}`);
    const snapshot = await get(resultRef);
    if (snapshot.exists()) {
      const resultData = snapshot.val();
      setTop5Results(resultData.top5 || []);
      setShowTop5Modal(true);
    }
    return;
  }

  // Nếu câu VỪA HẾT GIỜ, TÍNH MỚI
  const answersRef = ref(database, `answers/${selectedQuestion.id}`);
  const snapshot = await get(answersRef);

  let top5: any[] = [];

  if (snapshot.exists()) {
    const answersData = snapshot.val();
    
    const usersRef = ref(database, 'users');
    const usersSnapshot = await get(usersRef);
    const usersData = usersSnapshot.exists() ? usersSnapshot.val() : {};

    const answersArray = Object.keys(answersData).map((key) => ({
      maNV: key,
      name: usersData[key]?.name || 'Unknown',
      ...answersData[key],
    }));

    const validAnswers = answersArray.filter(
      (a) => a.timestamp >= (currentQuestion?.startTimestamp || 0)
    );

    const correctAnswers = validAnswers.filter(
      (a) => a.answer.toUpperCase() === selectedQuestion.answer.toUpperCase()
    );

    correctAnswers.sort((a, b) => a.timestamp - b.timestamp);

    top5 = correctAnswers.slice(0, 5).map((a, index) => ({
      ...a,
      rank: index + 1,
      timeInSeconds: ((a.timestamp - (currentQuestion?.startTimestamp || 0)) / 1000).toFixed(1),
    }));
  }

  await set(ref(database, `results/${selectedQuestion.id}`), {
    correctAnswer: selectedQuestion.answer,
    keyLetter: selectedQuestion.answer[selectedQuestion.keyPosition - 1],
    keyPosition: selectedQuestion.keyPosition,
    top5,
    timestamp: Date.now(),
  });

  setRevealedQuestions(prev => new Set([...prev, selectedQuestion.order]));
  
  setTop5Results(top5);
  setShowTop5Modal(true);
};

  // Auto calculate results when time is up
const autoCalculateResults = async (questionId: string) => {
  const question = questions.find(q => q.id === questionId);
  if (!question) return;

  const answersRef = ref(database, `answers/${questionId}`);
  const snapshot = await get(answersRef);

  if (snapshot.exists()) {
    const answersData = snapshot.val();
    
    const usersRef = ref(database, 'users');
    const usersSnapshot = await get(usersRef);
    const usersData = usersSnapshot.exists() ? usersSnapshot.val() : {};

    const answersArray = Object.keys(answersData).map((key) => ({
      maNV: key,
      name: usersData[key]?.name || 'Unknown',
      ...answersData[key],
    }));

    const validAnswers = answersArray.filter(
      (a) => a.timestamp >= (currentQuestion?.startTimestamp || 0)
    );

    const correctAnswers = validAnswers.filter(
      (a) => a.answer.toUpperCase() === question.answer.toUpperCase()
    );

    correctAnswers.sort((a, b) => a.timestamp - b.timestamp);

    const top5 = correctAnswers.slice(0, 5).map((a, index) => ({
      ...a,
      rank: index + 1,
      timeInSeconds: ((a.timestamp - (currentQuestion?.startTimestamp || 0)) / 1000).toFixed(2),
    }));

    // Lưu kết quả ngay
    await set(ref(database, `results/${questionId}`), {
      correctAnswer: question.answer,
      keyLetter: question.answer[question.keyPosition - 1],
      keyPosition: question.keyPosition,
      top5,
      timestamp: Date.now(),
    });

    setRevealedQuestions(prev => new Set([...prev, question.order]));
  }
};

  // Handle close top 5
  const handleCloseTop5 = async () => {
    setShowTop5Modal(false);
    await remove(ref(database, 'game/currentQuestion'));
    await remove(ref(database, 'game/selectedQuestion'));
  };

  // Handle reveal secret
  const handleRevealSecret = () => {
  setShowSecretModal(true);
};

const confirmRevealSecret = async () => {
  setShowSecretModal(false);
  
  const configRef = ref(database, 'config');
  const configSnapshot = await get(configRef);
  
  if (!configSnapshot.exists() || !configSnapshot.val().keyMapping) {
    toast.error('Chưa thiết lập Ô Bí Ẩn!');
    return;
  }
  
  const config = configSnapshot.val();
  
  // Tính toán vị trí các vòng tròn
  const keysData = Object.keys(config.keyMapping).map(position => {
    const keyInfo = config.keyMapping[position];
    const questionOrder = keyInfo.fromQuestion;
    const circleElement = circleRefs.current[questionOrder];
    
    let startX = window.innerWidth / 2;
    let startY = 100;
    
    if (circleElement) {
      const rect = circleElement.getBoundingClientRect();
      startX = rect.left + rect.width / 2;
      startY = rect.top + rect.height / 2;
    }
    
    return {
      position: parseInt(position),
      letter: keyInfo.letter,
      fromQuestion: questionOrder,
      startX,
      startY,
    };
  });
  
  // Bắt đầu animation
  setIsRevealingSecret(true);
  setRevealedSecretWord(config.secretWord);
  
  // Lưu data để animation sử dụng
  (window as any).__secretKeysData = keysData;
  
  // Gửi signal cho Player
  await update(ref(database, 'game'), {
    secretRevealed: true,
    secretWord: config.secretWord,
    keyMapping: config.keyMapping,
    revealTimestamp: Date.now(),
  });
  
  // Confetti sau 4.5s
  setTimeout(() => {
    confetti({
      particleCount: 300,
      spread: 120,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FFA500', '#FF6347', '#DC143C'],
      ticks: 200,
    });
    
    setTimeout(() => {
      confetti({
        particleCount: 200,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#FFD700', '#FFA500'],
      });
      confetti({
        particleCount: 200,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#FF6347', '#DC143C'],
      });
    }, 500);
  }, 4500);
};

const handleCloseSecretAnimation = async () => {
  setIsRevealingSecret(false);
  
  await update(ref(database, 'game'), {
    secretRevealed: false,
  });
};

// Handle Thần Tài
const handleThanTai = async () => {
  // Bắt đầu đếm ngược ngay (không cần modal)
  setIsThanTaiCountdown(true);
  setThanTaiCountdown(3);
  
  for (let i = 3; i > 0; i--) {
    setThanTaiCountdown(i);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  setIsThanTaiCountdown(false);
  
  // Random và gửi signal
  await triggerThanTai();
};

const triggerThanTai = async () => {
  // Lấy cài đặt
  console.log('Triggering Thần Tài...');
  const configRef = ref(database, 'config/thanTaiCount');
  const configSnapshot = await get(configRef);
  const thanTaiCount = configSnapshot.exists() ? configSnapshot.val() : 10;
  
  console.log('Thần Tài count:', thanTaiCount);
  // Lấy danh sách online
  const onlineRef = ref(database, 'online');
  const onlineSnapshot = await get(onlineRef);
  
  if (!onlineSnapshot.exists()) {
    console.log('Không có ai online!');
    toast.error('Không có ai online!');
    return;
  }
  
  const onlineUsers = Object.keys(onlineSnapshot.val());
  console.log('Online users:', onlineUsers);
  
  const finalCount = Math.min(thanTaiCount, onlineUsers.length);
  
  if (onlineUsers.length === 0) {
  toast.error('Không có ai online!');
  return;
}
console.log('Final count:', finalCount);
  
  // Random
  const shuffled = onlineUsers.sort(() => 0.5 - Math.random());
  const winners = shuffled.slice(0, finalCount);
  
  // Lấy thông tin
  const usersRef = ref(database, 'users');
  const usersSnapshot = await get(usersRef);
  const usersData = usersSnapshot.exists() ? usersSnapshot.val() : {};
  
  const winnersData = winners.map(msnv => ({
    msnv,
    name: usersData[msnv]?.name || 'Unknown',
  }));
  
  setThanTaiWinners(winnersData);

  const audio = new Audio('/than-tai-music.mp3');
audio.volume = 0.8; // 80% volume
audio.play();

// Lưu để dừng sau
(window as any).__thanTaiAudio = audio;
  
  // Gửi signal
  const winnersObj: any = {};
  winners.forEach(msnv => {
    winnersObj[msnv] = true;
  });

  console.log('Winners:', winnersData);
  console.log('Sending signal to Firebase...');
  
  await set(ref(database, 'game/thanTai'), {
    active: true,
    winners: winnersObj,
    count: finalCount,
    timestamp: Date.now(),
  });
  console.log('Signal sent!');
  console.log('Data saved to Firebase!');
  
  toast.success(`Đã chọn ${thanTaiCount} người!`);
};

const handleCancelThanTai = () => {
  setIsThanTaiCountdown(false);
};

const handleCloseThanTai = async () => {
  setShowThanTaiListButton(true);
  
  // Dừng nhạc
  if ((window as any).__thanTaiAudio) {
    (window as any).__thanTaiAudio.pause();
    (window as any).__thanTaiAudio.currentTime = 0;
  }
  
  // XÓA FLAG active để Player mới vào không thấy
  await update(ref(database, 'game/thanTai'), {
    active: false,
  });
};

const handleViewThanTaiList = () => {
  setShowThanTaiListButton(false); // Ẩn nút "Xem lại" → Modal hiện lại
};

  // Handle toggle answered
  const handleToggleAnswered = async (maNV: string, currentValue: boolean) => {
    await update(ref(database, `bellQueue/${maNV}`), {
      answered: !currentValue
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-yellow-300 text-2xl font-bold">Đang tải...</div>
      </div>
    );
  }

  const isQuestionRevealed = selectedQuestion && revealedQuestions.has(selectedQuestion.order);
  const uncheckedBells = bellQueue.filter(b => !b.answered);
  const bellCount = uncheckedBells.length;

  return (
    <div className="min-h-screen p-4">
      
      {/* Countdown overlay */}
      {isCountingDown && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
          <div className="text-yellow-300 text-9xl font-black animate-pulse">
            {countdown}
          </div>
        </div>
      )}

      {/* Thần Tài countdown */}
      {isThanTaiCountdown && (
        <div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-50">
          <div className="text-orange-400 text-9xl font-black animate-pulse mb-8">
            {thanTaiCountdown}
          </div>
          <p className="text-yellow-300 text-2xl font-bold mb-8">
            Thần Tài Chuẩn Bị Gõ Cửa...
          </p>
          <button
            onClick={handleCancelThanTai}
            className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-3 rounded-lg"
          >
            HỦY
          </button>
        </div>
      )}

      {/* Secret reveal animation */}
      <AnimatePresence>
        {isRevealingSecret && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 flex flex-col items-center justify-center z-50 p-4"
          >
            <motion.h1
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.8, ease: "backOut" }}
              className="text-yellow-300 text-4xl md:text-6xl font-black mb-12 text-center"
              style={{
                textShadow: '4px 4px 0 #DC143C, 8px 8px 0 #8B0000, 12px 12px 20px rgba(0,0,0,0.8)'
              }}
            >
              🎯 ĐÁP ÁN BÍ ẨN 🎯
            </motion.h1>
            
            {/* Các chữ bay từ vòng tròn xuống */}
            <div className="relative mb-8" style={{ minHeight: '120px' }}>
              <div className="flex gap-2 md:gap-3 justify-center">
                {(() => {
                  const keysData = (window as any).__secretKeysData || [];
                  const centerY = window.innerHeight / 2;
                  
                  return keysData.map((keyData: any, index: number) => {
                    const targetX = (index - keysData.length / 2) * 80 + window.innerWidth / 2;
                    
                    return (
                      <motion.div
                        key={keyData.position}
                        initial={{
                          position: 'fixed',
                          left: keyData.startX,
                          top: keyData.startY,
                          x: '-50%',
                          y: '-50%',
                          scale: 1,
                          rotate: 0,
                        }}
                        animate={{
                          left: targetX,
                          top: centerY - 50,
                          scale: [1, 1.5, 1.2, 1],
                          rotate: 720,
                        }}
                        transition={{
                          duration: 3,
                          delay: index * 0.15,
                          ease: "easeInOut",
                        }}
                        className="bg-gradient-to-br from-yellow-400 to-yellow-600 text-red-900 font-black text-3xl md:text-5xl w-16 h-16 md:w-24 md:h-24 rounded-lg flex items-center justify-center border-4 border-yellow-700 shadow-2xl"
                        style={{
                          boxShadow: `0 0 40px rgba(255, 215, 0, ${0.5 + Math.sin(Date.now() / 500) * 0.3})`
                        }}
                      >
                        {keyData.letter}
                      </motion.div>
                    );
                  });
                })()}
              </div>
            </div>
            
            <motion.p
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 4, duration: 0.5 }}
              className="text-yellow-300 text-4xl md:text-5xl font-black mb-8 tracking-widest"
              style={{
                textShadow: '3px 3px 0 #DC143C, 6px 6px 0 #8B0000'
              }}
            >
              {revealedSecretWord}
            </motion.p>

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 4.5, duration: 0.3 }}
              onClick={handleCloseSecretAnimation}
              className="bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 text-yellow-300 font-black text-xl px-10 py-4 rounded-xl border-4 border-yellow-400 shadow-2xl transform hover:scale-105 transition-all"
            >
              ĐÓNG
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      

      {/* Question circles - TRÊN CÙNG, TỰ ĐỘNG FIT */}
      <div className="mb-4">
        <div className="bg-gradient-to-br from-red-800/95 to-red-900/95 backdrop-blur-md rounded-2xl p-4 border-4 border-yellow-500 shadow-2xl">
          <div className="flex gap-2 justify-center">
            {questions.map((q) => {
              const isSelected = selectedQuestion?.id === q.id;
              const isCurrent = currentQuestion?.questionId === q.order;
              const isRevealed = revealedQuestions.has(q.order);
              const keyLetter = revealedKeys[q.id];
              
              return (
                <button
                  key={q.id}
                  ref={(el) => { circleRefs.current[q.order] = el; }}
                  onClick={() => handleSelectQuestion(q)}
                  style={{
                    flex: '1 1 0',
                    maxWidth: '112px',
                    minWidth: '40px',
                    aspectRatio: '1/1'
                  }}
                  className={`rounded-full border-4 font-black text-2xl md:text-3xl shadow-lg transition-all ${
                    isSelected
                      ? 'bg-yellow-400 border-yellow-600 text-red-900 ring-4 ring-yellow-300 scale-110'
                      : isCurrent
                      ? 'bg-green-500 border-green-700 text-white scale-105'
                      : isRevealed
                      ? 'bg-blue-400 border-blue-600 text-white'
                      : 'bg-gray-400 border-gray-600 text-gray-700 hover:scale-105'
                  }`}
                >
                  {isRevealed ? keyLetter : q.order}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected question display - CĂN GIỮA */}
      {selectedQuestion && (
        <div className="max-w-5xl mx-auto">
          <div className="bg-gradient-to-br from-yellow-400/95 to-yellow-600/95 backdrop-blur-md rounded-2xl p-6 border-4 border-red-700 shadow-2xl">
            
            {/* Question info - CĂN GIỮA */}
            <div className="text-center mb-4">
              <h3 className="text-3xl md:text-4xl font-black text-white" style={{
                textShadow: '2px 2px 0 #DC143C, 4px 4px 0 #8B0000, 6px 6px 10px rgba(0,0,0,0.4)'
              }}>
                CÂU HỎI SỐ {selectedQuestion.order}
              </h3>
              <p className="text-red-800 text-base md:text-lg font-bold">
                {getQuestionTypeLabel(selectedQuestion.type)} • {selectedQuestion.answer.length} chữ cái
              </p>
              {currentQuestion?.questionId === selectedQuestion.order && (
                <div className={`inline-block font-black text-4xl md:text-5xl px-6 py-3 rounded-full border-4 mt-3 ${
                  timeLeft <= 5
                    ? 'bg-red-800 text-yellow-400 border-yellow-400 animate-pulse'
                    : 'bg-red-800 text-yellow-400 border-yellow-400'
                }`}>
                  {timeLeft}s
                </div>
              )}
            </div>

            {/* Answer boxes preview */}
            <div className="bg-white/90 rounded-xl p-4 mb-4 border-2 border-red-700">
              <div className="flex gap-2 justify-center flex-wrap">
                {Array.from(selectedQuestion.answer).map((letter: any, index: number) => {
                  const isKey = index === selectedQuestion.keyPosition - 1;
                  const shouldReveal = isQuestionRevealed || (currentQuestion && timeLeft === 0);
                  
                  return (
                    <div 
                      key={index}
                      className={`w-12 h-12 md:w-14 md:h-14 rounded-md flex items-center justify-center font-black text-xl border-3 ${
                        isKey
                          ? 'bg-yellow-400 border-yellow-600 text-red-900 ring-2 ring-yellow-500'
                          : shouldReveal
                          ? 'bg-white border-red-700 text-red-900'
                          : 'bg-gray-200 border-gray-400 text-gray-400'
                      }`}
                    >
                      {shouldReveal ? letter : null}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Question content - CHỈ HIỆN KHI ĐÃ BẮT ĐẦU HOẶC ĐÃ HỎI */}
            {(currentQuestion?.questionId === selectedQuestion.order || isQuestionRevealed) && (
              <>
                <div className="bg-white/95 rounded-xl p-4 mb-4 border-2 border-red-700">
                  <p className="text-red-900 text-lg md:text-xl font-bold leading-relaxed">
                    {selectedQuestion.content}
                  </p>
                </div>

                {selectedQuestion.mediaUrl && (
                  <div className="bg-white/95 rounded-xl p-3 border-2 border-red-700 mb-4">
                    <img src={selectedQuestion.mediaUrl} alt="Câu hỏi" className="w-full max-h-96 object-contain rounded-lg" />
                  </div>
                )}
                {/* Scrambled text - CHỈ HIỆN KHI TYPE = SCRAMBLE */}
                {selectedQuestion.type === 'scramble' && selectedQuestion.scrambledAnswer && (
                  <div className="bg-purple-50 rounded-xl p-4 border-2 border-purple-300 mb-4">
                    <p className="text-purple-900 font-bold mb-3 text-center">Xếp lại các chữ sau:</p>
                    <div className="flex gap-2 justify-center flex-wrap">
                      {selectedQuestion.scrambledAnswer.split('').map((letter: string, index: number) => (
                        <div
                          key={index}
                          className="bg-gradient-to-br from-purple-500 to-purple-700 text-white font-black text-2xl w-12 h-12 md:w-14 md:h-14 rounded-lg flex items-center justify-center border-3 border-purple-800 shadow-lg"
                        >
                          {letter}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Start button - NHỎ GỌN */}
            {!isQuestionRevealed && !currentQuestion && (
              <div className="flex justify-center">
                <button
                  onClick={handleStartQuestion}
                  disabled={isCountingDown}
                  className="bg-gradient-to-br from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 text-white font-black text-lg px-8 py-2.5 rounded-xl border-3 border-green-900 shadow-xl transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCountingDown ? 'ĐANG ĐẾM NGƯỢC...' : 'BẮT ĐẦU'}
                </button>
              </div>
            )}

            {/* Show top 5 button - HIỆN KHI HẾT GIỜ HOẶC CÂU ĐÃ HỎI */}
            {((currentQuestion?.questionId === selectedQuestion.order && timeLeft === 0) || isQuestionRevealed) && (
              <div className="flex justify-center">
                <button
                  onClick={handleShowTop5}
                  className="bg-gradient-to-br from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white font-black text-lg px-8 py-2.5 rounded-xl border-3 border-blue-900 shadow-xl transform hover:scale-105 transition-all"
                >
                  {isQuestionRevealed ? 'XEM LẠI TOP 5' : 'XEM TOP 5'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Control buttons - GÓC DƯỚI TRÁI - FIXED */}
      <div className="fixed bottom-4 left-4 flex flex-col gap-3 z-40">
        {/* Mở đáp án bí ẩn */}
        <div className="group relative">
          <button
            onClick={handleRevealSecret}
            className="w-20 h-20 bg-gradient-to-br from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900 text-4xl rounded-full border-4 border-yellow-500 shadow-2xl transform hover:scale-110 transition-all flex items-center justify-center"
          >
            🎯
          </button>
          <span className="absolute left-24 top-1/2 -translate-y-1/2 bg-black text-white px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-sm font-bold pointer-events-none">
            Mở đáp án bí ẩn
          </span>
        </div>

        {/* Mini game */}
        <div className="group relative">
          <button
            onClick={() => setShowMiniGameMenu(!showMiniGameMenu)}
            className="w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-4xl rounded-full border-4 border-yellow-500 shadow-2xl transform hover:scale-110 transition-all flex items-center justify-center relative"
          >
            🎮
          </button>
          
          {/* Tooltip */}
          <span className="absolute left-24 top-1/2 -translate-y-1/2 bg-black text-white px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-sm font-bold pointer-events-none">
            Mini game
          </span>
          
          {/* Menu con */}
          {showMiniGameMenu && (
            <div className="absolute left-24 top-0 bg-gradient-to-br from-blue-700 to-blue-900 rounded-xl shadow-2xl border-3 border-yellow-400 overflow-hidden z-50 min-w-[200px]">
              <button
                onClick={() => {
                  setShowMiniGameMenu(false);
                  handleMiniGame();
                }}
                className={`w-full px-4 py-3 text-left font-bold text-white hover:bg-blue-600 transition-colors flex items-center gap-3 ${
                  isMiniGameActive ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <span className="text-2xl">▶️</span>
                <span>Chơi game</span>
              </button>
              
              <div className="border-t border-blue-500"></div>
              
              <button
                onClick={() => {
                  setShowMiniGameMenu(false);
                  handleViewLeaderboard();
                }}
                className="w-full px-4 py-3 text-left font-bold text-white hover:bg-blue-600 transition-colors flex items-center gap-3"
              >
                <span className="text-2xl">📋</span>
                <span>Xem danh sách</span>
              </button>
            </div>
          )}
        </div>

        {/* Thần tài */}
        <div className="group relative">
          <button
            onClick={() => setShowThanTaiMenu(!showThanTaiMenu)}
            className="w-20 h-20 bg-gradient-to-br from-orange-600 to-orange-800 hover:from-orange-700 hover:to-orange-900 text-4xl rounded-full border-4 border-yellow-500 shadow-2xl transform hover:scale-110 transition-all flex items-center justify-center"
          >
            🧧
          </button>
          
          {/* Tooltip */}
          <span className="absolute left-24 top-1/2 -translate-y-1/2 bg-black text-white px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-sm font-bold pointer-events-none">
            Thần tài gõ cửa
          </span>
          
          {/* Menu con */}
          {showThanTaiMenu && (
            <div className="absolute left-24 top-0 bg-gradient-to-br from-orange-700 to-orange-900 rounded-xl shadow-2xl border-3 border-yellow-400 overflow-hidden z-50 min-w-[200px]">
              <button
                onClick={() => {
                  setShowThanTaiMenu(false);
                  handleThanTai();
                }}
                className="w-full px-4 py-3 text-left font-bold text-white hover:bg-orange-600 transition-colors flex items-center gap-3"
              >
                <span className="text-2xl">🎁</span>
                <span>Kích hoạt</span>
              </button>
              
              <div className="border-t border-orange-500"></div>
              
              <button
                onClick={() => {
                  setShowThanTaiMenu(false);
                  handleViewThanTaiList();
                }}
                disabled={thanTaiWinners.length === 0}
                className={`w-full px-4 py-3 text-left font-bold text-white hover:bg-orange-600 transition-colors flex items-center gap-3 ${
                  thanTaiWinners.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <span className="text-2xl">👁️</span>
                <span>Xem danh sách</span>
              </button>
            </div>
          )}
        </div>

        {/* Online status */}
        <div className="bg-green-700 text-white font-bold px-4 py-2 rounded-full text-sm shadow-lg">
          🟢 {onlineCount}
        </div>
      </div>

      {/* Bell notification - GÓC DƯỚI PHẢI - LUÔN HIỆN */}
      <div 
        onClick={() => setShowBellModal(true)}
        className="fixed bottom-4 right-4 z-50"
      >
        {bellCount > 0 ? (
          // Có người rung - Màu đỏ + Rung lắc
          <div className="relative">
            <div className="absolute inset-0 bg-yellow-400 rounded-full blur-xl opacity-50 animate-pulse"></div>
            <button className="relative bg-gradient-to-br from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 text-yellow-300 w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-yellow-400 shadow-2xl cursor-pointer hover:scale-110 transition-all flex flex-col items-center justify-center">
              <svg className="w-14 h-14 md:w-16 md:h-16 animate-swing" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
              </svg>
              <span className="font-black text-xl md:text-2xl mt-1">{bellCount}</span>
            </button>
          </div>
        ) : (
          // Không có người rung - Màu xám
          <button className="bg-gradient-to-br from-gray-600 to-gray-800 hover:from-gray-700 hover:to-gray-900 text-gray-300 w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-gray-500 shadow-2xl cursor-pointer hover:scale-110 transition-all flex flex-col items-center justify-center">
            <svg className="w-14 h-14 md:w-16 md:h-16" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
            </svg>
            <span className="font-black text-lg mt-1">0</span>
          </button>
        )}
      </div>

      {/* Bell modal */}
      {showBellModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setShowBellModal(false)}>
          <div className="bg-gradient-to-br from-red-800 to-red-900 rounded-2xl p-6 border-4 border-yellow-500 shadow-2xl max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-black text-gold-shadow mb-4 text-center">
              🔔 DANH SÁCH RUNG CHUÔNG
            </h2>
            <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
              {bellQueue.map((bell, index) => {
                const isAnswered = bell.answered || false;
                
                return (
                  <div 
                    key={bell.maNV} 
                    className={`bg-yellow-600 rounded-lg p-3 border-2 border-red-700 transition-all ${
                      isAnswered ? 'opacity-40' : 'opacity-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isAnswered}
                        onChange={() => handleToggleAnswered(bell.maNV, isAnswered)}
                        className="w-6 h-6 cursor-pointer accent-red-800"
                      />
                      <span className="bg-red-800 text-yellow-300 font-black text-xl w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-red-900 font-black truncate">{bell.name}</p>
                        <p className="text-red-800 text-sm">{bell.maNV}</p>
                      </div>
                      <span className="text-red-900 text-xs font-bold flex-shrink-0">
                        {new Date(bell.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => setShowBellModal(false)}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-black px-4 py-3 rounded-lg text-lg"
            >
              ĐÓNG
            </button>
          </div>
        </div>
      )}

      {/* Thần Tài winners modal */}
      {thanTaiWinners.length > 0 && !showThanTaiListButton && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-orange-600 to-orange-800 rounded-2xl p-6 border-4 border-yellow-500 shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto relative">
            
            {/* Nút tắt/mở nhạc - GÓC PHẢI TRÊN */}
            <button
              onClick={() => {
                const audio = (window as any).__thanTaiAudio;
                if (audio) {
                  if (isMusicPlaying) {
                    audio.pause();
                  } else {
                    audio.play();
                  }
                  setIsMusicPlaying(!isMusicPlaying);
                }
              }}
              className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-yellow-300 w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 border-2 border-yellow-400"
              title={isMusicPlaying ? 'Tắt nhạc' : 'Bật nhạc'}
            >
              {isMusicPlaying ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              )}
            </button>

            {/* Header */}
            <h2 className="text-3xl font-black text-yellow-300 mb-6 text-center pr-12">
              🧧 DANH SÁCH TRÚNG THƯỞNG 🧧
            </h2>
            
            {/* Danh sách winners */}
            <div className="grid grid-cols-1 gap-3 mb-6">
              {thanTaiWinners.map((winner, index) => (
                <div key={winner.msnv} className="bg-white rounded-lg p-4 border-3 border-yellow-400">
                  <div className="flex items-center gap-3">
                    <span className="bg-gradient-to-br from-yellow-400 to-yellow-600 text-red-900 font-black text-2xl w-12 h-12 rounded-full flex items-center justify-center border-3 border-red-700 flex-shrink-0">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-orange-900 font-black text-lg truncate">{winner.name}</p>
                      <p className="text-orange-700 text-sm">{winner.msnv}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Nút đóng - GỌN HƠN */}
            <button
              onClick={handleCloseThanTai}
              className="w-full bg-white/20 hover:bg-white/30 text-white font-black text-lg px-6 py-3 rounded-lg border-2 border-white/50 transition-all hover:scale-105"
            >
              ĐÓNG
            </button>
          </div>
        </div>
      )}


      {/* Top 5 modal */}
      {showTop5Modal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-yellow-600 to-yellow-700 rounded-2xl p-6 border-4 border-red-700 shadow-2xl max-w-2xl w-full mx-4">
            <h2 className="text-3xl font-black text-red-900 mb-4 text-center">
              🏆 TOP 5 NHANH NHẤT
            </h2>
            <div className="space-y-3 mb-4">
              {top5Results.length > 0 ? (
                top5Results.map((result: any) => (
                  <div key={result.maNV} className="bg-white rounded-lg p-4 border-3 border-red-700">
                    <div className="flex items-center gap-4">
                      <span className={`font-black text-3xl w-12 h-12 rounded-full flex items-center justify-center ${
                        result.rank === 1 ? 'bg-yellow-400 text-red-900' :
                        result.rank === 2 ? 'bg-gray-300 text-gray-700' :
                        result.rank === 3 ? 'bg-orange-400 text-white' :
                        'bg-gray-200 text-gray-600'
                      }`}>
                        {result.rank}
                      </span>
                      <div className="flex-1">
                        <p className="text-red-900 font-black text-xl">{result.name}</p>
                        <p className="text-red-700 text-sm">{result.maNV}</p>
                      </div>
                      <span className="text-red-900 font-black text-lg">
                        {result.timeInSeconds}s
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-red-900 text-center font-bold text-lg">Không có ai trả lời đúng!</p>
              )}
            </div>
            <button
              onClick={handleCloseTop5}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-black text-xl px-6 py-3 rounded-lg"
            >
              ĐÓNG
            </button>
          </div>
        </div>
      )}

      {/* Mini Game Leaderboard modal */}
      {showMiniGameLeaderboard && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl p-6 border-4 border-yellow-500 shadow-2xl max-w-3xl w-full mx-4 max-h-[85vh] overflow-y-auto">
            <h2 className="text-3xl font-black text-yellow-300 mb-2 text-center">
              🏆 BẢNG XẾP HẠNG MINI GAME 🏆
            </h2>
            
            <p className="text-yellow-200 text-center text-sm mb-6">
              Tham gia: {miniGameResults.filter(r => !r.skipped).length} | 
              Bỏ qua: {miniGameResults.filter(r => r.skipped).length} | 
              Tổng: {miniGameResults.length}
            </p>
            
            {/* Top 10 */}
            <div className="space-y-2 mb-6">
              {miniGameResults.slice(0, 10).map((result, index) => {
                const isTop5 = index < 5;
                
                return (
                  <div 
                    key={result.msnv} 
                    className={`rounded-lg p-4 border-3 ${
                      isTop5 
                        ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 border-yellow-700'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className={`font-black text-3xl w-12 h-12 rounded-full flex items-center justify-center ${
                        index === 0 ? 'bg-yellow-500 text-white' :
                        index === 1 ? 'bg-gray-400 text-white' :
                        index === 2 ? 'bg-orange-500 text-white' :
                        isTop5 ? 'bg-blue-500 text-white' :
                        'bg-gray-200 text-gray-700'
                      }`}>
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                      </span>
                      
                      <div className="flex-1">
                        <p className={`font-black text-lg ${isTop5 ? 'text-red-900' : 'text-gray-800'}`}>
                          {result.name}
                        </p>
                        <p className={`text-sm ${isTop5 ? 'text-red-800' : 'text-gray-600'}`}>
                          {result.msnv}
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <p className={`font-black text-2xl ${isTop5 ? 'text-red-900' : 'text-gray-800'}`}>
                          {result.score}
                        </p>
                        <p className={`text-xs ${isTop5 ? 'text-red-800' : 'text-gray-600'}`}>
                          🪙{result.stats?.coins || 0} 💰{result.stats?.golds || 0} 💣{result.stats?.bombs || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Nút xem tất cả */}
            {miniGameResults.length > 10 && (
              <button
                onClick={() => {
                  // TODO: Mở modal xem tất cả
                }}
                className="w-full bg-white/20 hover:bg-white/30 text-white font-bold px-4 py-2 rounded-lg mb-4"
              >
                📋 Xem tất cả {miniGameResults.length} người
              </button>
            )}
            
            <button
              onClick={handleCloseMiniGame}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-black text-xl px-6 py-4 rounded-lg"
            >
              ĐÓNG
            </button>
          </div>
        </div>
      )}

      {/* Secret reveal confirm modal */}
      {showSecretModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl p-6 border-4 border-yellow-500 shadow-2xl max-w-md w-full mx-4">
            <h2 className="text-2xl font-black text-yellow-300 mb-4 text-center">
              🎯 MỞ ĐÁP ÁN BÍ ẨN
            </h2>
            <p className="text-white font-bold text-center mb-6 text-lg">
              Bạn có chắc chắn muốn mở đáp án ô chữ bí ẩn?<br/>
              <span className="text-yellow-300">Hành động này không thể hoàn tác!</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={confirmRevealSecret}
                className="flex-1 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-red-900 font-black text-lg px-6 py-3 rounded-lg"
              >
                XÁC NHẬN
              </button>
              <button
                onClick={() => setShowSecretModal(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-black text-lg px-6 py-3 rounded-lg"
              >
                HỦY
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}