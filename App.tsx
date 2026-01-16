
import React, { useState, useEffect, useMemo } from 'react';
import { AppState, Lesson, NATIVE_LANGUAGES, TranscriptionItem, Feedback, SessionRecord } from './types';
import { LESSONS, DAILY_TOPICS, getRandomDailyTopic } from './constants';
import PracticeSession from './components/PracticeSession';

type DifficultyFilter = 'All' | 'Beginner' | 'Intermediate' | 'Advanced';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<AppState>(AppState.HOME);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [nativeLanguage, setNativeLanguage] = useState(NATIVE_LANGUAGES.find(l => l.code === 'ml') || NATIVE_LANGUAGES.find(l => l.code === 'en') || NATIVE_LANGUAGES[0]);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [sessionHistory, setSessionHistory] = useState<SessionRecord[]>([]);
  const [activeFilter, setActiveFilter] = useState<DifficultyFilter>('All');

  // Pick 4 fresh topics daily or on refresh
  const featuredTopics = useMemo(() => {
    return [...DAILY_TOPICS].sort(() => 0.5 - Math.random()).slice(0, 4);
  }, []);

  useEffect(() => {
    const savedCompleted = localStorage.getItem('fluentgen_completed_lessons');
    const savedHistory = localStorage.getItem('fluentgen_session_history');
    const savedLangCode = localStorage.getItem('fluentgen_native_lang');
    
    if (savedCompleted) setCompletedLessons(JSON.parse(savedCompleted));
    if (savedHistory) setSessionHistory(JSON.parse(savedHistory));
    if (savedLangCode) {
      const lang = NATIVE_LANGUAGES.find(l => l.code === savedLangCode);
      if (lang) setNativeLanguage(lang);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('fluentgen_completed_lessons', JSON.stringify(completedLessons));
    localStorage.setItem('fluentgen_session_history', JSON.stringify(sessionHistory));
    localStorage.setItem('fluentgen_native_lang', nativeLanguage.code);
  }, [completedLessons, sessionHistory, nativeLanguage]);

  const startPractice = (lesson: Lesson | null = null, specificTopic: string | null = null) => {
    if (!lesson) {
      const topic = specificTopic || getRandomDailyTopic();
      setSelectedLesson({
        id: `daily-${Date.now()}`,
        title: 'Daily Conversation',
        description: `Topic: ${topic}`,
        difficulty: 'Intermediate',
        category: 'Conversation',
        icon: '💬',
        instruction: `Engage the user in a casual conversation about the following topic: "${topic}". Ask open-ended questions and encourage them to express their opinions.`
      });
    } else {
      setSelectedLesson(lesson);
    }
    setCurrentPage(AppState.PRACTICE);
  };

  const handleSessionEnd = (transcriptions: TranscriptionItem[], feedbacks: Feedback[]) => {
    if (transcriptions.length > 0) {
      const newRecord: SessionRecord = {
        id: `session-${Date.now()}`,
        lessonTitle: selectedLesson?.title || 'Daily Session',
        timestamp: Date.now(),
        transcriptions,
        feedbacks
      };
      setSessionHistory(prev => [newRecord, ...prev].slice(0, 50)); 
    }

    if (selectedLesson && !selectedLesson.id.startsWith('daily-')) {
      if (!completedLessons.includes(selectedLesson.id)) {
        setCompletedLessons(prev => [...prev, selectedLesson.id]);
      }
    }
    setSelectedLesson(null);
    setCurrentPage(AppState.HOME);
  };

  const filteredLessons = activeFilter === 'All' 
    ? LESSONS 
    : LESSONS.filter(l => l.difficulty === activeFilter);

  const completionPercentage = Math.round((completedLessons.length / LESSONS.length) * 100);

  if (currentPage === AppState.PRACTICE) {
    return (
      <PracticeSession 
        lesson={selectedLesson} 
        nativeLanguageName={nativeLanguage.name}
        onEnd={handleSessionEnd} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col pb-24 sm:pb-0">
      <header className="glass-panel sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentPage(AppState.HOME)}>
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
            <span className="text-white font-black text-xl">F</span>
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-800">FluentGen</h1>
        </div>
        
        <div className="flex gap-4">
          <div className="hidden sm:flex flex-col items-end justify-center mr-2">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mastery</span>
              <span className="text-xs font-black text-blue-600">{completionPercentage}%</span>
            </div>
            <div className="w-32 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${completionPercentage}%` }}></div>
            </div>
          </div>
          <button className="hidden sm:flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-gray-100 shadow-sm hover:shadow-md transition-all">
            <span className="text-orange-500 font-bold">🔥 12</span>
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-widest">Streak</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
        {currentPage === AppState.HOME ? (
          <>
            <section className="mb-10">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-800 rounded-[2.5rem] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl">
                <div className="relative z-10">
                  <span className="inline-block bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-[0.2em] mb-6">Premium AI Tutor</span>
                  <h2 className="text-4xl md:text-5xl font-black mb-4 leading-tight">Speak English<br/>Like a Native</h2>
                  <p className="text-blue-100 text-lg mb-8 max-w-lg leading-relaxed">Real-time feedback in your language. Correct your grammar, vocabulary, and pronunciation naturally.</p>
                  
                  <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-end">
                    <button 
                      onClick={() => startPractice()}
                      className="bg-white text-blue-700 px-10 py-5 rounded-[2rem] font-black text-lg shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-3 active:scale-95"
                    >
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" /><path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" /></svg>
                      Quick Random Topic
                    </button>

                    <div className="flex-1 max-w-xs">
                      <label className="block text-[10px] font-black text-blue-200 uppercase tracking-[0.2em] mb-2 ml-1">Native Language for Help</label>
                      <div className="relative">
                        <select 
                          value={nativeLanguage.code}
                          onChange={(e) => setNativeLanguage(NATIVE_LANGUAGES.find(l => l.code === e.target.value) || NATIVE_LANGUAGES[0])}
                          className="appearance-none bg-white/10 backdrop-blur-lg border border-white/20 text-white font-bold py-4 pl-5 pr-12 rounded-[1.5rem] focus:outline-none focus:ring-2 focus:ring-white/50 w-full cursor-pointer hover:bg-white/20 transition-colors"
                        >
                          {NATIVE_LANGUAGES.map(lang => (
                            <option key={lang.code} value={lang.code} className="text-gray-900 bg-white py-2">{lang.flag} {lang.name}</option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-5 text-white opacity-50"><svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.707 6.586 4.293 8z"/></svg></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400/10 rounded-full -ml-24 -mb-24 blur-3xl"></div>
              </div>
            </section>

            {/* NEW: Suggested Daily Topics */}
            <section className="mb-14">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Today's Topics</h3>
                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest">Personalized</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {featuredTopics.map((topic, idx) => (
                  <button
                    key={idx}
                    onClick={() => startPractice(null, topic)}
                    className="flex flex-col text-left bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all group active:scale-[0.97]"
                  >
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-xl mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      {['💡', '✨', '🌍', '🤔'][idx % 4]}
                    </div>
                    <p className="text-sm font-bold text-gray-800 leading-tight flex-1">{topic}</p>
                    <div className="mt-4 flex items-center text-[10px] font-black text-blue-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                      Start Now <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section className="mb-24">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Learning Paths</h3>
                <div className="flex bg-gray-100/50 p-1.5 rounded-2xl border border-gray-100 overflow-x-auto no-scrollbar">
                  {(['All', 'Beginner', 'Intermediate', 'Advanced'] as DifficultyFilter[]).map((filter) => (
                    <button key={filter} onClick={() => setActiveFilter(filter)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeFilter === filter ? 'bg-white text-blue-600 shadow-md' : 'text-gray-400'}`}>{filter}</button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                {filteredLessons.map((lesson) => {
                  const isCompleted = completedLessons.includes(lesson.id);
                  return (
                    <div key={lesson.id} onClick={() => startPractice(lesson)} className={`group relative bg-white p-8 rounded-[2.5rem] border ${isCompleted ? 'border-green-100' : 'border-gray-100'} shadow-sm hover:shadow-2xl hover:border-blue-200 transition-all cursor-pointer flex flex-col active:scale-[0.98]`}>
                      {isCompleted && <div className="absolute top-0 right-0 bg-green-500 text-white px-6 py-1.5 rounded-bl-3xl font-black text-[10px] uppercase tracking-widest">Completed</div>}
                      <div className="flex justify-between items-start mb-6">
                        <div className={`w-16 h-16 ${isCompleted ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'} text-4xl flex items-center justify-center rounded-[1.25rem] group-hover:bg-blue-600 group-hover:text-white transition-all`}>{lesson.icon}</div>
                        <span className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-gray-50 text-gray-500 border border-gray-100">{lesson.difficulty}</span>
                      </div>
                      <h4 className="text-2xl font-black text-gray-900 mb-3">{lesson.title}</h4>
                      <p className="text-gray-500 text-base leading-relaxed mb-8 flex-1">{lesson.description}</p>
                      <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">{lesson.category}</span>
                        <div className="w-12 h-12 rounded-full bg-slate-50 text-gray-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        ) : (
          <section className="animate-in fade-in duration-500">
             <div className="flex items-center justify-between mb-10">
                <h3 className="text-3xl font-black text-gray-900 tracking-tight">Session History</h3>
                <button onClick={() => setSessionHistory([])} className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:bg-red-50 px-4 py-2 rounded-xl transition-all">Clear All</button>
             </div>
             {sessionHistory.length === 0 ? (
               <div className="py-20 flex flex-col items-center text-center opacity-40">
                  <div className="text-6xl mb-6">📂</div>
                  <h4 className="text-xl font-bold">No sessions recorded yet</h4>
                  <p className="text-sm">Your practice chat history will appear here.</p>
               </div>
             ) : (
               <div className="space-y-6">
                 {sessionHistory.map(record => (
                   <div key={record.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-black text-gray-800 text-lg">{record.lessonTitle}</h4>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{new Date(record.timestamp).toLocaleString()}</p>
                        </div>
                        <div className="flex gap-2">
                           <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black">{record.transcriptions.length} Messages</span>
                           <span className="bg-orange-50 text-orange-600 px-3 py-1 rounded-full text-[10px] font-black">{record.feedbacks.length} Tips</span>
                        </div>
                      </div>
                      <div className="max-h-40 overflow-y-auto bg-gray-50/50 rounded-2xl p-4 text-xs text-gray-600 leading-relaxed italic border border-gray-100">
                        {record.transcriptions.slice(0, 3).map((t, i) => (
                          <p key={i} className="mb-2"><span className="font-black uppercase text-[8px] tracking-widest text-blue-600">{t.speaker}:</span> {t.text.slice(0, 100)}...</p>
                        ))}
                        {record.transcriptions.length > 3 && <p className="text-center font-black opacity-30 mt-2">... and more</p>}
                      </div>
                   </div>
                 ))}
               </div>
             )}
          </section>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 glass-panel border-t border-gray-100 px-8 py-4 flex justify-around items-center z-40">
         <button onClick={() => setCurrentPage(AppState.HOME)} className={`flex flex-col items-center gap-1.5 transition-colors ${currentPage === AppState.HOME ? 'text-blue-600' : 'text-gray-400'}`}>
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001 1h2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>
            <span className="text-[9px] font-black uppercase tracking-widest">Home</span>
         </button>
         <button onClick={() => startPractice()} className="w-16 h-16 bg-blue-600 rounded-full shadow-2xl flex items-center justify-center text-white border-[6px] border-white active:scale-90 transition-all -top-8 relative">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
         </button>
         <button onClick={() => setCurrentPage(AppState.HISTORY)} className={`flex flex-col items-center gap-1.5 transition-colors ${currentPage === AppState.HISTORY ? 'text-blue-600' : 'text-gray-400'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="text-[9px] font-black uppercase tracking-widest">History</span>
         </button>
      </nav>
    </div>
  );
};

export default App;
