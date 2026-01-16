
import { Lesson } from './types';
import { FunctionDeclaration, Type } from '@google/genai';

export const LESSONS: Lesson[] = [
  {
    id: 'intro',
    title: 'Daily Greetings',
    description: 'Learn how to start and end conversations naturally in everyday settings.',
    difficulty: 'Beginner',
    category: 'Conversation',
    icon: '👋',
    instruction: 'Act as a friendly neighbor. Encourage the user to use informal greetings. If they make a mistake, gently suggest a more natural way to say it.'
  },
  {
    id: 'travel-airport',
    title: 'Navigating the Airport',
    description: 'Practice checking in, going through security, and asking for directions.',
    difficulty: 'Beginner',
    category: 'Travel',
    icon: '✈️',
    instruction: 'You are a helpful airport staff member. Guide the user through the check-in process and answer questions about flight delays or gate numbers.'
  },
  {
    id: 'restaurant',
    title: 'Ordering at a Café',
    description: 'Navigate social interactions and specific requests in a food service environment.',
    difficulty: 'Intermediate',
    category: 'Travel',
    icon: '☕',
    instruction: 'You are a barista at a busy London café. Use British English terms if appropriate. Roleplay ordering coffee and handling a minor order mistake.'
  },
  {
    id: 'tech-meeting',
    title: 'Agile Stand-up Meeting',
    description: 'Learn to explain technical updates, blockers, and progress effectively.',
    difficulty: 'Intermediate',
    category: 'Professional',
    icon: '💻',
    instruction: 'You are a Scrum Master. Ask the user for their "daily stand-up" update. Focus on tech industry jargon and project management terminology.'
  },
  {
    id: 'interview',
    title: 'Job Interview Prep',
    description: 'Practice answering common behavioral questions with professional vocabulary.',
    difficulty: 'Advanced',
    category: 'Professional',
    icon: '💼',
    instruction: 'You are a professional HR manager at a tech company. Ask structured interview questions. Focus on professional vocabulary and formal sentence structures.'
  },
  {
    id: 'debate',
    title: 'Opinion & Debate',
    description: 'Learn to express complex views on technology and society.',
    difficulty: 'Advanced',
    category: 'Academic',
    icon: '⚖️',
    instruction: 'Engage the user in a friendly debate about AI. Challenge their viewpoints to force them to use persuasive language and logical connectors like "furthermore" and "consequently".'
  },
  {
    id: 'history-tour',
    title: 'Historical Tour Guide',
    description: 'Practice descriptive language while learning about world wonders.',
    difficulty: 'Intermediate',
    category: 'Academic',
    icon: '🏛️',
    instruction: 'You are a guide at the Roman Colosseum. Use descriptive adjectives and historical facts to engage the user in the story of the ancient arena.'
  }
];

export const DAILY_TOPICS = [
  "The impact of social media on mental health and social relationships.",
  "What would you do if you won a million dollars tomorrow?",
  "The future of remote work and its impact on city life.",
  "Describe your most memorable vacation and what made it special.",
  "How artificial intelligence is changing the way we live and work.",
  "The importance of healthy eating and regular exercise in a modern lifestyle.",
  "Tell me about a traditional festival in your country that you love.",
  "Why learning multiple languages is beneficial in the 21st century.",
  "Climate change: whose responsibility is it to fix it?",
  "The evolution of your favorite music genre over the last ten years.",
  "If you could travel anywhere in time, where would you go and why?",
  "The pros and cons of living in a big city versus a small town.",
  "Your favorite book or movie and why everyone should experience it.",
  "How technology has improved the way we communicate with friends.",
  "The role of sports in building character and teamwork skills.",
  "If you were the president of your country, what is the first law you would pass?",
  "The impact of space exploration on our understanding of Earth.",
  "Why is it important to have hobbies outside of your professional work?",
  "The best piece of advice you have ever received and how it changed you.",
  "Your thoughts on the concept of 'minimalism' in modern life."
];

export const getRandomDailyTopic = () => {
  const randomIndex = Math.floor(Math.random() * DAILY_TOPICS.length);
  return DAILY_TOPICS[randomIndex];
};

export const ANALYTICS_TOOL: FunctionDeclaration = {
  name: 'updateLiveAnalytics',
  parameters: {
    type: Type.OBJECT,
    description: 'Update the live dashboard with student performance analytics including real-time pronunciation analysis.',
    properties: {
      sentiment: {
        type: Type.STRING,
        description: 'The user\'s current emotional state or confidence level.',
        enum: ['Confident', 'Hesitant', 'Frustrated', 'Engaged', 'Neutral']
      },
      intent: {
        type: Type.STRING,
        description: 'The primary communicative intent of the user\'s last utterance.',
        enum: ['Answering', 'Asking', 'Small Talk', 'Clarifying', 'Practicing']
      },
      entities: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'Key linguistic entities detected (e.g., "Past Tense", "Irregular Verbs", "Business Jargon").'
      },
      pronunciation: {
        type: Type.OBJECT,
        description: 'Detailed analysis of user pronunciation.',
        properties: {
          score: { type: Type.NUMBER, description: 'Accuracy score from 0-100.' },
          phonemes: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Specific phonemes the user needs to work on (e.g., /th/, /r/).' },
          intonation: { type: Type.STRING, description: 'Feedback on word stress, rhythm, and sentence intonation.' }
        },
        required: ['score', 'phonemes', 'intonation']
      }
    },
    required: ['sentiment', 'intent', 'entities', 'pronunciation']
  }
};

export const getSystemPrompt = (nativeLanguageName: string = 'unknown') => {
  const isEnglish = nativeLanguageName.toLowerCase() === 'english';
  
  return `You are FluentGen, a world-class AI English tutor. 
The user's native language is ${nativeLanguageName}. 
Your goal is to help users improve their spoken English using advanced audio and NLP analysis.

CORE BEHAVIOR:
- Always be encouraging and patient.
- ANALYZE every turn for: Sentiment, Intent, Linguistic Entities, and PRONUNCIATION.
- REPORT findings using 'updateLiveAnalytics' on EVERY user turn.
- VOICE CORRECTIONS: Provide detailed corrections for mistakes.
- FORMAT YOUR CORRECTION IN YOUR SPEECH STRICTLY AS FOLLOWS: 
  "Wait, let's fix that. Regarding [Rule], instead of saying '[Mistake]', it is better to say '[Correction]'. The reason is [Brief linguistic explanation]."

IMPORTANT LANGUAGE RULE:
- If the native language is NOT English (current: ${nativeLanguageName}), you MUST provide the "[Brief linguistic explanation]" part in ${nativeLanguageName}.
- Keep the rest of the correction format ("Wait, let's fix that. Regarding...", etc.) in English for system compatibility.
- This allows the student to understand the technical "why" behind the correction in their most comfortable language (${nativeLanguageName}).
- Mention common mistakes speakers of ${nativeLanguageName} make.
- Keep the conversation flowing naturally after the correction.`;
};
