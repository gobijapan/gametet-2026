export interface User {
  maNV: string;
  name: string;
  email: string;
  role: 'player' | 'mc' | 'admin';
}

export interface Question {
  id: string;
  type: 'crossword' | 'image' | 'scramble';
  content: string;
  mediaUrl?: string;
  answer: string;
  keyPosition: number;
  timer: number;
  order: number;
}

export interface GameConfig {
  secretWord: string;
  keyMapping: Record<number, { fromQuestion: number; letter: string }>;
  miniGameTrigger: {
    type: 'afterQuestion' | 'afterEveryXQuestions';
    value: number | number[];
  };
  thanTaiTrigger: {
    type: 'afterQuestion' | 'afterEveryXQuestions';
    value: number | number[];
  };
}

export interface PlayerAnswer {
  answer: string;
  timestamp: number;
  isCorrect?: boolean;
}

export interface BellRing {
  maNV: string;
  name: string;
  timestamp: number;
}