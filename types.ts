
export interface Lesson {
  id: string;
  title: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  category: 'Conversation' | 'Professional' | 'Travel' | 'Academic';
  instruction: string;
  icon: string;
}

export interface Feedback {
  type: 'grammar' | 'vocabulary' | 'pronunciation' | 'general';
  rule?: string;
  original?: string;
  suggested?: string;
  explanation?: string;
  reason: string;
}

export interface TranscriptionItem {
  id: string;
  speaker: 'user' | 'ai';
  text: string;
  translation?: string;
  isStreaming?: boolean;
  timestamp: number;
}

export interface SessionRecord {
  id: string;
  lessonTitle: string;
  timestamp: number;
  transcriptions: TranscriptionItem[];
  feedbacks: Feedback[];
}

export interface LiveAnalytics {
  sentiment: 'Confident' | 'Hesitant' | 'Frustrated' | 'Engaged' | 'Neutral';
  intent: 'Answering' | 'Asking' | 'Small Talk' | 'Clarifying' | 'Practicing';
  entities: string[];
  pronunciation?: {
    score: number;
    phonemes: string[];
    intonation: string;
  };
}

export enum AppState {
  HOME = 'HOME',
  PRACTICE = 'PRACTICE',
  HISTORY = 'HISTORY'
}

export const NATIVE_LANGUAGES = [
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'bn', name: 'Bengali', flag: '🇧🇩' },
  { code: 'bg', name: 'Bulgarian', flag: '🇧🇬' },
  { code: 'zh', name: 'Chinese (Mandarin)', flag: '🇨🇳' },
  { code: 'hr', name: 'Croatian', flag: '🇭🇷' },
  { code: 'cs', name: 'Czech', flag: '🇨🇿' },
  { code: 'da', name: 'Danish', flag: '🇩🇰' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'et', name: 'Estonian', flag: '🇪🇪' },
  { code: 'fi', name: 'Finnish', flag: '🇫🇮' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'el', name: 'Greek', flag: '🇬🇷' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'hu', name: 'Hungarian', flag: '🇭🇺' },
  { code: 'id', name: 'Indonesian', flag: '🇮🇩' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'lv', name: 'Latvian', flag: '🇱🇻' },
  { code: 'lt', name: 'Lithuanian', flag: '🇱🇹' },
  { code: 'ms', name: 'Malay', flag: '🇲🇾' },
  { code: 'ml', name: 'Malayalam', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', flag: '🇮🇳' },
  { code: 'no', name: 'Norwegian', flag: '🇳🇴' },
  { code: 'fa', name: 'Persian', flag: '🇮🇷' },
  { code: 'pl', name: 'Polish', flag: '🇵🇱' },
  { code: 'pt', name: 'Portuguese', flag: '🇧🇷' },
  { code: 'pa', name: 'Punjabi', flag: '🇵🇰' },
  { code: 'ro', name: 'Romanian', flag: '🇷🇴' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'sr', name: 'Serbian', flag: '🇷🇸' },
  { code: 'sk', name: 'Slovak', flag: '🇸🇰' },
  { code: 'sl', name: 'Slovenian', flag: '🇸🇮' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'sw', name: 'Swahili', flag: '🇰🇪' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
  { code: 'ta', name: 'Tamil', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', flag: '🇮🇳' },
  { code: 'th', name: 'Thai', flag: '🇹🇭' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
  { code: 'uk', name: 'Ukrainian', flag: '🇺🇦' },
  { code: 'ur', name: 'Urdu', flag: '🇵🇰' },
  { code: 'vi', name: 'Vietnamese', flag: '🇻🇳' },
].sort((a, b) => a.name.localeCompare(b.name));
