
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Lesson, TranscriptionItem, Feedback, LiveAnalytics } from '../types';
import { getSystemPrompt, ANALYTICS_TOOL } from '../constants';
import { createPcmBlob, decode, decodeAudioData } from '../utils/audioHelpers';
import AudioVisualizer from './AudioVisualizer';
import SessionFeedback from './SessionFeedback';

interface PracticeSessionProps {
  lesson: Lesson | null;
  onEnd: (transcriptions: TranscriptionItem[], feedbacks: Feedback[]) => void;
  nativeLanguageName: string;
}

const PracticeSession: React.FC<PracticeSessionProps> = ({ lesson, onEnd, nativeLanguageName }) => {
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [micGain, setMicGain] = useState(1.0);
  const [outputVolume, setOutputVolume] = useState(1.0);
  
  const [userVolume, setUserVolume] = useState(0);
  const [aiVolume, setAiVolume] = useState(0);
  
  const [transcriptions, setTranscriptions] = useState<TranscriptionItem[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [analytics, setAnalytics] = useState<LiveAnalytics>({
    sentiment: 'Neutral',
    intent: 'Practicing',
    entities: []
  });
  const [isConnecting, setIsConnecting] = useState(false);
  
  const audioContextRef = useRef<{
    input: AudioContext;
    output: AudioContext;
    inputNode: GainNode;
    outputNode: GainNode;
    userAnalyser: AnalyserNode;
    aiAnalyser: AnalyserNode;
  } | null>(null);
  
  const sessionRef = useRef<any>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);

  // Streaming refs to avoid state lag
  const streamingUserItemRef = useRef<TranscriptionItem | null>(null);
  const streamingAiItemRef = useRef<TranscriptionItem | null>(null);

  useEffect(() => {
    if (audioContextRef.current) {
      const targetMicGain = isMuted ? 0 : micGain;
      audioContextRef.current.inputNode.gain.setTargetAtTime(targetMicGain, audioContextRef.current.input.currentTime, 0.01);
      audioContextRef.current.outputNode.gain.setTargetAtTime(outputVolume, audioContextRef.current.output.currentTime, 0.01);
    }
  }, [micGain, outputVolume, isMuted]);

  useEffect(() => {
    const monitorVolume = () => {
      if (audioContextRef.current) {
        const { userAnalyser, aiAnalyser } = audioContextRef.current;
        const userData = new Uint8Array(userAnalyser.frequencyBinCount);
        userAnalyser.getByteFrequencyData(userData);
        setUserVolume(Math.min(1, userData.reduce((a, b) => a + b, 0) / (userData.length * 128)));

        const aiData = new Uint8Array(aiAnalyser.frequencyBinCount);
        aiAnalyser.getByteFrequencyData(aiData);
        setAiVolume(Math.min(1, aiData.reduce((a, b) => a + b, 0) / (aiData.length * 128)));
      }
      animationFrameRef.current = requestAnimationFrame(monitorVolume);
    };

    if (isActive) monitorVolume();
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [isActive]);

  const stopSession = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    setIsActive(false);
    audioContextRef.current?.input.close();
    audioContextRef.current?.output.close();
    audioContextRef.current = null;
    onEnd(transcriptions, feedbacks);
  }, [onEnd, transcriptions, feedbacks]);

  const parseCorrection = (aiText: string) => {
    // Optimized regex to better capture native language characters and handle punctuation
    const regex = /Regarding\s+(.+?),\s+instead\s+of\s+saying\s+['"](.+?)['"],\s+it\s+is\s+better\s+to\s+say\s+['"](.+?)['"]\.\s+The\s+reason\s+is\s+([^.]+)/i;
    const match = aiText.match(regex);

    if (match) {
      const typeText = aiText.toLowerCase();
      let type: Feedback['type'] = 'general';
      if (typeText.includes('grammar')) type = 'grammar';
      else if (typeText.includes('vocabulary')) type = 'vocabulary';
      else if (typeText.includes('pronunciation')) type = 'pronunciation';

      return {
        type, 
        rule: match[1], 
        original: match[2], 
        suggested: match[3], 
        explanation: match[4].trim(), 
        reason: aiText
      } as Feedback;
    }
    return null;
  };

  const startSession = useCallback(async () => {
    try {
      setIsConnecting(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const inputNode = inputCtx.createGain();
      const userAnalyser = inputCtx.createAnalyser();
      userAnalyser.fftSize = 256;
      inputNode.connect(userAnalyser);
      const outputNode = outputCtx.createGain();
      const aiAnalyser = outputCtx.createAnalyser();
      aiAnalyser.fftSize = 256;
      outputNode.connect(aiAnalyser);
      outputNode.connect(outputCtx.destination);
      audioContextRef.current = { input: inputCtx, output: outputCtx, inputNode, outputNode, userAnalyser, aiAnalyser };

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          tools: [{ functionDeclarations: [ANALYTICS_TOOL] }],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
          systemInstruction: `${getSystemPrompt(nativeLanguageName)}\n\nCurrent Lesson: ${lesson?.instruction || 'General Practice'}`,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setIsActive(true);
            setIsConnecting(false);
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const pcmBlob = createPcmBlob(e.inputBuffer.getChannelData(0));
              sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(inputNode);
            inputNode.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            if (msg.toolCall) {
              for (const fc of msg.toolCall.functionCalls) {
                if (fc.name === 'updateLiveAnalytics') {
                  setAnalytics(fc.args as any);
                  sessionPromise.then(s => s.sendToolResponse({
                    functionResponses: { id: fc.id, name: fc.name, response: { result: 'ok' } }
                  }));
                }
              }
            }

            const audioData = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData) {
              const buf = await decodeAudioData(decode(audioData), outputCtx, 24000, 1);
              const source = outputCtx.createBufferSource();
              source.buffer = buf;
              source.connect(outputNode);
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buf.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }

            // --- Fast Streaming Logic ---
            if (msg.serverContent?.inputTranscription) {
              const text = msg.serverContent.inputTranscription.text;
              if (!streamingUserItemRef.current) {
                streamingUserItemRef.current = { id: `user-${Date.now()}`, speaker: 'user', text: '', timestamp: Date.now(), isStreaming: true };
                setTranscriptions(prev => [...prev, streamingUserItemRef.current!]);
              }
              streamingUserItemRef.current.text += text;
              setTranscriptions(prev => prev.map(t => t.id === streamingUserItemRef.current!.id ? { ...streamingUserItemRef.current! } : t));
            }

            if (msg.serverContent?.outputTranscription) {
              const text = msg.serverContent.outputTranscription.text;
              if (!streamingAiItemRef.current) {
                streamingAiItemRef.current = { id: `ai-${Date.now()}`, speaker: 'ai', text: '', timestamp: Date.now(), isStreaming: true };
                setTranscriptions(prev => [...prev, streamingAiItemRef.current!]);
              }
              streamingAiItemRef.current.text += text;
              setTranscriptions(prev => prev.map(t => t.id === streamingAiItemRef.current!.id ? { ...streamingAiItemRef.current! } : t));
            }

            if (msg.serverContent?.turnComplete) {
              if (streamingUserItemRef.current) {
                streamingUserItemRef.current.isStreaming = false;
                streamingUserItemRef.current = null;
              }
              if (streamingAiItemRef.current) {
                const finishedAiText = streamingAiItemRef.current.text;
                streamingAiItemRef.current.isStreaming = false;
                streamingAiItemRef.current = null;
                const correction = parseCorrection(finishedAiText);
                if (correction) setFeedbacks(prev => [correction, ...prev]);
              }
              setTranscriptions(prev => [...prev]);
            }

            if (msg.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: () => stopSession(),
          onclose: () => stopSession(),
        },
      });
      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error(err);
      setIsConnecting(false);
    }
  }, [lesson, micGain, outputVolume, stopSession, nativeLanguageName, isMuted, transcriptions, feedbacks]);

  useEffect(() => {
    startSession();
    return () => { if (isActive) stopSession(); };
  }, []);

  const resetAudioSettings = () => {
    setMicGain(1.0);
    setOutputVolume(1.0);
    setIsMuted(false);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white p-4 border-b flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={stopSession} className="p-2 hover:bg-gray-100 rounded-full transition-colors group">
            <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h2 className="font-black text-gray-800 tracking-tight">{lesson?.title || 'Daily Session'}</h2>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-red-400'}`}></span>
              <span className="text-[10px] text-gray-400 font-black uppercase tracking-[0.1em]">
                {isActive ? 'Live' : isConnecting ? 'Connecting...' : 'Offline'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 relative">
           <button 
            onClick={() => setShowSettings(!showSettings)} 
            className={`p-2 rounded-full transition-all ${showSettings ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
           >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /></svg>
          </button>
          
          <button 
            onClick={() => setIsMuted(!isMuted)} 
            className={`p-2 rounded-full transition-all ${isMuted ? 'bg-red-500 text-white shadow-lg' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
          >
            {isMuted ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M12 5l-4.707 4.707H4a1 1 0 00-1 1v4a1 1 0 001 1h3.293L12 19V5z" />
              </svg>
            )}
          </button>

          {showSettings && (
            <div className="absolute top-12 right-0 w-72 bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 z-[60] animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest">Audio Controls</h3>
                <button onClick={resetAudioSettings} className="text-[9px] font-black text-blue-600 hover:underline uppercase tracking-widest">Reset</button>
              </div>
              <div className="space-y-8">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Microphone</label>
                    </div>
                    <span className="text-xs font-black text-blue-600">{Math.round(micGain * 100)}%</span>
                  </div>
                  <input type="range" min="0" max="2" step="0.05" value={micGain} onChange={(e) => setMicGain(parseFloat(e.target.value))} className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                  <p className="text-[8px] text-gray-300 mt-2 font-bold uppercase tracking-tight">Boost or reduce your voice input level</p>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M12 5l-4.707 4.707H4a1 1 0 00-1 1v4a1 1 0 001 1h3.293L12 19V5z" /></svg>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Speaker</label>
                    </div>
                    <span className="text-xs font-black text-blue-600">{Math.round(outputVolume * 100)}%</span>
                  </div>
                  <input type="range" min="0" max="1.5" step="0.05" value={outputVolume} onChange={(e) => setOutputVolume(parseFloat(e.target.value))} className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                  <p className="text-[8px] text-gray-300 mt-2 font-bold uppercase tracking-tight">Adjust FluentGen's voice volume</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative flex flex-col md:flex-row">
        <div className="flex-1 flex flex-col justify-center items-center p-8 bg-gradient-to-b from-blue-50/20 to-white overflow-hidden min-h-[300px]">
          <div className="relative mb-12">
            <div className={`w-32 h-32 rounded-full bg-blue-600 flex items-center justify-center shadow-xl relative z-10 transition-transform duration-500 ${isActive ? 'scale-110' : 'scale-100'}`}>
               <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            </div>
            {isActive && <div className="absolute inset-0 bg-blue-400 rounded-full pulse-animation z-0"></div>}
          </div>
          <div className="w-full max-w-xs space-y-4">
             <div className="bg-white/90 backdrop-blur-xl p-5 rounded-[2rem] shadow-xl border border-blue-50/50">
                <div className="flex gap-4 items-center">
                  <div className="flex-1">
                    <p className="text-[9px] font-black text-blue-400 mb-2 uppercase text-center">Your Mic</p>
                    <AudioVisualizer isActive={isActive} color="#2563eb" volume={userVolume} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[9px] font-black text-indigo-400 mb-2 uppercase text-center">AI Voice</p>
                    <AudioVisualizer isActive={isActive} color="#6366f1" volume={aiVolume} />
                  </div>
                </div>
             </div>
             <button onClick={stopSession} className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-black rounded-2xl shadow-lg transition-all active:scale-95">End Practice</button>
          </div>
        </div>

        <div className="w-full md:w-[450px] border-l bg-white">
          <SessionFeedback transcriptions={transcriptions} feedbacks={feedbacks} analytics={analytics} nativeLanguageName={nativeLanguageName} />
        </div>
      </div>
    </div>
  );
};

export default PracticeSession;
