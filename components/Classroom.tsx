
import React, { useState, useEffect, useRef } from 'react';
import { Teacher, GradeLevel, LessonPlan, QuizItem } from '../types';
import { GRADES } from '../constants';
import { generateLessonPlan, generateLessonPlanFromText, generateClassroomImage, generateSpeech, generateVideoSummary } from '../services/geminiService';
import { Loader2, Play, Volume2, Video, RefreshCcw, Send, Sparkles, FileText, Upload, Printer, X, Eye, Music, Link as LinkIcon, FileAudio, ArrowLeft, ArrowRight, CheckCircle, XCircle, Camera, VolumeX, List, Target, BookOpen, Download, Youtube, Book, Pause, Trophy, HelpCircle, AlertCircle } from 'lucide-react';
import { GlobalSettings } from '../App';
import html2canvas from 'html2canvas';

interface ClassroomProps {
  teacher: Teacher;
  onBack: () => void;
  initialSettings: GlobalSettings;
}

/**
 * Helper to remove white background from an image via Canvas using Flood Fill
 */
const removeWhiteBackground = (base64Image: string): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(base64Image);
                return;
            }
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            const width = canvas.width;
            const height = canvas.height;

            const threshold = 230;

            const isWhite = (r: number, g: number, b: number) => {
                return r > threshold && g > threshold && b > threshold;
            };

            const visited = new Uint8Array(width * height);
            const stack: [number, number][] = [];

            for (let x = 0; x < width; x++) {
                const topIdx = (0 * width + x) * 4;
                if (isWhite(data[topIdx], data[topIdx+1], data[topIdx+2])) {
                    stack.push([x, 0]);
                    visited[0 * width + x] = 1;
                }
                const bottomIdx = ((height - 1) * width + x) * 4;
                if (isWhite(data[bottomIdx], data[bottomIdx+1], data[bottomIdx+2])) {
                    stack.push([x, height - 1]);
                    visited[(height - 1) * width + x] = 1;
                }
            }
            for (let y = 0; y < height; y++) {
                const leftIdx = (y * width + 0) * 4;
                if (isWhite(data[leftIdx], data[leftIdx+1], data[leftIdx+2])) {
                    if (visited[y * width + 0] === 0) {
                        stack.push([0, y]);
                        visited[y * width + 0] = 1;
                    }
                }
                const rightIdx = (y * width + (width - 1)) * 4;
                if (isWhite(data[rightIdx], data[rightIdx+1], data[rightIdx+2])) {
                    if (visited[y * width + (width - 1)] === 0) {
                        stack.push([width - 1, y]);
                        visited[y * width + (width - 1)] = 1;
                    }
                }
            }

            while (stack.length > 0) {
                const [x, y] = stack.pop()!;
                const idx = (y * width + x) * 4;

                data[idx + 3] = 0;

                const neighbors = [
                    [x + 1, y],
                    [x - 1, y],
                    [x, y + 1],
                    [x, y - 1]
                ];

                for (const [nx, ny] of neighbors) {
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        const nVisitIdx = ny * width + nx;
                        if (visited[nVisitIdx] === 0) {
                            const nIdx = (ny * width + nx) * 4;
                            if (isWhite(data[nIdx], data[nIdx+1], data[nIdx+2])) {
                                visited[nVisitIdx] = 1;
                                stack.push([nx, ny]);
                            }
                        }
                    }
                }
            }

            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL());
        };
        img.onerror = () => resolve(base64Image);
        img.src = base64Image;
    });
};

const playSuccessSound = () => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const t = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.frequency.value = 523.25; 
    gain1.gain.setValueAtTime(0.1, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc1.start(t);
    osc1.stop(t + 0.5);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.value = 659.25;
    gain2.gain.setValueAtTime(0.1, t + 0.2);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
    osc2.start(t + 0.2);
    osc2.stop(t + 0.7);

    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.frequency.value = 783.99;
    gain3.gain.setValueAtTime(0.1, t + 0.4);
    gain3.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
    osc3.start(t + 0.4);
    osc3.stop(t + 1.2);
};

const playFailureSound = () => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.4);
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.start(t);
    osc.stop(t + 0.4);
};

const BOARD_FONT_SIZES = [
    'text-base md:text-lg', 'text-lg md:text-xl', 'text-xl md:text-2xl', 'text-2xl md:text-3xl', 
    'text-3xl md:text-4xl', 'text-4xl md:text-5xl', 'text-5xl md:text-6xl', 'text-6xl md:text-7xl', 
    'text-7xl md:text-8xl', 'text-8xl md:text-9xl'
];

