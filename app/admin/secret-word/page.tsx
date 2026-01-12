'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue, get, set } from 'firebase/database';
import { auth, database } from '@/lib/firebase';
import toast from 'react-hot-toast';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable item component
function SortableItem({ id, letter, questionOrder }: { id: string; letter: string; questionOrder: number }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-gradient-to-br from-yellow-400 to-yellow-600 text-red-900 font-black text-2xl w-16 h-16 rounded-lg flex flex-col items-center justify-center border-4 border-yellow-700 shadow-lg cursor-move hover:scale-105 transition-transform"
    >
      <span>{letter}</span>
      <span className="text-xs text-red-800">C{questionOrder}</span>
    </div>
  );
}

export default function SecretWordPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [secretWord, setSecretWord] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

        // Initialize items
        const initialItems = questionsArray.map(q => ({
          id: q.id,
          letter: q.answer[q.keyPosition - 1],
          questionOrder: q.order,
        }));
        setItems(initialItems);
      }
    });

    return () => unsubscribe();
  }, []);

  // Load saved keyMapping from Firebase
useEffect(() => {
  const loadKeyMapping = async () => {
    const configRef = ref(database, 'config/keyMapping');
    const snapshot = await get(configRef);
    
    if (snapshot.exists() && questions.length > 0) {
      const savedMapping = snapshot.val();
      
      // Sắp xếp lại items theo keyMapping đã lưu
      const sortedItems = Object.keys(savedMapping)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .map(position => {
          const keyInfo = savedMapping[position];
          return {
            id: keyInfo.questionId,
            letter: keyInfo.letter,
            questionOrder: keyInfo.fromQuestion,
          };
        });
      
      setItems(sortedItems);
      toast.success('Đã load thiết lập Ô Bí Ẩn!');
    }
  };

  if (questions.length > 0) {
    loadKeyMapping();
  }
}, [questions]);

  // Update secret word preview
  useEffect(() => {
    const word = items.map(item => item.letter).join('');
    setSecretWord(word);
  }, [items]);

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Handle save
  const handleSave = async () => {
    if (!secretWord || secretWord.length === 0) {
      toast.error('Vui lòng sắp xếp các KEY!');
      return;
    }

    try {
      const keyMapping: any = {};
      items.forEach((item, index) => {
        keyMapping[index + 1] = {
          fromQuestion: item.questionOrder,
          letter: item.letter,
          questionId: item.id,
        };
      });

      await set(ref(database, 'config'), {
        secretWord,
        keyMapping,
      });

      toast.success('Đã lưu thiết lập Ô Bí Ẩn!');
    } catch (error) {
      console.error(error);
      toast.error('Có lỗi xảy ra!');
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
      <div className="mb-6">
        <h1 className="text-3xl font-black text-gray-800">Thiết lập Ô Bí Ẩn</h1>
        <p className="text-gray-600 mt-1">Kéo thả để sắp xếp các chữ KEY</p>
      </div>

      {questions.length === 0 ? (
        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-6 text-center">
          <p className="text-yellow-800 font-bold">
            ⚠️ Chưa có câu hỏi nào! Vui lòng thêm câu hỏi trước.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
  
          {/* Phần trên: Kéo thả */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-black text-gray-800 mb-4">
              Các chữ KEY hiện có (Kéo thả để sắp xếp)
            </h2>
            
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={items.map(item => item.id)}
                strategy={horizontalListSortingStrategy}
              >
                <div className="flex gap-3 flex-wrap justify-center">
                  {items.map((item, index) => (
                    <div key={item.id} className="flex flex-col items-center gap-2">
                      <span className="text-gray-600 font-bold text-sm">Vị trí {index + 1}</span>
                      <SortableItem
                        id={item.id}
                        letter={item.letter}
                        questionOrder={item.questionOrder}
                      />
                    </div>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          {/* Phần dưới: Preview */}
          <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-xl shadow-lg p-6 text-white">
            <h2 className="text-xl font-black mb-4">Preview Đáp Án Bí Ẩn</h2>
            
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 mb-4">
              <p className="text-sm font-bold mb-3 text-purple-200 text-center">Đáp án cuối cùng:</p>
              <div className="flex gap-2 flex-wrap justify-center mb-4">
                {secretWord.split('').map((letter, index) => (
                  <div
                    key={index}
                    className="bg-yellow-400 text-red-900 font-black text-3xl w-14 h-14 md:w-16 md:h-16 rounded-lg flex items-center justify-center border-4 border-yellow-600 shadow-lg"
                  >
                    {letter}
                  </div>
                ))}
              </div>
              <p className="text-center text-3xl md:text-4xl font-black text-yellow-300">
                {secretWord}
              </p>
            </div>

            {/* Bảng thứ tự chi tiết - 4 CỘT */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 mb-4">
              <p className="text-sm font-bold mb-3 text-purple-200">Chi tiết thứ tự:</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {items.map((item, index) => (
                  <div key={item.id} className="bg-white/10 rounded-lg p-2 text-center">
                    <p className="text-xs text-purple-200 mb-1">Vị trí {index + 1}</p>
                    <p className="font-black text-yellow-300 text-lg">{item.letter}</p>
                    <p className="text-xs text-purple-300">(Câu {item.questionOrder})</p>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleSave}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-black text-lg px-6 py-3 rounded-lg shadow-lg transform hover:scale-105 transition-all"
            >
              💾 LƯU THIẾT LẬP
            </button>
          </div>
        </div>
      )}
    </div>
  );
}