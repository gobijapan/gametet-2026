'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue, update, get, onDisconnect, set } from 'firebase/database';
import { auth, database } from '@/lib/firebase';
import GameHeader from '@/components/player/GameHeader';
import GameHUD from '@/components/player/GameHUD';
import QuestionCard from '@/components/player/QuestionCard';
import GameOverlays from '@/components/player/GameOverlays';
import useGameSound from '@/hooks/useGameSound';
import { compareWithoutDiacritics, removeDiacritics } from '@/lib/vietnamese';

export default function PlayerPage() {
  const router = useRouter();
  const { playSound, stopSound } = useGameSound();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Game states
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [selectedQuestionForView, setSelectedQuestionForView] = useState<any>(null);
  const [answers, setAnswers] = useState<{ [key: string]: string[] }>({});
  const [submittedAnswers, setSubmittedAnswers] = useState<Set<string>>(new Set());
  const [revealedResults, setRevealedResults] = useState<{ [key: string]: any }>({});
  const [revealedKeys, setRevealedKeys] = useState<{ [key: string]: string }>({});
  const [myAnswersCorrect, setMyAnswersCorrect] = useState<{ [key: string]: boolean }>({});
  const [selectedQuestionForPreview, setSelectedQuestionForPreview] = useState<any>(null);

  // Stats
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalWrong, setTotalWrong] = useState(0);

  // UI states
  const [timeLeft, setTimeLeft] = useState(0);
  const [canRingBell, setCanRingBell] = useState(true);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmQuestionId, setConfirmQuestionId] = useState<string | null>(null);
  const [showBellConfirmModal, setShowBellConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [answerDurations, setAnswerDurations] = useState<{ [key: string]: number }>({});

  // Optimistic UI state
  const [optimisticQuestionId, setOptimisticQuestionId] = useState<string | null>(null);

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

  // Thần Tài states
  const [isThanTaiActive, setIsThanTaiActive] = useState(false);
  const [isThanTaiWinner, setIsThanTaiWinner] = useState(false);
  const [showDoor, setShowDoor] = useState(false);
  const [isDoorOpen, setIsDoorOpen] = useState(false);
  const [hasClosedThanTai, setHasClosedThanTai] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('thanTaiClosed') === 'true';
    }
    return false;
  });

  // Refs
  const inputRefs = useRef<{ [key: string]: (HTMLInputElement | null)[] }>({});
  const backspaceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const backspaceStartTimeRef = useRef<number>(0);
  const selectedQuestionRef = useRef<any>(null); // Ref to access current question inside closure
  const lastCountdownTimeRef = useRef<number>(0); // Ref to track last sound play time
  const questionStartTimeRef = useRef<number>(0); // Ref to track start time for duration calc

  // Keep ref updated
  useEffect(() => {
    selectedQuestionRef.current = selectedQuestionForPreview;
  }, [selectedQuestionForPreview]);

  // Authentication
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

  // Listen countdown
  useEffect(() => {
    const countdownRef = ref(database, 'game/countdown');
    const unsubscribe = onValue(countdownRef, (snapshot) => {
      if (snapshot.exists()) {
        const countdownData = snapshot.val();
        if (countdownData.isActive) {
          // Play sound only if new countdown started
          if (lastCountdownTimeRef.current !== countdownData.startTime) {
            playSound('countdown');
            lastCountdownTimeRef.current = countdownData.startTime;
          }

          setIsCountingDown(true);

          const elapsed = Date.now() - countdownData.startTime;
          const remaining = Math.max(0, 3 - Math.floor(elapsed / 1000));
          setCountdown(remaining);

          const interval = setInterval(() => {
            const newElapsed = Date.now() - countdownData.startTime;
            const newRemaining = Math.max(0, 3 - Math.floor(newElapsed / 1000));

            if (newRemaining <= 0) {
              setCountdown(1); // Force 1 to prevent 0 glitch
              setIsCountingDown(false);
              clearInterval(interval);

              // --- OPTIMISTIC START ---
              const currentQ = selectedQuestionRef.current;
              if (currentQ) {
                const qId = currentQ.id;
                setOptimisticQuestionId(qId);
                setTimeLeft(30);
                setTimeLeft(30);
                // Auto-focus immediately when countdown ends
                setTimeout(() => {
                  // Only focus if user is NOT already typing
                  if (document.activeElement?.tagName !== 'INPUT') {
                    if (inputRefs.current[qId]?.[0]) {
                      inputRefs.current[qId][0]?.focus({ preventScroll: true });
                    }
                  }
                }, 50);
              }
            } else {
              setCountdown(newRemaining);
            }
          }, 100);

          return () => clearInterval(interval);
        } else {
          setIsCountingDown(false);
        }
      }
    });

    return () => unsubscribe();
  }, [playSound]);

  // Listen selected question
  useEffect(() => {
    const selectedRef = ref(database, 'game/selectedQuestion');
    const unsubscribe = onValue(selectedRef, async (snapshot) => {
      if (snapshot.exists()) {
        const selectedData = snapshot.val();

        // Lưu vào biến riêng để dùng cho animation
        const question = questions.find(q => q.id === selectedData.questionId);
        if (question) {
          setSelectedQuestionForPreview(question);
        }
      }
    });

    return () => unsubscribe();
  }, [questions]);

  // Listen to Mini Game
  useEffect(() => {
    if (!user) return;

    const miniGameRef = ref(database, 'game/miniGame');
    const unsubscribe = onValue(miniGameRef, async (snapshot) => {
      if (snapshot.exists()) {
        const miniGameData = snapshot.val();

        if (miniGameData.active) {
          const configRef = ref(database, 'config/miniGame');
          const configSnapshot = await get(configRef);
          const config = configSnapshot.exists() ? configSnapshot.val() : {
            // defaults...
            duration: 30, coinPoints: 50, goldPoints: 100, bombPoints: -100,
            coinSpeed: 3, goldSpeed: 5, bombSpeed: 2, spawnInterval: 0.5,
            coinRate: 50, goldRate: 30, bombRate: 20
          };

          setMiniGameConfig(config);
          setIsMiniGameActive(true);
          setShowMiniGameChoice(true);
          playSound('start'); // Alert mini game
        } else {
          setIsMiniGameActive(false);
          setShowMiniGameChoice(false);
          setIsMiniGamePlaying(false);
          setShowMiniGameResult(false);
          stopSound('thantai'); // Ensure thantai sound stops if minigame intervenes? Unlikely but safe.
        }
      }
    });

    return () => unsubscribe();
  }, [user]);

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
          playSound('thantai'); // Sound: Than Tai Music

          setTimeout(() => {
            setShowDoor(true);
          }, 1000);
        } else {
          setIsThanTaiActive(false);
          setShowDoor(false);
          setIsDoorOpen(false);
          stopSound('thantai');

          if ((window as any).__thanTaiFireworks) {
            clearInterval((window as any).__thanTaiFireworks);
            (window as any).__thanTaiFireworks = null;
          }

          if (!thanTaiData || !thanTaiData.active) {
            localStorage.removeItem('thanTaiClosed');
            setHasClosedThanTai(false);
          }
        }
      }
    });

    return () => unsubscribe();
  }, [user, hasClosedThanTai]);

  // Listen current question
  useEffect(() => {
    if (!user) return;

    const gameRef = ref(database, 'game/currentQuestion');
    const unsubscribe = onValue(gameRef, (snapshot) => {
      if (snapshot.exists()) {
        const questionData = snapshot.val();
        setCurrentQuestion(questionData);

        // Server confirmed playing, so we can clear optimistic ID.
        setOptimisticQuestionId(null);

        // TỰ ĐỘNG CHUYỂN về câu đang hỏi
        const question = questions.find(q => q.order === questionData.questionId);
        if (question) {
          // Auto-focus logic: ONLY if we switched questions OR if no input is focused
          // This prevents cursor jumping when timer updates currentQuestion
          if (selectedQuestionForView?.id !== question.id) {
            setSelectedQuestionForView(question);
            setTimeout(() => {
              // Only focus if user is NOT already typing to prevent cursor jump/lag
              if (document.activeElement?.tagName === 'INPUT') return;

              const currentAnswers = answers[question.id] || [];
              let focusIndex = 0;
              for (let i = 0; i < question.answer.length; i++) {
                if (!currentAnswers[i]) {
                  focusIndex = i;
                  break;
                } else if (i === question.answer.length - 1) {
                  focusIndex = question.answer.length - 1;
                }
              }
              if (inputRefs.current[question.id]?.[focusIndex]) {
                inputRefs.current[question.id][focusIndex]?.focus({ preventScroll: true });
              }
            }, 150);
          }
        }
      } else {
        setCurrentQuestion(null);
        setOptimisticQuestionId(null);
      }
    });

    return () => unsubscribe();
  }, [user, questions]);

  // Listen questions
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

        if (!selectedQuestionForView && questionsArray.length > 0) {
          setSelectedQuestionForView(questionsArray[0]);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen results
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

  // Stats
  useEffect(() => {
    if (!user) return;

    let answered = 0;
    let correct = 0;
    let wrong = 0;

    questions.forEach(q => {
      if (submittedAnswers.has(q.id)) {
        answered++;
        if (myAnswersCorrect[q.id] === true) correct++;
        if (myAnswersCorrect[q.id] === false) wrong++;
      }
    });

    setTotalAnswered(answered);
    setTotalCorrect(correct);
    setTotalWrong(wrong);
  }, [questions, submittedAnswers, myAnswersCorrect, user]);

  // My Answers (Check correctness and play sound - SUSPENSE MODE)
  useEffect(() => {
    if (!user) return;

    // SUSPENSE UPDATE: Delay validation until time's up!
    // Only proceed if timer ended (timeLeft === 0)
    // We also check if we have questions to avoid empty runs
    if (timeLeft > 0) return;

    questions.forEach(async (q) => {
      if (revealedResults[q.id]) {
        const myAnswerRef = ref(database, `answers/${q.id}/${user.maNV}`);
        const snapshot = await get(myAnswerRef);

        if (snapshot.exists()) {
          const myAnswer = snapshot.val().answer.toUpperCase();

          // Safe check for correctAnswer type
          const rawCorrect = revealedResults[q.id].correctAnswer;
          const correctAnswer = Array.isArray(rawCorrect)
            ? rawCorrect.join('').toUpperCase()
            : String(rawCorrect).toUpperCase();

          const isCorrect = myAnswer === correctAnswer;

          setMyAnswersCorrect(prev => {
            // Play sound if status changes (and it's the first time identifying result)
            // AND ensure we only play sound for the CURRENT question being played to avoid spam
            if (prev[q.id] === undefined) {
              if (currentQuestion?.id === q.id) {
                playSound(isCorrect ? 'correct' : 'wrong');
              }
            }
            return { ...prev, [q.id]: isCorrect };
          });
        }
      }
    });
  }, [user, questions, revealedResults, timeLeft === 0, currentQuestion?.id]);

  // Submitted Answers
  useEffect(() => {
    if (!user) return;

    questions.forEach(q => {
      const answerRef = ref(database, `answers/${q.id}/${user.maNV}`);
      onValue(answerRef, (snapshot) => {
        if (snapshot.exists()) {
          setSubmittedAnswers(prev => new Set([...prev, q.id]));
          const val = snapshot.val();
          const submittedAnswer = val.answer;
          // Track duration if available (static duration)
          if (val.duration) {
            setAnswerDurations((prev: { [key: string]: number }) => ({
              ...prev,
              [q.id]: val.duration
            }));
          }
          // Fallback legacy support (calculate from timestamp if no duration saved)
          else if (val.timestamp) {
            // We can't accurately calc duration here without knowing EXACT start time of that question.
            // But for new logic we will rely on duration.
          }
          setAnswers(prev => ({
            ...prev,
            [q.id]: submittedAnswer.split('')
          }));
        }
      });
    });
  }, [user, questions]);

  // Timer Logic - Use Firebase timerEnd as single source of truth
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const updateTimer = () => {
      const now = Date.now();
      let remaining = 0;

      if (currentQuestion?.timerEnd) {
        // Use server time directly - single source of truth
        remaining = Math.max(0, Math.floor((currentQuestion.timerEnd - now) / 1000));
      } else if (optimisticQuestionId && timeLeft > 0) {
        // Optimistic countdown - just decrement locally until server confirms
        remaining = timeLeft;
      }

      setTimeLeft(remaining);
      return remaining;
    };

    if (currentQuestion?.timerEnd || optimisticQuestionId) {
      interval = setInterval(() => {
        const remaining = updateTimer();

        // Auto-submit when time runs out if not submitted yet
        if (remaining === 0) {
          clearInterval(interval);

          // Check if user hasn't submitted for current question
          const questionId = currentQuestion?.questionDbId;
          if (questionId && user && !submittedAnswers.has(questionId)) {
            // Auto-submit with 30s duration (timeout)
            const answerRef = ref(database, `answers/${questionId}/${user.maNV}`);
            const userAnswer = (answers[questionId] || []).join('');

            // Validate answer before submitting
            const question = questions.find(q => q.id === questionId);
            let isCorrect = false;

            if (question) {
              // Trim and handle safe strings
              const dbAnswer = String(question.answer || '').trim();
              const playerAnswer = userAnswer.trim();
              isCorrect = compareWithoutDiacritics(playerAnswer, dbAnswer);
            }

            update(answerRef, {
              answer: userAnswer.trim() || '',
              isCorrect: isCorrect,
              timestamp: Date.now(),
              duration: 30000,
            }).catch(err => console.error('Auto-submit error:', err));

            setSubmittedAnswers(prev => new Set([...prev, questionId]));
          }
        }
      }, 100); // Fast polling for smooth display

      // Immediate update
      updateTimer();
    }

    return () => clearInterval(interval);
  }, [currentQuestion?.timerEnd, optimisticQuestionId, timeLeft]);

  // ... handlers ...

  // Handle question selection with auto-focus
  const handleQuestionSelect = (question: any) => {
    setSelectedQuestionForView(question);

    // Auto-focus to first empty input or next available
    setTimeout(() => {
      // Smart Focus: ONLY focus if user is NOT already typing
      if (document.activeElement?.tagName === 'INPUT') return;

      if (submittedAnswers.has(question.id)) return; // Skip if already submitted

      const currentAnswers = answers[question.id] || [];
      let focusIndex = 0;

      // Find first empty position
      for (let i = 0; i < question.answer.length; i++) {
        if (!currentAnswers[i]) {
          focusIndex = i;
          break;
        } else if (i === question.answer.length - 1) {
          // All filled, focus on last one
          focusIndex = question.answer.length - 1;
        }
      }

      if (inputRefs.current[question.id]?.[focusIndex]) {
        inputRefs.current[question.id][focusIndex]?.focus({ preventScroll: true });
      }
    }, 100);
  };

  const handleInputChange = (questionId: string, index: number, value: string) => {
    if (submittedAnswers.has(questionId)) return;

    // Only allow A-Z (no Vietnamese diacritics, no numbers, no special chars)
    const cleanValue = value.replace(/[^A-Za-z]/g, '');
    if (!cleanValue) return;

    const newAnswers = { ...answers };
    if (!newAnswers[questionId]) newAnswers[questionId] = [];

    // Get the last typed character (in case of paste or multiple chars)
    const lastChar = cleanValue[cleanValue.length - 1].toUpperCase();

    // Always fill current box and move to next
    newAnswers[questionId][index] = lastChar;
    setAnswers(newAnswers);

    // Auto-focus to next input
    if (inputRefs.current[questionId]) {
      const nextInput = inputRefs.current[questionId][index + 1];
      if (nextInput) {
        nextInput.focus({ preventScroll: true });
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, questionId: string, index: number) => {
    const question = questions.find(q => q.id === questionId);
    if (!question) return;

    // Disable space bar
    if (e.key === ' ') {
      e.preventDefault();
      return;
    }

    // Enter to submit
    if (e.key === 'Enter') {
      e.preventDefault();
      const answer = (answers[questionId] || []).join('');
      if (answer.length === question.answer.length) {
        setConfirmQuestionId(questionId);
        setShowConfirmModal(true);
      }
      return;
    }

    // Backspace: delete previous box (or current if empty)
    if (e.key === 'Backspace') {
      e.preventDefault();

      // Start timer for hold-to-clear-all (3 seconds)
      if (!backspaceTimerRef.current) {
        backspaceStartTimeRef.current = Date.now();
        backspaceTimerRef.current = setTimeout(() => {
          // Clear all answers for this question
          const newAnswers = { ...answers };
          newAnswers[questionId] = [];
          setAnswers(newAnswers);

          // Focus first input
          if (inputRefs.current[questionId]?.[0]) {
            inputRefs.current[questionId][0]?.focus({ preventScroll: true });
          }

          backspaceTimerRef.current = null;
        }, 3000);
      }

      const newAnswers = { ...answers };
      if (!newAnswers[questionId]) newAnswers[questionId] = [];

      const currentValue = newAnswers[questionId][index] || '';

      if (currentValue) {
        // Current box has value → clear it and stay
        newAnswers[questionId][index] = '';
        setAnswers(newAnswers);
      } else if (index > 0) {
        // Current box is empty → delete previous box and move there
        newAnswers[questionId][index - 1] = '';
        setAnswers(newAnswers);
        inputRefs.current[questionId]?.[index - 1]?.focus({ preventScroll: true });
      }

      return;
    }

    // Delete: just clear current box
    if (e.key === 'Delete') {
      e.preventDefault();
      const newAnswers = { ...answers };
      if (!newAnswers[questionId]) newAnswers[questionId] = [];
      newAnswers[questionId][index] = '';
      setAnswers(newAnswers);
      return;
    }
  };

  // Clear backspace timer on key up
  const handleKeyUp = (e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && backspaceTimerRef.current) {
      clearTimeout(backspaceTimerRef.current);
      backspaceTimerRef.current = null;
    }
  };

  const handleSubmitAnswer = async () => {
    if (!user || !confirmQuestionId) return;
    const answer = (answers[confirmQuestionId] || []).join('');

    const question = questions.find(q => q.id === confirmQuestionId);

    if (!question) return;

    // Use relaxed comparison: removing diacritics from both sides
    const isCorrect = compareWithoutDiacritics(answer, question.answer);

    // Optimistic UI update
    setRevealedResults(prev => ({
      ...prev,
      [confirmQuestionId]: {
        correctAnswer: question.answer.toUpperCase().split(''),
        isCorrect: isCorrect
      }
    }));

    setSubmittedAnswers(prev => new Set(prev).add(confirmQuestionId));
    setShowConfirmModal(false);
    setConfirmQuestionId(null);
    setShowBellConfirmModal(false);

    // REMOVED Optimistic Sound/Stats Update here used to be.
    // Now we wait for Time's Up to reveal result/sound.

    // Calculate duration (Synchronized with MC View: User Timestamp - Server Start Timestamp)
    const timestamp = Date.now();
    let duration = 0;

    // Check match
    if (currentQuestion && currentQuestion.questionDbId === confirmQuestionId && currentQuestion.startTimestamp) {
      duration = timestamp - currentQuestion.startTimestamp;
    }
    // Fallback logic could go here, but strictly sticking to MC's formula:
    // MC uses: (answer.timestamp - question.startTimestamp)

    const answerRef = ref(database, `answers/${confirmQuestionId}/${user.maNV}`);
    update(answerRef, {
      answer: answer.trim().toUpperCase(),
      isCorrect: isCorrect,
      timestamp: timestamp,
      duration: duration
    }).catch(err => console.error(err));

    // Show Duration Toast
    setSuccessMessage(`Đã gửi! Thời gian: ${(duration / 1000).toFixed(2)}s`);
    setShowSuccessModal(true);
    setTimeout(() => setShowSuccessModal(false), 2500);
  };



  const handleClickSecretKey = (question: any) => setSelectedQuestionForView(question);

  const handleRequestSubmit = (questionId: string) => {
    setConfirmQuestionId(questionId);
    setShowConfirmModal(true);
  };

  const handleRingBell = () => {
    if (!canRingBell) return;
    setShowBellConfirmModal(true);
  };

  const confirmRingBell = async () => {
    if (!user) return;
    try {
      const bellRef = ref(database, `bellQueue/${user.maNV}`);
      await update(bellRef, { name: user.name, timestamp: Date.now() });
      setCanRingBell(false);
      const playerRef = ref(database, `playerStats/${user.maNV}`);
      await update(playerRef, { canRingBell: false });
      setShowBellConfirmModal(false);
      playSound('bell');
      setSuccessMessage('Đã rung chuông! Vui lòng chờ MC gọi tên!');
      setShowSuccessModal(true);
      setTimeout(() => setShowSuccessModal(false), 2000);
    } catch (error) {
      console.error(error);
    }
  };

  const handleStartMiniGame = async () => {
    setShowMiniGameChoice(false);
    for (let i = 3; i > 0; i--) {
      setMiniGameCountdown(i);
      playSound('countdown');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    setIsMiniGamePlaying(true);
  };

  const handleSkipMiniGame = () => {
    setShowMiniGameChoice(false);
    setIsMiniGameActive(false);
    setShowSkipConfirm(false);
    if (user) {
      update(ref(database, `game/miniGameResults/${user.maNV}`), {
        score: 0, skipped: true, timeout: false, timestamp: Date.now(),
      });
    }
  };

  const handleMiniGameTimeOut = () => {
    setShowMiniGameChoice(false);
    setIsMiniGameActive(false);
    if (user) {
      update(ref(database, `game/miniGameResults/${user.maNV}`), {
        score: 0, skipped: true, timeout: true, timestamp: Date.now(),
      });
    }
  };

  const handleMiniGameComplete = (finalScore: number, finalStats: any) => {
    setMiniGameScore(finalScore);
    setMiniGameStats(finalStats);
    setIsMiniGamePlaying(false);
    setShowMiniGameResult(true);
    if (user) {
      update(ref(database, `game/miniGameResults/${user.maNV}`), {
        score: finalScore, stats: finalStats, timestamp: Date.now(), skipped: false,
      });
    }
  };

  const handleCloseMiniGameResult = () => {
    setShowMiniGameResult(false);
    setIsMiniGameActive(false);
    setShowResultCloseConfirm(false);
    stopSound('thantai'); // cleanup just in case
  };

  const handleCloseThanTai = () => {
    setIsThanTaiActive(false);
    setShowDoor(false);
    setIsDoorOpen(false);
    stopSound('thantai');
    setHasClosedThanTai(true);
    localStorage.setItem('thanTaiClosed', 'true');
    if ((window as any).__thanTaiFireworks) {
      clearInterval((window as any).__thanTaiFireworks);
      (window as any).__thanTaiFireworks = null;
    }
  };

  if (loading) return <div className="min-h-screen text-yellow-300 flex items-center justify-center font-bold text-2xl">Đang tải...</div>;

  // Logic updated to checking optimistic state
  const isCurrentlyPlaying = (currentQuestion?.questionId === selectedQuestionForView?.order) || (optimisticQuestionId === selectedQuestionForView?.id);
  // Prevent leak: Only reveal if NOT counting down and timer ended
  const isQuestionRevealed = selectedQuestionForView && revealedResults[selectedQuestionForView.id] && timeLeft === 0 && !isCountingDown;

  return (
    <>
      <div className="min-h-screen">
        <GameHeader
          questions={questions}
          revealedKeys={revealedKeys}
          revealedResults={revealedResults}
          currentQuestion={currentQuestion}
          selectedQuestionForPreview={selectedQuestionForPreview}
          selectedQuestionForView={selectedQuestionForView}
          onQuestionClick={handleClickSecretKey}
          onQuestionSelect={handleQuestionSelect}
        />

        <div className="px-2 md:px-4 py-3 max-w-7xl mx-auto pb-32 md:pb-28">
          {selectedQuestionForView && (
            <div className="space-y-4 md:space-y-5">
              <QuestionCard
                selectedQuestionForView={selectedQuestionForView}
                currentQuestion={currentQuestion}
                isCurrentlyPlaying={!!isCurrentlyPlaying}
                isQuestionRevealed={!!isQuestionRevealed}
                revealedResults={revealedResults}
                timeLeft={timeLeft}
                answers={answers}
                submittedAnswers={submittedAnswers}
                inputRefs={inputRefs}
                handleInputChange={handleInputChange}
                handleKeyDown={handleKeyDown}
                handleKeyUp={handleKeyUp}
              />
            </div>
          )}
        </div>

        <GameHUD
          user={user}
          totalCorrect={totalCorrect}
          totalWrong={totalWrong}
          totalQuestions={questions.length}
          totalAnswered={totalAnswered}
          canRingBell={canRingBell}
          onRingBell={handleRingBell}
        />
      </div>

      <GameOverlays
        isCountingDown={isCountingDown}
        countdown={countdown}
        showConfirmModal={showConfirmModal}
        onConfirmSubmit={handleSubmitAnswer}
        onCancelSubmit={() => { setShowConfirmModal(false); setConfirmQuestionId(null); }}
        showBellConfirmModal={showBellConfirmModal}
        onConfirmBell={confirmRingBell}
        onCancelBell={() => setShowBellConfirmModal(false)}
        showSuccessModal={showSuccessModal}
        successMessage={successMessage}
        isMiniGameActive={isMiniGameActive}
        showMiniGameChoice={showMiniGameChoice}
        miniGameCountdown={miniGameCountdown}
        isMiniGamePlaying={isMiniGamePlaying}
        showMiniGameResult={showMiniGameResult}
        miniGameScore={miniGameScore}
        miniGameStats={miniGameStats}
        miniGameConfig={miniGameConfig}
        showSkipConfirm={showSkipConfirm}
        showResultCloseConfirm={showResultCloseConfirm}
        onStartMiniGame={handleStartMiniGame}
        onMiniGameComplete={handleMiniGameComplete}
        onMiniGameTimeEnd={handleMiniGameTimeOut}
        onSkipMiniGame={handleSkipMiniGame}
        onCloseMiniGameResult={handleCloseMiniGameResult}
        setShowSkipConfirm={setShowSkipConfirm}
        setShowResultCloseConfirm={setShowResultCloseConfirm}
        isThanTaiActive={isThanTaiActive}
        isThanTaiWinner={isThanTaiWinner}
        showDoor={showDoor}
        isDoorOpen={isDoorOpen}
        onOpenDoor={() => setIsDoorOpen(true)}
        onCloseThanTai={handleCloseThanTai}
      />
    </>
  );
}