const Classroom: React.FC<ClassroomProps> = ({ teacher, onBack, initialSettings }) => {
  const [topic, setTopic] = useState('');
  const [grade, setGrade] = useState<GradeLevel>(GradeLevel.GRADE_3);
  const [quizCount, setQuizCount] = useState<number>(3);
  const [status, setStatus] = useState<'idle' | 'planning' | 'teaching' | 'quiz' | 'finished'>('idle');
  const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(null);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [showOverview, setShowOverview] = useState(false);
  const [sectionImages, setSectionImages] = useState<Record<number, string[]>>({});
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [teacherImage, setTeacherImage] = useState<string | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [topicBoardImage, setTopicBoardImage] = useState<string | null>(null);
  const [customOverlayImage, setCustomOverlayImage] = useState<string | null>(null);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [isQuizFinished, setIsQuizFinished] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [isViewAllMode, setIsViewAllMode] = useState(false);
  const fontFamily = initialSettings.fontFamily;
  const fontSizeIndex = initialSettings.fontSizeIndex;
  const [bgmUrl, setBgmUrl] = useState<string | null>(initialSettings.bgmUrl);
  const [youtubeEmbedId, setYoutubeEmbedId] = useState<string | null>(initialSettings.youtubeEmbedId);
  
  const [audioError, setAudioError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const blackboardRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const customImageInputRef = useRef<HTMLInputElement>(null);

  // Audio optimization refs
  const audioCache = useRef<Map<string, AudioBuffer>>(new Map());
  const pendingRequests = useRef<Map<string, Promise<AudioBuffer>>>(new Map());
  const currentTextToPlay = useRef<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Play greeting on mount
  useEffect(() => {
    const initAudio = async () => {
        // Wait for transition animation
        await new Promise(resolve => setTimeout(resolve, 800));
        if (isMountedRef.current) {
            playTeacherVoice(teacher.greeting);
        }
    };
    initAudio();
  }, [teacher]);

  useEffect(() => {
    const initAssets = async () => {
        try {
            if (teacher.customImageUrl) {
                const processed = await removeWhiteBackground(teacher.customImageUrl);
                if (isMountedRef.current) setTeacherImage(processed);
            } else {
                try {
                    const avatarPrompt = teacher.visualDesc + ", holding a microphone, giving a lecture, dynamic posing, white background, isolated, full body, character design, vector style, flat color, no shadow";
                    const rawAvatarUrl = await Promise.race([
                        generateClassroomImage(avatarPrompt),
                        new Promise<string>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 10000))
                    ]);
                    const processedAvatarUrl = await removeWhiteBackground(rawAvatarUrl);
                    if (isMountedRef.current) setTeacherImage(processedAvatarUrl);
                } catch (e) {
                    console.error("Avatar generation failed, falling back to emoji", e);
                }
            }

            try {
                const bgPrompt = "Bright and cozy elementary school classroom with chalkboard, desks, and cute decorations, " + teacher.backgroundPrompt + ", wide angle, empty background, educational setting, no characters, high quality, vector style";
                const bgUrl = await Promise.race([
                    generateClassroomImage(bgPrompt),
                    new Promise<string>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 10000))
                ]);
                if (isMountedRef.current) setBackgroundImage(bgUrl);
            } catch (e) {
                console.error("Background generation failed", e);
            }
        } catch (e) {
            console.error("Asset generation init failed", e);
        }
    };
    initAssets();
  }, [teacher]);

  const getAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    return audioContextRef.current;
  };

  const getAudioBuffer = async (text: string): Promise<AudioBuffer> => {
      // 1. Check Memory Cache
      if (audioCache.current.has(text)) {
          return audioCache.current.get(text)!;
      }
      
      // 2. Check Pending Requests (Deduplication)
      if (pendingRequests.current.has(text)) {
          return pendingRequests.current.get(text)!;
      }
      
      // 3. New Request
      const promise = generateSpeech(text, teacher.voiceName)
        .then(buffer => {
            if (isMountedRef.current) {
                audioCache.current.set(text, buffer);
                pendingRequests.current.delete(text);
            }
            return buffer;
        })
        .catch(err => {
            if (isMountedRef.current) {
                pendingRequests.current.delete(text);
            }
            throw err;
        });
      
      pendingRequests.current.set(text, promise);
      return promise;
  };

  const playTeacherVoice = async (text: string) => {
    // 1. Reset Error
    setAudioError(null);
    currentTextToPlay.current = text;

    try {
        stopAudio();
        setIsPlayingAudio(true);
        
        // 2. Fetch Audio (might be cached or pending)
        const buffer = await getAudioBuffer(text);
        
        // 3. Race Condition Check
        if (currentTextToPlay.current !== text) {
            return; 
        }
        
        if (!isMountedRef.current) return;

        const ctx = getAudioContext();
        if (ctx.state === 'suspended') {
            try {
                await ctx.resume();
            } catch (e) {
                console.warn("Could not resume audio context", e);
            }
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.onended = () => { 
            if (isMountedRef.current && currentTextToPlay.current === text) {
                setIsPlayingAudio(false); 
            }
        };
        source.start();
        audioSourceRef.current = source;
    } catch (e: any) {
        console.error("Audio failed", e);
        if (isMountedRef.current) {
            // Specifically handle Quota Exceeded or Limit error
            if (e.message?.includes('429') || e.message?.includes('quota') || e.message?.includes('limit')) {
                setAudioError("일일 오디오 생성 한도를 초과했습니다. (텍스트로 수업은 계속 가능합니다)");
            } else {
                setAudioError("오디오를 재생할 수 없습니다.");
            }
            
            if (currentTextToPlay.current === text) {
                 setIsPlayingAudio(false);
            }
        }
    }
  };

  const prefetchAudio = (text: string) => {
      getAudioBuffer(text).catch(e => console.warn("Prefetch error", e));
  }

  const stopAudio = () => {
    if (audioSourceRef.current) {
        try {
            audioSourceRef.current.stop();
        } catch (e) { /* ignore */ }
        audioSourceRef.current = null;
    }
  };

  const handleStartClass = async (fileContent?: string) => {
    if (!topic.trim() && !fileContent) return;
    
    // Ensure audio context is ready on user gesture
    getAudioContext().resume();

    setStatus('planning');
    setLessonPlan(null);
    setSectionImages({});
    setVideoUrl(null);
    setTopicBoardImage(null);
    setCurrentSectionIndex(0);
    setIsViewAllMode(false);
    setSelectedQuizOption(null);
    setShowOverview(false);
    setCurrentQuizIndex(0);
    setQuizScore(0);
    setIsQuizFinished(false);
    setAudioError(null);
    
    // Reset caches for new lesson
    audioCache.current.clear();
    pendingRequests.current.clear();
    currentTextToPlay.current = null;

    try {
      let plan: LessonPlan;
      if (fileContent) {
        plan = await generateLessonPlanFromText(fileContent, grade, teacher.style, quizCount);
      } else {
        plan = await generateLessonPlan(topic, grade, teacher.style, quizCount);
      }
      
      setLessonPlan(plan);
      if (fileContent) setTopic(plan.topic);

      generateClassroomImage(`Simple white chalk line drawing about "${plan.topic}" on a black background. Minimalist, kid-friendly style, icon style, no text.`)
        .then(url => { if (isMountedRef.current) setTopicBoardImage(url) })
        .catch(err => console.error("Topic board image failed", err));
      
      setStatus('teaching');
      setShowOverview(true);
      
      const greetingText = `${teacher.greeting} 오늘은 ${plan.topic}에 대해 배워볼 거야. 칠판을 잘 보렴.`;
      playTeacherVoice(greetingText);
      
      if (plan.sections.length > 0) {
          prefetchAudio(plan.sections[0].text);
      }

    } catch (error) {
      console.error("Failed to generate lesson:", error);
      alert("수업 준비 중에 문제가 생겼어요. 다시 시도해볼까요?");
      setStatus('idle');
    }
  };

  const startActualLesson = () => {
      setShowOverview(false);
      if (lessonPlan) {
          loadSection(0, lessonPlan);
      }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
            handleStartClass(content);
        }
    };
    reader.readAsText(file);
  };

  const handleCustomImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          const result = event.target?.result as string;
          setCustomOverlayImage(result);
      };
      reader.readAsDataURL(file);
      e.target.value = ''; // Reset
  };

  const loadSection = async (index: number, plan: LessonPlan) => {
    if (index >= plan.sections.length) {
      startQuiz(plan);
      return;
    }

    setCurrentSectionIndex(index);
    const section = plan.sections[index];
    
    const boardPrompt = `Simple white chalk line drawing about: "${section.sectionTitle}". Minimalist white lines on black background, icon style, clear and simple for kids, no text.`;
    generateClassroomImage(boardPrompt)
        .then(url => { if (isMountedRef.current) setTopicBoardImage(url) })
        .catch(err => console.error("Dynamic board image failed", err));

    if (!sectionImages[index] && section.visualType === 'image' && section.visualPrompts && section.visualPrompts.length > 0) {
        setIsGeneratingImages(true);
        Promise.all(section.visualPrompts.map(prompt => 
            generateClassroomImage(prompt + " style: clean educational illustration, colorful, cute, high quality")
                .catch(e => {
                    console.error("Image gen failed for prompt:", prompt, e);
                    return null;
                })
        )).then(results => {
            if (!isMountedRef.current) return;
            const validImages = results.filter((url): url is string => !!url);
            setSectionImages(prev => ({ ...prev, [index]: validImages }));
            setIsGeneratingImages(false);
        });
    }

    if (!isViewAllMode) {
        playTeacherVoice(section.text);
    }
    
    if (index + 1 < plan.sections.length) {
        prefetchAudio(plan.sections[index + 1].text);
    }
  };

  const startQuiz = (plan: LessonPlan) => {
      setStatus('quiz');
      setCurrentQuizIndex(0);
      setQuizScore(0);
      setIsQuizFinished(false);
      loadQuizQuestion(0, plan);
  };

  const loadQuizQuestion = (index: number, plan: LessonPlan) => {
      if (index >= plan.quizzes.length) {
          setIsQuizFinished(true);
          playTeacherVoice(`모든 퀴즈가 끝났어. ${plan.quizzes.length}문제 중에 ${quizScore}문제를 맞췄구나! 참 잘했어!`);
          return;
      }

      setCurrentQuizIndex(index);
      setSelectedQuizOption(null);
      const quiz = plan.quizzes[index];

      const optionsText = quiz.options.map((opt, i) => `${i + 1}번, ${opt}`).join('. ');
      const textToRead = `문제 ${index + 1}번. ${quiz.question}. ${optionsText}. 정답을 골라봐.`;
      
      playTeacherVoice(textToRead);
      
      if (index + 1 < plan.quizzes.length) {
          const nextQuiz = plan.quizzes[index + 1];
          const nextOptionsText = nextQuiz.options.map((opt, i) => `${i + 1}번, ${opt}`).join('. ');
          const nextTextToRead = `문제 ${index + 2}번. ${nextQuiz.question}. ${nextOptionsText}. 정답을 골라봐.`;
          prefetchAudio(nextTextToRead);
      }
  };

  const handleNextSection = () => {
    if (lessonPlan) {
        // Stop any current audio before loading next
        stopAudio();
        loadSection(currentSectionIndex + 1, lessonPlan);
    }
  };

  const handlePrevSection = () => {
    if (lessonPlan && currentSectionIndex > 0) {
        stopAudio();
        loadSection(currentSectionIndex - 1, lessonPlan);
    }
  };

  const handleQuizAnswer = (index: number) => {
      if (!lessonPlan) return;
      setSelectedQuizOption(index);
      const isCorrect = index === lessonPlan.quizzes[currentQuizIndex].answer;
      if (isCorrect) {
          playSuccessSound();
          setQuizScore(prev => prev + 1);
      } else {
          playFailureSound();
      }
  };

  const handleNextQuizQuestion = () => {
      if (!lessonPlan) return;
      stopAudio(); 
      loadQuizQuestion(currentQuizIndex + 1, lessonPlan);
  };

  const handleGenerateVideo = async () => {
      if (!lessonPlan) return;
      setIsGeneratingVideo(true);
      try {
          const url = await generateVideoSummary(lessonPlan.topic);
          setVideoUrl(url);
      } catch (e) {
          console.error(e);
          alert("비디오 생성에 실패했습니다.");
      } finally {
          setIsGeneratingVideo(false);
      }
  };

  const handleYoutubeSearch = () => {
      if (!lessonPlan?.topic && !topic) return;
      const query = lessonPlan?.topic || topic;
      window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, '_blank');
  };

  const handleFairyTaleSearch = () => {
      if (!lessonPlan?.topic && !topic) return;
      const query = lessonPlan?.topic || topic;
      window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(query + " 관련 동화")}`, '_blank');
  };

  const handleSongSearch = () => {
      if (!lessonPlan?.topic && !topic) return;
      const query = lessonPlan?.topic || topic;
      window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(query + " 동요 노래")}`, '_blank');
  };

  const handleCaptureScreen = async () => {
    const element = document.body;
    try {
        const canvas = await html2canvas(element, { useCORS: true });
        const link = document.createElement('a');
        link.download = `classroom-capture-${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();
    } catch (e) {
        console.error("Screen capture failed", e);
        alert("화면 저장에 실패했습니다.");
    }
  };

  useEffect(() => {
    if (blackboardRef.current) {
        blackboardRef.current.scrollTop = 0;
    }
  }, [currentSectionIndex, showOverview]);

  return (
    <div className="flex flex-col h-screen w-full bg-amber-50 relative overflow-hidden">
      
      {/* --- BACKGROUND PATTERN --- */}
      <div className="absolute inset-0 opacity-5 pointer-events-none no-print">
         <div className="w-full h-full bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')]"></div>
      </div>

      {/* --- INVISIBLE BGM PLAYER --- */}
      {bgmUrl && (
          <audio autoPlay loop src={bgmUrl} className="hidden" />
      )}
      {youtubeEmbedId && (
            <div className="absolute top-0 left-0 w-1 h-1 overflow-hidden opacity-0 pointer-events-none">
                <iframe 
                    width="100%" 
                    height="100%" 
                    src={`https://www.youtube.com/embed/${youtubeEmbedId}?autoplay=1&loop=1&playlist=${youtubeEmbedId}&controls=0`} 
                    title="YouTube audio" 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                ></iframe>
            </div>
      )}

      {/* --- HEADER / CONTROLS --- */}
      <div className="bg-orange-950/90 h-16 flex items-center justify-between px-6 z-10 shadow-lg border-b-4 border-yellow-900 no-print backdrop-blur-sm relative">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="text-white hover:text-yellow-400 font-bold flex items-center gap-2">
                <ArrowLeft size={20} /> 선생님 바꾸기
            </button>
            <div className="bg-green-900 px-4 py-1 rounded border-2 border-green-700 text-green-100 font-chalk text-xl shadow-inner flex items-center gap-2">
                <span>{teacher.name}의 교실</span>
            </div>
            
            {/* Student Info Display in Header */}
            {(initialSettings.schoolName || initialSettings.gradeClass || initialSettings.studentName) && (
                <div className="hidden lg:flex items-center gap-2 bg-black/20 px-3 py-1 rounded text-white text-sm font-sans">
                     {initialSettings.schoolName && <span>{initialSettings.schoolName}</span>}
                     {initialSettings.gradeClass && <span className="text-yellow-200">{initialSettings.gradeClass}</span>}
                     {initialSettings.studentName && <span className="font-bold">{initialSettings.studentName}</span>}
                </div>
            )}

            {lessonPlan && (
                <div className="hidden xl:block bg-yellow-100/10 px-3 py-1 rounded text-yellow-200 font-comic">
                     주제: {lessonPlan.topic}
                </div>
            )}
        </div>
        
        <div className="flex gap-2 items-center">
            
            {/* Fairy Tale Search Button */}
            {(lessonPlan || topic) && (
                 <button 
                    onClick={handleFairyTaleSearch}
                    className="bg-pink-500 hover:bg-pink-400 text-white p-2 rounded-full transition-colors flex items-center gap-2 px-3 shadow-md"
                    title="유튜브에서 관련 동화 검색"
                >
                    <BookOpen size={20} /> <span className="hidden md:inline font-bold text-sm">동화 듣기</span>
                </button>
            )}

            {/* Song Search Button (New) */}
            {(lessonPlan || topic) && (
                 <button 
                    onClick={handleSongSearch}
                    className="bg-green-500 hover:bg-green-400 text-white p-2 rounded-full transition-colors flex items-center gap-2 px-3 shadow-md"
                    title="유튜브에서 관련 동요/노래 검색"
                >
                    <Music size={20} /> <span className="hidden md:inline font-bold text-sm">노래/동요</span>
                </button>
            )}

            {/* YouTube Search Button */}
            {(lessonPlan || topic) && (
                 <button 
                    onClick={handleYoutubeSearch}
                    className="bg-red-600 hover:bg-red-500 text-white p-2 rounded-full transition-colors flex items-center gap-2 px-3"
                    title="유튜브에서 관련 영상 검색"
                >
                    <Youtube size={20} /> <span className="hidden md:inline font-bold text-sm">유튜브 검색</span>
                </button>
            )}

            {/* Screen Capture Button */}
            <button 
                onClick={handleCaptureScreen}
                className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-colors"
                title="화면 저장하기"
            >
                <Camera size={20} />
            </button>

            {status === 'teaching' && (
                <button 
                    onClick={() => {
                        stopAudio();
                        setIsViewAllMode(!isViewAllMode);
                    }}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded font-bold flex items-center gap-2"
                >
                    {isViewAllMode ? <><RefreshCcw size={16}/> 슬라이드 보기</> : <><Eye size={16}/> 한눈에 보기</>}
                </button>
            )}
            
            {status === 'idle' && (
                 <select 
                    value={grade} 
                    onChange={(e) => setGrade(e.target.value as GradeLevel)}
                    className="bg-yellow-100 text-stone-800 rounded px-2 py-1 font-bold outline-none border-2 border-yellow-600"
                >
                    {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
            )}
        </div>
      </div>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 flex flex-col md:flex-row p-4 gap-4 overflow-hidden relative z-10">
        
        {/* --- TEACHER AVATAR & BACKGROUND AREA --- */}
        <div className={`absolute bottom-0 left-0 md:relative md:w-1/4 flex flex-col items-center justify-end z-20 pointer-events-none md:pointer-events-auto transition-all duration-300 ${isViewAllMode ? 'opacity-0 md:opacity-100 md:w-16' : ''}`}>
            
            {/* Custom Image Upload Button */}
            <div className="absolute top-4 left-4 z-50">
                 <button 
                    onClick={() => customImageInputRef.current?.click()}
                    className="bg-white/80 p-2 rounded-full shadow-lg hover:bg-white text-stone-600 border border-stone-300"
                    title="이미지/소품 추가"
                 >
                     <Camera size={20} />
                 </button>
                 <input 
                    type="file" 
                    accept="image/*" 
                    ref={customImageInputRef}
                    className="hidden"
                    onChange={handleCustomImageUpload}
                 />
            </div>

            {/* Classroom Background (Generated or Default) */}
            <div className={`absolute inset-x-2 bottom-0 top-10 rounded-t-xl overflow-hidden -z-10 hidden md:block border-2 border-stone-300 bg-amber-50 shadow-inner ${isViewAllMode ? 'hidden' : ''}`}>
                {backgroundImage ? (
                    <div className="w-full h-full relative">
                         <img src={backgroundImage} alt="Classroom Background" className="w-full h-full object-cover" />
                         {/* Subtle overlay to make avatar pop */}
                         <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                    </div>
                ) : (
                    /* Default CSS Background fallback while loading */
                    <>
                        <div className="absolute inset-0 bg-amber-50 opacity-100"></div>
                        <div className="absolute bottom-0 w-full h-[25%] bg-[#a1887f] border-t-[6px] border-[#5d4037]">
                             <div className="w-full h-full opacity-20" style={{backgroundImage: 'repeating-linear-gradient(45deg, transparent 0, transparent 20px, #3e2723 20px, #3e2723 22px)'}}></div>
                        </div>
                        <div className="absolute bottom-[25%] w-full h-3 bg-[#5d4037]"></div>
                    </>
                )}

                {/* --- BACKBOARD BEHIND TEACHER (DYNAMIC) --- */}
                {/* Always visible blackboard structure in the background */}
                <div className="absolute top-8 left-6 right-6 h-1/3 bg-[#2d3436] border-4 border-[#8d6e63] rounded-lg shadow-xl flex flex-col items-center justify-center p-2 transform -rotate-1">
                    {/* Chalk Texture */}
                    <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/black-chalk.png')]"></div>
                    
                    {/* Topic Text */}
                    <h3 className="text-white font-chalk text-xl md:text-2xl mb-1 z-10 text-center drop-shadow-md">
                        {topic ? topic : "오늘의 공부"}
                    </h3>
                    
                    {/* Dynamic Chalk Drawing */}
                    <div className="flex-1 w-full flex items-center justify-center z-10 overflow-hidden">
                        {topicBoardImage ? (
                            <img src={topicBoardImage} alt="Chalk Drawing" className="h-full object-contain opacity-90 filter brightness-125 contrast-125" />
                        ) : (
                            // Fallback decorative doodles
                            <div className="flex gap-2 opacity-50 text-white/50">
                                <span className="text-3xl">📝</span>
                                <span className="text-3xl">✨</span>
                            </div>
                        )}
                    </div>
                    
                    {/* Chalk Ledge */}
                    <div className="absolute -bottom-2 w-full h-2 bg-[#8d6e63] rounded shadow-sm flex items-center justify-center gap-1">
                        <div className="w-4 h-1 bg-white rounded-full"></div>
                        <div className="w-3 h-1 bg-yellow-200 rounded-full"></div>
                    </div>
                </div>

                {/* --- DECORATIONS (Classroom Feel) --- */}
                {/* Clock */}
                <div className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full border-2 border-stone-400 shadow flex items-center justify-center">
                     <div className="w-0.5 h-3 bg-black absolute bottom-1/2 origin-bottom transform rotate-45 rounded"></div>
                     <div className="w-0.5 h-2 bg-black absolute bottom-1/2 origin-bottom transform -rotate-12 rounded"></div>
                </div>
                {/* Flag */}
                <div className="absolute top-2 left-2 w-10 h-6 bg-white border border-gray-300 shadow flex items-center justify-center">
                     <div className="w-3 h-3 rounded-full bg-gradient-to-b from-red-600 to-blue-600"></div>
                </div>
            </div>

            {/* Generated Full Body Avatar (Clickable to stop sound) */}
            <div 
                className={`flex justify-center items-end h-[50vh] md:h-[70vh] w-full transition-all duration-500 cursor-pointer relative ${isViewAllMode ? 'scale-50 origin-bottom-left' : ''}`}
                onClick={stopAudio}
                title="클릭하면 목소리가 멈춰요"
            >
                {teacherImage ? (
                    <img 
                        src={teacherImage} 
                        alt="Teacher" 
                        className="max-h-full max-w-full object-contain filter drop-shadow-2xl animate-breathe origin-bottom" 
                    />
                ) : (
                    // Fallback Emoji Avatar with background
                     <div className="relative flex items-center justify-center w-64 h-64 bg-white/20 backdrop-blur-md rounded-full border-4 border-white/40 shadow-xl animate-pulse">
                        <div className="text-[8rem] md:text-[10rem]">
                             {teacher.avatar}
                        </div>
                    </div>
                )}
                
                {/* Custom Overlay Image */}
                {customOverlayImage && (
                    <img 
                        src={customOverlayImage} 
                        alt="Custom Prop" 
                        className="absolute bottom-10 right-0 w-32 h-32 object-contain filter drop-shadow-lg z-30" 
                    />
                )}
            </div>
            
            <div className={`hidden md:block bg-white p-4 rounded-xl rounded-bl-none shadow-lg mb-8 mx-4 border-2 border-gray-200 w-3/4 text-center relative -top-8 animate-bounce-gentle ${isViewAllMode ? 'hidden' : ''}`}>
                <p className="text-gray-600 text-sm font-comic flex items-center justify-center gap-2">
                    {isPlayingAudio ? (
                        <>
                            <Volume2 className="animate-pulse text-blue-500" size={16} /> 
                            선생님이 말씀하시는 중... (클릭하면 멈춤)
                        </>
                    ) : (
                        <>
                           <VolumeX className="text-gray-400" size={16} />
                           귀를 기울여보세요!
                        </>
                    )}
                </p>
                {/* Audio Error Display in Status Box if needed */}
                {audioError && (
                    <div className="mt-2 text-red-500 text-xs flex items-center justify-center gap-1">
                        <AlertCircle size={12} /> {audioError}
                    </div>
                )}
            </div>
        </div>

        {/* --- BLACKBOARD AREA --- */}
        <div className="flex-1 bg-stone-800 rounded-xl border-[12px] border-[#5d4037] shadow-2xl relative overflow-hidden flex flex-col">
            {/* Chalk dust texture */}
            <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/black-chalk.png')]"></div>
            
            <div 
                ref={blackboardRef}
                className="flex-1 p-8 md:p-12 overflow-y-auto z-10 custom-scrollbar relative"
            >
                {status === 'idle' && (
                    <div className="flex flex-col items-center justify-center h-full space-y-8 animate-fadeIn">
                        <h2 className={`text-4xl md:text-5xl ${fontFamily} text-white/90 text-center leading-relaxed`}>
                            오늘 배울 주제는 무엇인가요?
                        </h2>
                        
                        <div className="w-full max-w-2xl flex flex-col gap-4">
                            <div className="flex gap-2 w-full">
                                <input
                                    type="text"
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    placeholder="예: 신라의 삼국통일, 광합성, 분수 덧셈..."
                                    className="flex-1 px-6 py-4 rounded-2xl bg-white/10 border-2 border-white/30 text-white placeholder-white/40 focus:outline-none focus:border-yellow-400 backdrop-blur-sm text-xl transition-all"
                                    onKeyDown={(e) => e.key === 'Enter' && handleStartClass()}
                                />
                                <button
                                    onClick={() => handleStartClass()}
                                    disabled={!topic.trim()}
                                    className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed text-yellow-900 px-8 rounded-2xl font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center"
                                >
                                    <Send size={28} />
                                </button>
                            </div>
                            
                            {/* Quiz Count Selector */}
                             <div className="flex items-center gap-4 text-white/60 bg-white/10 px-4 py-2 rounded-xl border border-white/10 w-auto self-center">
                                <HelpCircle size={18} className="text-yellow-400" />
                                <span className="font-comic">퀴즈 문제 수:</span>
                                <div className="flex gap-2">
                                    {[1, 3, 5].map(count => (
                                        <button 
                                            key={count}
                                            onClick={() => setQuizCount(count)}
                                            className={`px-3 py-1 rounded-lg font-bold transition-colors ${quizCount === count ? 'bg-yellow-500 text-black' : 'bg-white/10 hover:bg-white/20'}`}
                                        >
                                            {count}개
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center gap-4 text-white/30 justify-center my-2">
                                <span className="h-px bg-white/20 w-16"></span>
                                <span className="font-comic text-sm">또는</span>
                                <span className="h-px bg-white/20 w-16"></span>
                            </div>

                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-white/5 hover:bg-white/10 border-2 border-dashed border-white/20 text-white/70 hover:text-white transition-all group"
                            >
                                <div className="bg-white/10 p-2 rounded-full group-hover:bg-white/20">
                                    <Upload size={24} />
                                </div>
                                <span className="text-lg">교과서/자료 업로드 (.txt, .pdf, .hwp)</span>
                            </button>
                            <input
                                type="file"
                                accept=".txt,.md,.pdf,.hwp"
                                ref={fileInputRef}
                                className="hidden"
                                onChange={handleFileUpload}
                            />
                        </div>
                    </div>
                )}

                {status === 'planning' && (
                    <div className="flex flex-col items-center justify-center h-full text-white animate-pulse">
                        <Loader2 size={80} className="animate-spin mb-6 text-yellow-400" />
                        <p className={`text-3xl ${fontFamily} mb-2`}>선생님이 수업을 준비하고 계세요...</p>
                        <p className="text-white/60 text-lg font-comic">총 10단계의 수업 계획, 대본, 그리고 {quizCount}개의 퀴즈를 생성하는 중입니다.</p>
                    </div>
                )}

                {/* --- TEACHING MODE: OVERVIEW (BOARD WRITING) --- */}
                {status === 'teaching' && showOverview && lessonPlan && (
                    <div className="flex flex-col h-full animate-fadeIn p-4 md:p-8">
                        <div className="border-4 border-white/10 rounded-xl p-8 bg-white/5 shadow-inner backdrop-blur-sm flex-1 flex flex-col items-center justify-center relative">
                            {/* Decorative Tape */}
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-32 h-8 bg-yellow-200/50 rotate-1 shadow-sm"></div>

                            <h2 className={`text-4xl md:text-5xl ${fontFamily} text-yellow-300 mb-8 text-center drop-shadow-lg underline decoration-wavy decoration-white/30 underline-offset-8`}>
                                {lessonPlan.topic}
                            </h2>

                            <div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-2 gap-8 h-full items-start content-center">
                                {/* Left: Goal */}
                                <div className="bg-black/20 p-8 rounded-2xl border border-white/10 relative flex flex-col justify-center min-h-[300px]">
                                    <div className="absolute -top-3 -left-3 bg-pink-500 text-white px-4 py-2 rounded-lg font-bold shadow-md transform -rotate-6 flex items-center gap-2 text-lg">
                                        <Target size={20} /> 학습 목표
                                    </div>
                                    <p className={`text-3xl md:text-4xl text-white/90 leading-relaxed mt-6 text-center ${fontFamily}`}>
                                        {lessonPlan.learningGoal}
                                    </p>
                                </div>

                                {/* Right: Process */}
                                <div className="bg-black/20 p-8 rounded-2xl border border-white/10 relative h-[500px] overflow-y-auto custom-scrollbar">
                                    <div className="absolute -top-3 -right-3 bg-blue-500 text-white px-4 py-2 rounded-lg font-bold shadow-md transform rotate-3 flex items-center gap-2 text-lg">
                                        <List size={20} /> 수업 순서 (총 {lessonPlan.sections.length}단계)
                                    </div>
                                    <ul className="mt-8 space-y-6">
                                        {lessonPlan.sections.map((section, idx) => (
                                            <li key={idx} className={`text-2xl md:text-3xl text-white/80 flex items-center gap-4 ${fontFamily}`}>
                                                <span className="w-10 h-10 rounded-full border-2 border-white/30 flex items-center justify-center font-sans text-lg font-bold bg-white/5 flex-shrink-0">
                                                    {idx + 1}
                                                </span>
                                                <span className="flex items-center gap-2">
                                                    {section.sectionTitle}
                                                </span>
                                            </li>
                                        ))}
                                        <li className={`text-2xl md:text-3xl text-yellow-200/80 flex items-center gap-4 ${fontFamily}`}>
                                            <span className="w-10 h-10 rounded-full border-2 border-yellow-200/30 flex items-center justify-center font-sans text-lg font-bold bg-yellow-500/10 flex-shrink-0">
                                                Q
                                            </span>
                                            마무리 퀴즈 ({quizCount}문제)
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            <button
                                onClick={startActualLesson}
                                className="mt-12 px-8 py-3 bg-white hover:bg-yellow-100 text-stone-800 rounded-full font-bold text-xl shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all transform hover:scale-105 flex items-center gap-2 animate-pulse"
                            >
                                <BookOpen size={24} /> 수업 시작하기
                            </button>
                        </div>
                    </div>
                )}

                {/* --- TEACHING MODE: SLIDES --- */}
                {status === 'teaching' && !showOverview && lessonPlan && (
                    isViewAllMode ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20 animate-fadeIn">
                             <div className="col-span-full mb-4">
                                <h2 className={`text-3xl ${fontFamily} text-yellow-400 border-b-2 border-white/10 pb-4`}>
                                    {lessonPlan.topic} <span className="text-white/60 text-lg ml-2">- 전체 수업 내용</span>
                                </h2>
                            </div>
                            {lessonPlan.sections.map((section, idx) => (
                                <div key={idx} className="bg-white/10 rounded-xl p-4 border border-white/10 hover:bg-white/15 transition-colors cursor-pointer" onClick={() => {
                                    setCurrentSectionIndex(idx);
                                    setIsViewAllMode(false);
                                }}>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="bg-yellow-500/20 text-yellow-300 text-xs px-2 py-1 rounded font-bold">
                                            Step {idx + 1}
                                        </span>
                                    </div>
                                    <h3 className={`text-xl font-bold text-white mb-2 ${fontFamily}`}>{section.sectionTitle}</h3>
                                    <p className="text-white/70 text-sm line-clamp-3">{section.text}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col h-full animate-fadeIn">
                            <div className="flex justify-between items-end mb-6 border-b border-white/10 pb-4">
                                <div>
                                    <span className="text-yellow-500 font-bold text-sm tracking-widest uppercase mb-1 block">Step {currentSectionIndex + 1} / {lessonPlan.sections.length}</span>
                                    <h2 className={`text-3xl md:text-4xl text-white ${fontFamily} leading-tight flex items-center gap-3`}>
                                        {lessonPlan.sections[currentSectionIndex].sectionTitle}
                                    </h2>
                                </div>
                                <button 
                                    onClick={() => playTeacherVoice(lessonPlan.sections[currentSectionIndex].text)}
                                    className="text-white/50 hover:text-yellow-400 transition-colors p-2"
                                    title="다시 듣기"
                                >
                                    <Volume2 size={24} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                {/* Images Grid */}
                                {sectionImages[currentSectionIndex] && (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                        {sectionImages[currentSectionIndex].map((imgUrl, i) => (
                                            <div key={i} className="aspect-square rounded-lg overflow-hidden border-4 border-white/10 shadow-lg bg-black/20 group">
                                                <img src={imgUrl} alt={`visual-${i}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {isGeneratingImages && !sectionImages[currentSectionIndex] && (
                                     <div className="flex items-center justify-center h-32 mb-8 bg-white/5 rounded-lg border border-white/10 border-dashed">
                                        <Loader2 className="animate-spin text-white/30 mr-2" />
                                        <span className="text-white/30 text-sm">참고자료 생성 중...</span>
                                     </div>
                                )}

                                <p className={`text-white/90 leading-loose whitespace-pre-line ${fontFamily} ${BOARD_FONT_SIZES[fontSizeIndex]}`}>
                                    {lessonPlan.sections[currentSectionIndex].text}
                                </p>
                            </div>
                        </div>
                    )
                )}

                {status === 'quiz' && lessonPlan && (
                    <div className="flex flex-col items-center justify-center h-full animate-fadeIn max-w-4xl mx-auto">
                        <div className="w-full bg-white/10 p-8 rounded-3xl border-2 border-white/10 backdrop-blur-sm relative">
                            
                            {/* Quiz Progress Indicator */}
                            <div className="absolute top-4 right-6 flex items-center gap-2 bg-black/30 px-3 py-1 rounded-full text-white/80 text-sm">
                                <span>문제 {currentQuizIndex + 1} / {lessonPlan.quizzes.length}</span>
                            </div>

                            {/* Finished State */}
                            {isQuizFinished ? (
                                <div className="text-center animate-fadeIn py-8">
                                    <div className="inline-block p-6 rounded-full bg-yellow-400 text-yellow-900 mb-6 shadow-xl animate-bounce">
                                        <Trophy size={64} />
                                    </div>
                                    <h2 className={`text-4xl md:text-5xl text-white ${fontFamily} mb-4`}>
                                        퀴즈 끝! 참 잘했어요!
                                    </h2>
                                    <p className="text-2xl text-white/80 mb-8 font-comic">
                                        {lessonPlan.quizzes.length}문제 중 <span className="text-yellow-400 font-bold text-4xl mx-2">{quizScore}</span>문제를 맞췄어요!
                                    </p>

                                    <div className="flex justify-center gap-4 flex-wrap">
                                        <button 
                                            onClick={() => handleStartClass()}
                                            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold flex items-center gap-2 transition-colors"
                                        >
                                            <RefreshCcw size={20} /> 다시 공부하기
                                        </button>
                                        <button 
                                            onClick={handleGenerateVideo}
                                            disabled={isGeneratingVideo}
                                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isGeneratingVideo ? <Loader2 className="animate-spin" /> : <Video size={20} />}
                                            수업 영상 만들기
                                        </button>
                                    </div>

                                    {videoUrl && (
                                        <div className="mt-8 p-4 bg-black/40 rounded-xl border border-white/10 animate-fadeIn max-w-lg mx-auto">
                                            <h3 className="text-white font-bold mb-2 flex items-center justify-center gap-2">
                                                <Sparkles className="text-yellow-400" size={16} /> 나만의 수업 영상이 완성되었어요!
                                            </h3>
                                            <video src={videoUrl} controls className="w-full rounded-lg shadow-2xl max-h-[300px]" />
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* Active Quiz Question */
                                <>
                                    <div className="text-center mb-4">
                                        <span className="bg-pink-500 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg mb-4 inline-block animate-pulse">
                                            POP QUIZ
                                        </span>
                                        <h2 className={`text-3xl md:text-4xl text-white ${fontFamily} leading-snug min-h-[3rem]`}>
                                            {lessonPlan.quizzes[currentQuizIndex].question}
                                        </h2>
                                    </div>

                                    {/* Read Aloud Button - Replacing Image Block */}
                                    <div className="flex justify-center mb-8">
                                        <button 
                                            onClick={() => {
                                                const quiz = lessonPlan.quizzes[currentQuizIndex];
                                                const optionsText = quiz.options.map((opt, i) => `${i + 1}번, ${opt}`).join('. ');
                                                const textToRead = `문제 ${currentQuizIndex + 1}번. ${quiz.question}. ${optionsText}. 정답을 골라봐.`;
                                                playTeacherVoice(textToRead);
                                            }}
                                            className="flex items-center gap-3 bg-yellow-500 hover:bg-yellow-400 text-yellow-900 px-6 py-3 rounded-full transition-all font-bold shadow-lg active:scale-95 text-lg"
                                        >
                                            <Volume2 size={24} className={isPlayingAudio ? "animate-pulse" : ""} />
                                            {isPlayingAudio ? "읽어주는 중..." : "문제 듣기"}
                                        </button>
                                    </div>
                                    
                                    <div className="grid gap-4 w-full">
                                        {lessonPlan.quizzes[currentQuizIndex].options.map((option, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => handleQuizAnswer(idx)}
                                                disabled={selectedQuizOption !== null}
                                                className={`w-full p-4 md:p-5 rounded-xl text-left text-lg md:text-xl transition-all border-2 flex items-center justify-between group ${
                                                    selectedQuizOption === null 
                                                        ? 'bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-yellow-400 hover:scale-[1.01]' 
                                                        : selectedQuizOption === idx 
                                                            ? idx === lessonPlan.quizzes[currentQuizIndex].answer 
                                                                ? 'bg-green-500/20 border-green-500 text-green-100' 
                                                                : 'bg-red-500/20 border-red-500 text-red-100'
                                                            : idx === lessonPlan.quizzes[currentQuizIndex].answer
                                                                ? 'bg-green-500/20 border-green-500 text-green-100'
                                                                : 'bg-white/5 border-white/10 text-white/30'
                                                }`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                                                        selectedQuizOption === idx 
                                                        ? 'bg-white text-black' 
                                                        : 'bg-white/10 text-white group-hover:bg-yellow-400 group-hover:text-black'
                                                    }`}>
                                                        {idx + 1}
                                                    </span>
                                                    {option}
                                                </div>
                                                {selectedQuizOption !== null && idx === lessonPlan.quizzes[currentQuizIndex].answer && <CheckCircle className="text-green-400" />}
                                                {selectedQuizOption === idx && idx !== lessonPlan.quizzes[currentQuizIndex].answer && <XCircle className="text-red-400" />}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Feedback & Next Button */}
                                    {selectedQuizOption !== null && (
                                        <div className="mt-8 text-center animate-fadeIn border-t border-white/10 pt-6">
                                            <p className={`text-2xl mb-6 font-bold ${selectedQuizOption === lessonPlan.quizzes[currentQuizIndex].answer ? 'text-green-400' : 'text-red-400'}`}>
                                                {selectedQuizOption === lessonPlan.quizzes[currentQuizIndex].answer ? "딩동댕! 정답입니다! 🎉" : "땡! 아쉽지만 다음엔 맞출 수 있을 거야!"}
                                            </p>
                                            
                                            <button 
                                                onClick={handleNextQuizQuestion}
                                                className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-yellow-900 rounded-xl font-bold text-xl shadow-lg transition-transform active:scale-95 flex items-center gap-2 mx-auto"
                                            >
                                                {currentQuizIndex < lessonPlan.quizzes.length - 1 ? "다음 문제" : "결과 보기"} <ArrowRight size={24} />
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Blackboard Navigation Footer */}
            {status === 'teaching' && !isViewAllMode && !showOverview && (
                <div className="h-20 bg-[#4e342e] flex items-center justify-between px-6 border-t-4 border-[#3e2723] z-20">
                    <button 
                        onClick={handlePrevSection}
                        disabled={currentSectionIndex === 0}
                        className="flex items-center gap-2 text-[#d7ccc8] disabled:opacity-30 hover:text-white transition-colors font-bold font-chalk text-lg"
                    >
                        <ArrowLeft size={24} /> 이전
                    </button>

                    <div className="flex gap-2">
                        {lessonPlan?.sections.map((_, i) => (
                            <div key={i} className={`w-3 h-3 rounded-full ${i === currentSectionIndex ? 'bg-yellow-500' : 'bg-[#795548]'}`} />
                        ))}
                    </div>

                    <button 
                        onClick={handleNextSection}
                        className="flex items-center gap-2 text-[#d7ccc8] hover:text-white transition-colors font-bold font-chalk text-lg"
                    >
                        {currentSectionIndex < (lessonPlan?.sections.length || 0) - 1 ? "다음" : "퀴즈 풀기"} <ArrowRight size={24} />
                    </button>
                </div>
            )}
        </div>
      </div>
      
      {/* Chalk tray details */}
      <div className="h-4 bg-[#5d4037] w-full shadow-xl relative z-20 border-t border-[#8d6e63] flex items-center justify-center gap-8 px-20">
           <div className="h-2 w-24 bg-white/80 rounded-full shadow-sm transform rotate-1"></div>
           <div className="h-2 w-16 bg-yellow-200/80 rounded-full shadow-sm transform -rotate-2"></div>
           <div className="h-2 w-20 bg-pink-200/80 rounded-full shadow-sm transform rotate-3"></div>
           <div className="h-6 w-32 bg-stone-700 rounded shadow-lg border border-stone-600 flex items-center justify-center">
                <span className="text-[10px] text-stone-400 font-sans tracking-widest">ERASER</span>
           </div>
      </div>
    </div>
  );
};

export default Classroom;
