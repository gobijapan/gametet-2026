'use client';

import { useEffect, useState } from 'react';
import { ref, get } from 'firebase/database';
import { database } from '@/lib/firebase';

interface Props {
  questionId: string;
}

export default function QuestionDetailContent({ questionId }: Props) {
  const [answers, setAnswers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnswers = async () => {
      const answersRef = ref(database, `answers/${questionId}`);
      const answersSnapshot = await get(answersRef);
      
      if (answersSnapshot.exists()) {
        const answersData = answersSnapshot.val();
        
        // Get user info
        const usersRef = ref(database, 'users');
        const usersSnapshot = await get(usersRef);
        const usersData = usersSnapshot.exists() ? usersSnapshot.val() : {};
        
        // Get correct answer
        const questionRef = ref(database, `questions/${questionId}`);
        const questionSnapshot = await get(questionRef);
        const correctAnswer = questionSnapshot.exists() ? questionSnapshot.val().answer : '';
        
        const answersArray = Object.keys(answersData).map((msnv) => ({
          msnv,
          name: usersData[msnv]?.name || 'Unknown',
          ...answersData[msnv],
          isCorrect: answersData[msnv].answer.toUpperCase() === correctAnswer.toUpperCase(),
        }));
        
        answersArray.sort((a, b) => a.timestamp - b.timestamp);
        setAnswers(answersArray);
      }
      
      setLoading(false);
    };

    loadAnswers();
  }, [questionId]);

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Đang tải...</div>;
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <p className="text-gray-600 text-sm mb-1">Tổng trả lời</p>
          <p className="text-3xl font-black text-blue-600">{answers.length}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <p className="text-gray-600 text-sm mb-1">Đúng</p>
          <p className="text-3xl font-black text-green-600">{answers.filter(a => a.isCorrect).length}</p>
        </div>
        <div className="bg-red-50 rounded-lg p-4 text-center">
          <p className="text-gray-600 text-sm mb-1">Sai</p>
          <p className="text-3xl font-black text-red-600">{answers.filter(a => !a.isCorrect).length}</p>
        </div>
      </div>

      <h3 className="font-black text-gray-800 mb-3">📋 Danh sách trả lời:</h3>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {answers.map((answer, index) => (
          <div 
            key={answer.msnv} 
            className={`flex items-center gap-3 p-3 rounded-lg border ${
              answer.isCorrect 
                ? 'bg-green-50 border-green-300' 
                : 'bg-red-50 border-red-300'
            }`}
          >
            <span className="font-bold text-gray-600 w-8">{index + 1}.</span>
            <div className="flex-1">
              <p className="font-bold text-gray-800">{answer.name}</p>
              <p className="text-sm text-gray-600">{answer.msnv}</p>
            </div>
            <div className="text-center">
              <p className="font-mono font-black text-lg">{answer.answer}</p>
              <p className="text-xs text-gray-500">
                {new Date(answer.timestamp).toLocaleTimeString()}
              </p>
            </div>
            <span className={`font-bold text-xl ${answer.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
              {answer.isCorrect ? '✓' : '✗'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}