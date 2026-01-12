'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue, get } from 'firebase/database';
import { auth, database } from '@/lib/firebase';
import { FiUsers, FiHelpCircle, FiCheckCircle, FiBell } from 'react-icons/fi';
import QuestionDetailContent from '@/components/QuestionDetailContent';

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalQuestions: 0,
    askedQuestions: 0,
    onlineUsers: 0,
    bellRings: 0,
  });
  const [questionStats, setQuestionStats] = useState<any[]>([]);
  const [showQuestionsModal, setShowQuestionsModal] = useState(false);
const [showAskedModal, setShowAskedModal] = useState(false);
const [showOnlineModal, setShowOnlineModal] = useState(false);
const [showBellModal, setShowBellModal] = useState(false);
const [showQuestionDetail, setShowQuestionDetail] = useState(false);
const [selectedQuestionDetail, setSelectedQuestionDetail] = useState<any>(null);
const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
const [bellHistory, setBellHistory] = useState<any[]>([]);
const [questions, setQuestions] = useState<any[]>([]);
const [totalEmployees, setTotalEmployees] = useState(0);

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

        if (foundUser && foundUser.role === 'admin') {
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

  // Listen to online users
useEffect(() => {
  const onlineRef = ref(database, 'online');
  const unsubscribe = onValue(onlineRef, async (snapshot) => {
    if (snapshot.exists()) {
      const onlineKeys = Object.keys(snapshot.val());
      
      // Get user info
      const usersRef = ref(database, 'users');
      const usersSnapshot = await get(usersRef);
      const usersData = usersSnapshot.exists() ? usersSnapshot.val() : {};
      
      const users = onlineKeys.map(msnv => ({
        msnv,
        name: usersData[msnv]?.name || 'Unknown',
      }));
      
      setOnlineUsers(users);
    } else {
      setOnlineUsers([]);
    }
  });

  return () => unsubscribe();
}, []);

// Get total employees
useEffect(() => {
  const employeesRef = ref(database, 'employees');
  get(employeesRef).then((snapshot) => {
    if (snapshot.exists()) {
      setTotalEmployees(Object.keys(snapshot.val()).length);
    }
  });
}, []);

// Listen to bell queue
useEffect(() => {
  const bellRef = ref(database, 'bellQueue');
  const unsubscribe = onValue(bellRef, async (snapshot) => {
    if (snapshot.exists()) {
      const bellData = snapshot.val();
      
      // Get user info
      const usersRef = ref(database, 'users');
      const usersSnapshot = await get(usersRef);
      const usersData = usersSnapshot.exists() ? usersSnapshot.val() : {};
      
      const bells = Object.keys(bellData).map((msnv) => ({
        msnv,
        name: usersData[msnv]?.name || 'Unknown',
        ...bellData[msnv],
      }));
      
      bells.sort((a, b) => a.timestamp - b.timestamp);
      setBellHistory(bells);
    } else {
      setBellHistory([]);
    }
  });

  return () => unsubscribe();
}, []);

  // Listen to stats
  useEffect(() => {
    // Total questions
    const questionsRef = ref(database, 'questions');
    const unsubQuestions = onValue(questionsRef, (snapshot) => {
      if (snapshot.exists()) {
        const questionsData = snapshot.val();
        const questionsArray = Object.keys(questionsData).map(key => ({
          id: key,
          ...questionsData[key]
        }));
        
        setStats(prev => ({ ...prev, totalQuestions: questionsArray.length }));
        
        // Get results for each question
        const resultsRef = ref(database, 'results');
        get(resultsRef).then(resultsSnapshot => {
          const results = resultsSnapshot.exists() ? resultsSnapshot.val() : {};
          
          const statsArray = questionsArray.map(q => {
            const result = results[q.id];
            const answersRef = ref(database, `answers/${q.id}`);
            
            return get(answersRef).then(answersSnapshot => {
              const totalAnswers = answersSnapshot.exists() ? Object.keys(answersSnapshot.val()).length : 0;
              const correctCount = result?.top5?.length || 0;
              const percentage = totalAnswers > 0 ? Math.round((correctCount / totalAnswers) * 100) : 0;
              
              return {
                order: q.order,
                question: q.content.substring(0, 50) + '...',
                totalAnswers,
                correctCount,
                percentage,
                isAsked: !!result
              };
            });
          });
          
          Promise.all(statsArray).then(data => {
            data.sort((a, b) => a.order - b.order);
            setQuestionStats(data);
            setStats(prev => ({ 
              ...prev, 
              askedQuestions: data.filter(d => d.isAsked).length 
            }));
          });
        });
      }
    });

    // Online users
    const onlineRef = ref(database, 'online');
    const unsubOnline = onValue(onlineRef, (snapshot) => {
      const count = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
      setStats(prev => ({ ...prev, onlineUsers: count }));
    });

    // Bell rings
    const bellRef = ref(database, 'bellQueue');
    const unsubBell = onValue(bellRef, (snapshot) => {
      const count = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
      setStats(prev => ({ ...prev, bellRings: count }));
    });

    return () => {
      unsubQuestions();
      unsubOnline();
      unsubBell();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600 text-xl font-bold">Đang tải...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Page title */}
      <div className="mb-6">
        <h1 className="text-3xl font-black text-gray-800">Dashboard</h1>
        <p className="text-gray-600 mt-1">Tổng quan game Tết 2026</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div 
          onClick={() => setShowQuestionsModal(true)}
          className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500 cursor-pointer hover:shadow-2xl hover:scale-105 transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-semibold">Tổng câu hỏi</p>
              <p className="text-3xl font-black text-gray-800 mt-2">{stats.totalQuestions}</p>
            </div>
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
              <FiHelpCircle className="text-blue-600" size={28} />
            </div>
          </div>
        </div>

        <div 
          onClick={() => setShowAskedModal(true)}
          className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500 cursor-pointer hover:shadow-2xl hover:scale-105 transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-semibold">Đã hỏi</p>
              <p className="text-3xl font-black text-gray-800 mt-2">{stats.askedQuestions}</p>
            </div>
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
              <FiCheckCircle className="text-green-600" size={28} />
            </div>
          </div>
        </div>

        <div 
          onClick={() => setShowOnlineModal(true)}
          className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500 cursor-pointer hover:shadow-2xl hover:scale-105 transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-semibold">Online</p>
              <p className="text-3xl font-black text-gray-800 mt-2">{stats.onlineUsers}</p>
            </div>
            <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center">
              <FiUsers className="text-purple-600" size={28} />
            </div>
          </div>
        </div>

        <div 
          onClick={() => setBellHistory.length > 0 && setShowBellModal(true)}
          className={`bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500 ${
            bellHistory.length > 0 ? 'cursor-pointer hover:shadow-2xl hover:scale-105' : 'opacity-60'
          } transition-all`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-semibold">Rung chuông</p>
              <p className="text-3xl font-black text-gray-800 mt-2">{stats.bellRings}</p>
            </div>
            <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center">
              <FiBell className="text-orange-600" size={28} />
            </div>
          </div>
        </div>
      </div>

      {/* Question stats */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-black text-gray-800 mb-4">Thống kê từng câu hỏi</h2>
        
        {questionStats.length > 0 ? (
          <div className="space-y-4">
            {questionStats.map((stat) => (
              <div 
                key={stat.order} 
                onClick={() => {
                  const question = questions.find(q => q.order === stat.order);
                  if (question) {
                    setSelectedQuestionDetail(question);
                    setShowQuestionDetail(true);
                  }
                }}
                className="border-b border-gray-200 pb-4 last:border-b-0 cursor-pointer hover:bg-gray-50 rounded-lg p-3 -m-3 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-bold text-gray-800">
                      Câu {stat.order}: {stat.question}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {stat.totalAnswers} người trả lời • {stat.correctCount} người đúng
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className={`text-2xl font-black ${
                      stat.percentage >= 80 ? 'text-green-600' :
                      stat.percentage >= 50 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {stat.percentage}%
                    </p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      stat.percentage >= 80 ? 'bg-green-500' :
                      stat.percentage >= 50 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${stat.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">Chưa có dữ liệu thống kê</p>
        )}
      </div>

      {/* Modal: Danh sách câu hỏi */}
      {showQuestionsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowQuestionsModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-2xl font-black text-gray-800">📝 Danh sách câu hỏi ({questions.length})</h2>
            </div>
            <div className="p-6 space-y-3">
              {questionStats.map((stat) => (
                <div key={stat.order} className={`p-4 rounded-lg border-2 ${
                  stat.isAsked ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-300'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-bold text-gray-800">
                        {stat.isAsked ? '✅' : '⚪'} Câu {stat.order}: {stat.question}
                      </p>
                      {stat.isAsked && (
                        <p className="text-sm text-gray-600 mt-1">
                          {stat.correctCount}/{stat.totalAnswers} người đúng ({stat.percentage}%)
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-6 border-t border-gray-200 sticky bottom-0 bg-white">
              <button
                onClick={() => setShowQuestionsModal(false)}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold px-6 py-3 rounded-lg"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Câu đã hỏi */}
      {showAskedModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAskedModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-2xl font-black text-gray-800">✅ Câu đã hỏi ({questionStats.filter(s => s.isAsked).length}/{questions.length})</h2>
            </div>
            <div className="p-6 space-y-4">
              {questionStats.filter(s => s.isAsked).map((stat) => (
                <div key={stat.order} className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
                  <p className="font-black text-gray-800 mb-2">
                    Câu {stat.order}: {stat.question}
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="bg-white rounded p-2 text-center">
                      <p className="text-gray-600">Trả lời</p>
                      <p className="font-black text-gray-800">{stat.totalAnswers}</p>
                    </div>
                    <div className="bg-white rounded p-2 text-center">
                      <p className="text-gray-600">Đúng</p>
                      <p className="font-black text-green-600">{stat.correctCount}</p>
                    </div>
                    <div className="bg-white rounded p-2 text-center">
                      <p className="text-gray-600">Tỷ lệ</p>
                      <p className="font-black text-blue-600">{stat.percentage}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-6 border-t border-gray-200 sticky bottom-0 bg-white">
              <button
                onClick={() => setShowAskedModal(false)}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold px-6 py-3 rounded-lg"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Người online */}
      {showOnlineModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowOnlineModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-2xl font-black text-gray-800">🟢 Người đang online ({onlineUsers.length}/{totalEmployees})</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 gap-3">
                {onlineUsers.map((user) => (
                  <div key={user.msnv} className="bg-green-50 border border-green-300 rounded-lg p-3 flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                      ✓
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 truncate">{user.name}</p>
                      <p className="text-sm text-gray-600">{user.msnv}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 sticky bottom-0 bg-white">
              <button
                onClick={() => setShowOnlineModal(false)}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold px-6 py-3 rounded-lg"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Lịch sử rung chuông */}
      {showBellModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowBellModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-2xl font-black text-gray-800">🔔 Lịch sử rung chuông ({bellHistory.length})</h2>
            </div>
            <div className="p-6 space-y-3">
              {bellHistory.map((bell, index) => (
                <div key={bell.msnv} className={`rounded-lg p-4 border-2 ${
                  bell.answered ? 'bg-gray-50 border-gray-300 opacity-60' : 'bg-orange-50 border-orange-300'
                }`}>
                  <div className="flex items-center gap-3">
                    <span className="bg-orange-600 text-white font-black text-xl w-10 h-10 rounded-full flex items-center justify-center">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <p className="font-bold text-gray-800">{bell.name}</p>
                      <p className="text-sm text-gray-600">{bell.msnv}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        {new Date(bell.timestamp).toLocaleTimeString()}
                      </p>
                      <p className={`text-xs font-bold ${bell.answered ? 'text-gray-500' : 'text-orange-600'}`}>
                        {bell.answered ? '✅ Đã xử lý' : '⏳ Chờ xử lý'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-6 border-t border-gray-200 sticky bottom-0 bg-white">
              <button
                onClick={() => setShowBellModal(false)}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold px-6 py-3 rounded-lg"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Chi tiết câu hỏi */}
      {showQuestionDetail && selectedQuestionDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowQuestionDetail(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-2xl font-black text-gray-800">
                Câu {selectedQuestionDetail.order}: {selectedQuestionDetail.content.substring(0, 50)}...
              </h2>
            </div>
            
            <QuestionDetailContent questionId={selectedQuestionDetail.id} />
            
            <div className="p-6 border-t border-gray-200 sticky bottom-0 bg-white">
              <button
                onClick={() => setShowQuestionDetail(false)}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold px-6 py-3 rounded-lg"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}