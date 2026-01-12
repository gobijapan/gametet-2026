'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue, get, set, remove, push } from 'firebase/database';
import { auth, database } from '@/lib/firebase';
import { FiPlus, FiEdit2, FiTrash2, FiImage, FiType, FiShuffle } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function QuestionsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    type: 'crossword',
    content: '',
    mediaUrl: '',
    answer: '',
    scrambledAnswer: '',
    keyPosition: 1,
    timer: 30,
    order: 1,
  });

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
      } else {
        setQuestions([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // Handle add/edit question
  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.content || !formData.answer) {
      toast.error('Vui lòng điền đầy đủ thông tin!');
      return;
    }

    if (formData.keyPosition < 1 || formData.keyPosition > formData.answer.length) {
      toast.error(`Vị trí KEY phải từ 1 đến ${formData.answer.length}!`);
      return;
    }

    try {
      if (editingQuestion) {
        // Update existing
        await set(ref(database, `questions/${editingQuestion.id}`), {
          ...formData,
          answer: formData.answer.toUpperCase(),
          scrambledAnswer: formData.type === 'scramble' ? formData.scrambledAnswer : null,
        });
        toast.success('Đã cập nhật câu hỏi!');
      } else {
        // Add new
        const newRef = push(ref(database, 'questions'));
        await set(newRef, {
          ...formData,
          answer: formData.answer.toUpperCase(),
          scrambledAnswer: formData.type === 'scramble' ? formData.scrambledAnswer : null,
        });
        toast.success('Đã thêm câu hỏi mới!');
      }

      setShowModal(false);
      setEditingQuestion(null);
      resetForm();
    } catch (error) {
      console.error(error);
      toast.error('Có lỗi xảy ra!');
    }
  };

  // Shuffle answer
const handleShuffle = () => {
  if (!formData.answer) {
    toast.error('Vui lòng nhập đáp án trước!');
    return;
  }

  const letters = formData.answer.split('');
  
  // Fisher-Yates shuffle
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  
  const scrambled = letters.join('');
  
  // Đảm bảo kết quả khác với đáp án gốc
  if (scrambled === formData.answer && formData.answer.length > 1) {
    handleShuffle(); // Shuffle lại
    return;
  }
  
  setFormData({ ...formData, scrambledAnswer: scrambled });
  toast.success('Đã xáo trộn!');
};

  // Handle delete
  const handleDelete = async (questionId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa câu hỏi này?')) return;

    try {
      await remove(ref(database, `questions/${questionId}`));
      toast.success('Đã xóa câu hỏi!');
    } catch (error) {
      console.error(error);
      toast.error('Có lỗi xảy ra!');
    }
  };

  // Handle edit
  const handleEdit = (question: any) => {
    setEditingQuestion(question);
    setFormData({
      type: question.type,
      content: question.content,
      mediaUrl: question.mediaUrl || '',
      answer: question.answer,
      scrambledAnswer: question.scrambledAnswer || '',
      keyPosition: question.keyPosition,
      timer: question.timer,
      order: question.order,
    });
    setShowModal(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      type: 'crossword',
      content: '',
      mediaUrl: '',
      answer: '',
      scrambledAnswer: '',
      keyPosition: 1,
      timer: 30,
      order: questions.length + 1,
    });
  };

  // Open add modal
  const handleOpenAddModal = () => {
    resetForm();
    setEditingQuestion(null);
    setShowModal(true);
  };

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'crossword': return <FiType className="text-blue-600" />;
      case 'image': return <FiImage className="text-green-600" />;
      case 'scramble': return <FiShuffle className="text-purple-600" />;
      default: return <FiType />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch(type) {
      case 'crossword': return 'Ô chữ';
      case 'image': return 'Đuổi hình';
      case 'scramble': return 'Xáo chữ';
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600 text-xl font-bold">Đang tải...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-gray-800">Quản lý câu hỏi</h1>
          <p className="text-gray-600 mt-1">Tạo và chỉnh sửa câu hỏi cho game</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold px-6 py-3 rounded-lg shadow-lg transform hover:scale-105 transition-all"
        >
          <FiPlus size={20} />
          Thêm câu hỏi
        </button>
      </div>

      {/* Questions table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">STT</th>
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Loại</th>
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Nội dung</th>
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Đáp án</th>
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">KEY</th>
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Timer</th>
              <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {questions.length > 0 ? (
              questions.map((q, index) => (
                <tr key={q.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="bg-gray-200 text-gray-800 font-bold px-3 py-1 rounded-full text-sm">
                      {q.order}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(q.type)}
                      <span className="font-semibold text-gray-700">{getTypeLabel(q.type)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-gray-800 font-medium line-clamp-2 max-w-md">
                      {q.content}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded">
                      {q.answer}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono font-bold text-yellow-700 bg-yellow-50 px-3 py-1 rounded">
                      {q.answer[q.keyPosition - 1]} (Vị trí {q.keyPosition})
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-gray-700 font-semibold">{q.timer}s</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(q)}
                        className="p-2 hover:bg-blue-100 rounded-lg transition-colors text-blue-600"
                        title="Sửa"
                      >
                        <FiEdit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(q.id)}
                        className="p-2 hover:bg-red-100 rounded-lg transition-colors text-red-600"
                        title="Xóa"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  Chưa có câu hỏi nào. Bấm "Thêm câu hỏi" để bắt đầu!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-black text-gray-800">
                {editingQuestion ? 'Sửa câu hỏi' : 'Thêm câu hỏi mới'}
              </h2>
            </div>

            <form onSubmit={handleSaveQuestion} className="p-6 space-y-4">
              
              {/* Type */}
              <div>
                <label className="block text-gray-700 font-bold mb-2">Loại câu hỏi</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'crossword' })}
                    className={`p-4 rounded-lg border-2 font-semibold transition-all ${
                      formData.type === 'crossword'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    <FiType className="mx-auto mb-2" size={24} />
                    Ô chữ
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'image' })}
                    className={`p-4 rounded-lg border-2 font-semibold transition-all ${
                      formData.type === 'image'
                        ? 'border-green-600 bg-green-50 text-green-700'
                        : 'border-gray-300 hover:border-green-400'
                    }`}
                  >
                    <FiImage className="mx-auto mb-2" size={24} />
                    Đuổi hình
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'scramble' })}
                    className={`p-4 rounded-lg border-2 font-semibold transition-all ${
                      formData.type === 'scramble'
                        ? 'border-purple-600 bg-purple-50 text-purple-700'
                        : 'border-gray-300 hover:border-purple-400'
                    }`}
                  >
                    <FiShuffle className="mx-auto mb-2" size={24} />
                    Xáo chữ
                  </button>
                </div>
              </div>

              {/* Content */}
              <div>
                <label className="block text-gray-700 font-bold mb-2">
                  Nội dung câu hỏi {formData.type === 'scramble' && <span className="text-sm text-gray-500">(Gợi ý cho người chơi)</span>}
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 resize-none"
                  rows={3}
                  placeholder="Nhập nội dung câu hỏi..."
                  required
                />
              </div>

              {/* Media URL (for image type) */}
              {(formData.type === 'image' || formData.type === 'scramble') && (
                <div>
                  <label className="block text-gray-700 font-bold mb-2">
                    URL hình ảnh/video {formData.type === 'scramble' && <span className="text-sm text-gray-500">(Tùy chọn)</span>}
                  </label>
                  <input
                    type="url"
                    value={formData.mediaUrl}
                    onChange={(e) => setFormData({ ...formData, mediaUrl: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    placeholder="https://i.imgur.com/..."
                  />
                  {formData.mediaUrl && (
                    <div className="mt-2">
                      <img src={formData.mediaUrl} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
                    </div>
                  )}
                </div>
              )}

              {/* Answer */}
              <div>
                <label className="block text-gray-700 font-bold mb-2">Đáp án</label>
                <input
                  type="text"
                  value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 uppercase font-bold text-lg tracking-wider"
                  placeholder="VD: XUÂN"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">Độ dài: {formData.answer.length} chữ cái</p>
              </div>

              {/* Scrambled Answer - CHỈ HIỆN KHI TYPE = SCRAMBLE */}
              {formData.type === 'scramble' && (
                <div>
                  <label className="block text-gray-700 font-bold mb-2">Chữ đã xáo trộn</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.scrambledAnswer}
                      onChange={(e) => setFormData({ ...formData, scrambledAnswer: e.target.value.toUpperCase() })}
                      className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 uppercase font-bold text-lg tracking-wider"
                      placeholder="Kết quả sau khi xáo..."
                      readOnly
                    />
                    <button
                      type="button"
                      onClick={handleShuffle}
                      className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold px-6 py-3 rounded-lg shadow-lg transform hover:scale-105 transition-all flex items-center gap-2"
                    >
                      <FiShuffle size={20} />
                      Shuffle
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Bấm "Shuffle" để xáo trộn ngẫu nhiên
                  </p>
                  
                  {formData.scrambledAnswer && (
                    <div className="mt-3 bg-purple-50 rounded-lg p-4 border-2 border-purple-200">
                      <p className="text-sm text-purple-700 font-bold mb-2">Preview:</p>
                      <div className="flex gap-2 flex-wrap">
                        {formData.scrambledAnswer.split('').map((letter, index) => (
                          <div
                            key={index}
                            className="bg-purple-500 text-white font-black text-xl w-10 h-10 rounded flex items-center justify-center"
                          >
                            {letter}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Key position */}
              <div>
                <label className="block text-gray-700 font-bold mb-2">
                  Vị trí chữ KEY (từ 1 đến {formData.answer.length || '?'})
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    min="1"
                    max={formData.answer.length || 10}
                    value={formData.keyPosition}
                    onChange={(e) => setFormData({ ...formData, keyPosition: parseInt(e.target.value) || 1 })}
                    className="w-24 px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 font-bold text-center"
                    required
                  />
                  {formData.answer && formData.keyPosition <= formData.answer.length && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">→</span>
                      <div className="bg-yellow-400 text-red-900 font-black text-2xl w-12 h-12 rounded-lg flex items-center justify-center border-3 border-yellow-600">
                        {formData.answer[formData.keyPosition - 1] || '?'}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Timer */}
                <div>
                  <label className="block text-gray-700 font-bold mb-2">Timer (giây)</label>
                  <input
                    type="number"
                    min="10"
                    max="120"
                    value={formData.timer}
                    onChange={(e) => setFormData({ ...formData, timer: parseInt(e.target.value) || 30 })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 font-bold"
                    required
                  />
                </div>

                {/* Order */}
                <div>
                  <label className="block text-gray-700 font-bold mb-2">Thứ tự câu hỏi</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 font-bold"
                    required
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold px-6 py-3 rounded-lg shadow-lg transform hover:scale-105 transition-all"
                >
                  {editingQuestion ? 'Cập nhật' : 'Thêm mới'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingQuestion(null);
                  }}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold px-6 py-3 rounded-lg"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}