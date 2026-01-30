export type Role = 'admin' | 'student';

export interface Student {
  id: string;
  nisn: string;
  name: string;
  school: string;
  password?: string;
  isLogin: boolean;
  status: 'idle' | 'working' | 'finished' | 'blocked';
  score?: number;
}

export interface Question {
  id: number;
  text: string;
  options: string[];
  correctAnswer: number; // Index 0-3
  type: 'pilihan_ganda';
  imgUrl?: string;
}

export interface Subject {
  id: string;
  name: string;
  duration: number; // minutes
  questionCount: number;
  token: string;
}

export interface AppConfig {
  appName: string;
  logoUrl: string;
  themeColor: string;
  antiCheat: {
    enabled: boolean;
    freezeDuration: number;
    warningMessage: string;
  };
}
