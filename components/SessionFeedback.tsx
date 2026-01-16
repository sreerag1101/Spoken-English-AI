
import React, { useState, useEffect, useRef } from 'react';
import { TranscriptionItem, Feedback, LiveAnalytics } from '../types';
import { GoogleGenAI } from '@google/genai';

interface SessionFeedbackProps {
  transcriptions: TranscriptionItem[];
  feedbacks: Feedback[];
  analytics: LiveAnalytics;
  nativeLanguageName: string;
}

const SessionFeedback: React.FC<SessionFeedbackProps> = ({ transcriptions, feedbacks, analytics, nativeLanguageName }) => {
  const [translatingIds, setTranslatingIds] = useState<Set<string>>(new Set());
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom whenever transcriptions change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcriptions]);

  // Clean text to remove tool-call artifacts and technical leakage
  const cleanText = (text: string) => {
    return text
      .replace(/updateLiveAnalytics\{.*?\}/gi, '') // Remove tool call leakage
      .replace(/\{"result":\s*".*?"\}/gi, '')       // Remove JSON artifacts
      .replace(/<ctrl\d+>/gi, '')                   // Remove control character leaks
      .trim();
  };

  const handleTranslate = async (item: TranscriptionItem) => {
    if (translations[item.id] || translatingIds.has(item.id)) return;
    const textToTranslate = cleanText(item.text);
    if (!textToTranslate) return;

    setTranslatingIds(prev => new Set(prev).add(item.id));
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Translate the following English text into ${nativeLanguageName}. Provide ONLY the translation text without any preamble or explanation:\n\n"${textToTranslate}"`
      });
      const translatedText = response.text || "Translation unavailable.";
      setTranslations(prev => ({ ...prev, [item.id]: translatedText }));
    } catch (error) {
      console.error("Translation error:", error);
    } finally {
      setTranslatingIds(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  const getSentimentIcon = (s: string) => {
    switch(s) {
      case 'Confident': return '🚀';
      case 'Hesitant': return '🤔';
      case 'Frustrated': return '😤';
      case 'Engaged': return '🔥';
      default: return '😐';
    }
  };

  const getFeedbackIcon = (type: string) => {
    switch(type) {
      case 'grammar': return '📝';
      case 'vocabulary': return '📖';
      case 'pronunciation': return '🗣️';
      default: return '💡';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-blue-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* Analytics Header */}
      <div className="p-4 bg-slate-50 border-b border-gray-100 flex-shrink-0">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Live AI Insight Dashboard</h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white p-2 rounded-xl border border-gray-100 shadow-sm flex items-center gap-2">
            <div className="bg-blue-50 w-8 h-8 rounded-lg flex items-center justify-center text-lg shadow-inner flex-shrink-0">
              {getSentimentIcon(analytics.sentiment)}
            </div>
            <div className="min-w-0">
              <p className="text-[8px] text-gray-400 font-black uppercase tracking-wider">Sentiment</p>
              <p className="text-[10px] font-black text-gray-800 truncate">{analytics.sentiment}</p>
            </div>
          </div>
          <div className="bg-white p-2 rounded-xl border border-gray-100 shadow-sm flex items-center gap-2">
            <div className="bg-indigo-50 w-8 h-8 rounded-lg flex items-center justify-center text-lg shadow-inner flex-shrink-0">
              🎯
            </div>
            <div className="min-w-0">
              <p className="text-[8px] text-gray-400 font-black uppercase tracking-wider">Intent</p>
              <p className="text-[10px] font-black text-gray-800 truncate">{analytics.intent}</p>
            </div>
          </div>
        </div>

        {analytics.pronunciation && (
          <div className="mt-2 bg-white p-3 rounded-xl border border-blue-50 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest">Pronunciation</p>
              <span className={`text-[10px] font-black ${getScoreColor(analytics.pronunciation.score)}`}>
                {analytics.pronunciation.score}%
              </span>
            </div>
            <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-1000 ${
                  analytics.pronunciation.score >= 80 ? 'bg-green-500' :
                  analytics.pronunciation.score >= 60 ? 'bg-blue-500' :
                  'bg-orange-500'
                }`}
                style={{ width: `${analytics.pronunciation.score}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Chat Area - Tightened spacing */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50/20 scroll-smooth"
      >
        {transcriptions.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-300 space-y-3">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center animate-pulse">
               <svg className="w-6 h-6 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
               </svg>
            </div>
            <p className="text-xs font-bold tracking-wide">Speak to start...</p>
          </div>
        )}
        
        {transcriptions.map((item) => {
          const displayMessage = cleanText(item.text);
          if (!displayMessage && !item.isStreaming) return null;

          return (
            <div key={item.id} className={`flex flex-col ${item.speaker === 'user' ? 'items-end' : 'items-start'} group animate-in slide-in-from-bottom-1 duration-200`}>
              <div className={`max-w-[92%] px-4 py-2.5 rounded-2xl text-sm leading-snug relative ${
                item.speaker === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-none shadow-sm' 
                  : 'bg-white text-gray-800 border border-gray-100 shadow-sm rounded-bl-none'
              }`}>
                <p className={`${item.isStreaming ? 'opacity-70 animate-pulse' : 'font-medium'}`}>
                  {displayMessage || (item.isStreaming ? "..." : "")}
                </p>
                
                {translations[item.id] && (
                  <div className={`mt-2 pt-2 border-t ${item.speaker === 'user' ? 'border-white/10 text-white/80' : 'border-gray-50 text-gray-500 italic'} text-[10px] leading-tight animate-in fade-in duration-300`}>
                    <p className="font-black text-[8px] uppercase tracking-widest mb-0.5 opacity-60">{nativeLanguageName}:</p>
                    {translations[item.id]}
                  </div>
                )}

                <div className={`flex items-center gap-2 mt-1 ${item.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <span className="text-[8px] font-black uppercase tracking-wider opacity-30">
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  
                  {!item.isStreaming && !translations[item.id] && displayMessage && (
                    <button 
                      onClick={() => handleTranslate(item)}
                      disabled={translatingIds.has(item.id)}
                      className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border transition-all ${
                        item.speaker === 'user' 
                          ? 'border-white/20 hover:bg-white hover:text-blue-600' 
                          : 'border-blue-50 text-blue-500 hover:bg-blue-500 hover:text-white'
                      }`}
                    >
                      {translatingIds.has(item.id) ? '...' : 'Translate'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Structured Feedback Panel - More compact when empty */}
      <div className={`${feedbacks.length > 0 ? 'h-52' : 'h-16'} border-t border-gray-100 bg-white px-4 py-3 overflow-y-auto transition-all duration-300 flex-shrink-0`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Linguistic Analysis</h3>
            {feedbacks.length > 0 && (
              <span className="bg-blue-600 text-white text-[8px] px-1.5 py-0.5 rounded-full font-black">{feedbacks.length}</span>
            )}
          </div>
          {feedbacks.length === 0 && (
            <p className="text-[9px] text-gray-300 font-bold italic">Tips appear here</p>
          )}
        </div>
        
        {feedbacks.length > 0 && (
          <div className="space-y-3">
            {feedbacks.map((fb, idx) => (
              <div key={idx} className="bg-white p-3 rounded-xl border border-blue-50 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">{getFeedbackIcon(fb.type)}</span>
                  <span className={`text-[8px] px-2 py-0.5 rounded-lg font-black uppercase tracking-widest ${
                    fb.type === 'grammar' ? 'bg-orange-50 text-orange-700 border border-orange-100' :
                    fb.type === 'vocabulary' ? 'bg-green-50 text-green-700 border border-green-100' :
                    fb.type === 'pronunciation' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                    'bg-purple-50 text-purple-700 border border-purple-100'
                  }`}>
                    {fb.type}
                  </span>
                </div>

                {fb.original && (
                  <div className="mb-2 bg-red-50/30 p-2 rounded-lg border border-red-50">
                    <p className="text-[8px] font-black text-red-400 uppercase mb-0.5">Observation</p>
                    <p className="text-xs text-red-600 line-through font-medium italic">"{fb.original}"</p>
                  </div>
                )}

                <div className="mb-2 bg-green-50/30 p-2 rounded-lg border border-green-50">
                  <p className="text-[8px] font-black text-green-500 uppercase mb-0.5">Recommendation</p>
                  <p className="text-xs font-black text-gray-800 leading-tight">
                    {fb.suggested || fb.reason}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionFeedback;
