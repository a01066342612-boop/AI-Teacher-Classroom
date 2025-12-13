import React, { useRef } from 'react';
import { TEACHERS } from '../constants';
import { Teacher } from '../types';
import { GlobalSettings } from '../App';
import { Type, Music, Upload, FileAudio, Settings, Search, Camera, User, School, GraduationCap, Save } from 'lucide-react';
import html2canvas from 'html2canvas';

interface TeacherSelectorProps {
  onSelect: (teacher: Teacher) => void;
  settings: GlobalSettings;
  setSettings: React.Dispatch<React.SetStateAction<GlobalSettings>>;
}

const FONT_FAMILIES = [
    { name: '칠판체 (기본)', value: 'font-chalk' },
    { name: '동화체 (귀여운)', value: 'font-comic' },
    { name: '손글씨체', value: 'font-pen' },
    { name: '굵은체 (강조)', value: 'font-thick' },
    { name: '해바라기체', value: 'font-sun' },
    { name: '고딕체 (깔끔한)', value: 'font-sans' },
    // New Fonts
    { name: '도현체 (힘찬)', value: 'font-dohyeon' },
    { name: '고운돋움', value: 'font-gowun' },
    { name: '고운바탕', value: 'font-batang' },
    { name: '송명체 (진지한)', value: 'font-song' },
    { name: '스타일리시', value: 'font-stylish' },
    { name: '연성체', value: 'font-yeonsung' },
    { name: '구기체 (독특한)', value: 'font-gugi' },
    { name: '하이멜로디', value: 'font-melody' },
    { name: '개구체 (손글씨)', value: 'font-gaegu' },
    { name: '싱글데이', value: 'font-single' },
];

const FONT_SIZES = [
    { name: '1단계 (아주 작게)', value: 0 },
    { name: '2단계', value: 1 },
    { name: '3단계', value: 2 },
    { name: '4단계', value: 3 },
    { name: '5단계 (보통)', value: 4 },
    { name: '6단계', value: 5 },
    { name: '7단계', value: 6 },
    { name: '8단계', value: 7 },
    { name: '9단계', value: 8 },
    { name: '10단계 (아주 크게)', value: 9 },
];

const TeacherSelector: React.FC<TeacherSelectorProps> = ({ onSelect, settings, setSettings }) => {
  const bgmInputRef = useRef<HTMLInputElement>(null);
  const [youtubeSearchTerm, setYoutubeSearchTerm] = React.useState('');

  const handleBgmUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSettings(prev => ({ ...prev, bgmUrl: url, youtubeEmbedId: null }));
  };

  const handleYoutubeSearch = () => {
    if (!youtubeSearchTerm.trim()) return;
    window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(youtubeSearchTerm)}`, '_blank');
  };

  const handleCaptureScreen = async () => {
    const element = document.body;
    try {
        const canvas = await html2canvas(element, { useCORS: true });
        const link = document.createElement('a');
        link.download = `teacher-selection-${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();
    } catch (e) {
        console.error("Screen capture failed", e);
        alert("화면 저장에 실패했습니다.");
    }
  };

  const handleSaveStudentInfo = () => {
      const infoToSave = {
          schoolName: settings.schoolName,
          gradeClass: settings.gradeClass,
          studentName: settings.studentName
      };
      try {
          localStorage.setItem('ai_classroom_student_info', JSON.stringify(infoToSave));
          alert('학생 정보가 저장되었습니다! \n다음에 방문하면 자동으로 입력됩니다. 😊');
      } catch (e) {
          console.error("Failed to save student info", e);
          alert('정보 저장에 실패했습니다.');
      }
  };

  return (
    <div className="flex flex-col items-center h-screen bg-gradient-to-b from-blue-100 to-yellow-50 overflow-hidden relative">
      
      {/* Settings Panel - Fixed at top, highly visible */}
      <div className="w-full bg-white/90 backdrop-blur-md border-b border-stone-200 z-50 shadow-md transition-all">
          <div className="max-w-7xl mx-auto p-4 flex flex-col gap-4">
              
              {/* Row 1: Student Info Inputs */}
              <div className="flex flex-wrap items-center justify-center gap-4 w-full bg-indigo-50 p-2 rounded-lg border border-indigo-100 shadow-sm">
                  <div className="flex items-center gap-2">
                      <School className="text-indigo-500" size={18} />
                      <input 
                        type="text" 
                        placeholder="학교 이름 (예: 서울초등학교)" 
                        value={settings.schoolName}
                        onChange={(e) => setSettings(prev => ({...prev, schoolName: e.target.value}))}
                        className="bg-white border border-indigo-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-40"
                      />
                  </div>
                  <div className="flex items-center gap-2">
                      <GraduationCap className="text-indigo-500" size={18} />
                      <input 
                        type="text" 
                        placeholder="학년/반 (예: 1학년 2반)" 
                        value={settings.gradeClass}
                        onChange={(e) => setSettings(prev => ({...prev, gradeClass: e.target.value}))}
                        className="bg-white border border-indigo-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-32"
                      />
                  </div>
                  <div className="flex items-center gap-2">
                      <User className="text-indigo-500" size={18} />
                      <input 
                        type="text" 
                        placeholder="이름 (예: 홍길동)" 
                        value={settings.studentName}
                        onChange={(e) => setSettings(prev => ({...prev, studentName: e.target.value}))}
                        className="bg-white border border-indigo-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 w-24"
                      />
                  </div>
                  <button 
                      onClick={handleSaveStudentInfo}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded-md text-sm font-bold shadow-sm flex items-center gap-1 transition-all active:scale-95"
                      title="입력한 정보를 브라우저에 저장합니다"
                  >
                      <Save size={16} /> 저장
                  </button>
              </div>

              {/* Row 2: Title & Settings */}
              <div className="flex flex-col xl:flex-row items-center justify-between gap-4 w-full">
                {/* Title Area */}
                <div className="flex items-center gap-2">
                    <span className="text-3xl">🏫</span>
                    <h1 className="text-2xl md:text-3xl font-comic text-indigo-800 font-bold whitespace-nowrap">
                        오늘의 담임 선생님
                    </h1>
                </div>

                {/* Controls Area */}
                <div className="flex flex-wrap items-center justify-center gap-4 bg-stone-100/50 p-2 rounded-xl border border-stone-200 w-full xl:w-auto">
                    
                    {/* Font Settings */}
                    <div className="flex items-center gap-2 border-r border-stone-300 pr-4">
                        <Type className="text-stone-500" size={18} />
                        <div className="flex flex-col sm:flex-row gap-2">
                            <select 
                                value={settings.fontFamily}
                                onChange={(e) => setSettings(prev => ({...prev, fontFamily: e.target.value}))}
                                className="bg-white border border-stone-300 text-stone-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2"
                            >
                                {FONT_FAMILIES.map(f => <option key={f.value} value={f.value}>{f.name}</option>)}
                            </select>

                            <select 
                                value={settings.fontSizeIndex}
                                onChange={(e) => setSettings(prev => ({...prev, fontSizeIndex: Number(e.target.value)}))}
                                className="bg-white border border-stone-300 text-stone-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 w-32"
                            >
                                {FONT_SIZES.map(s => <option key={s.value} value={s.value}>{s.name}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Music Settings */}
                    <div className="flex items-center gap-2 flex-wrap justify-center">
                        <Music className="text-stone-500" size={18} />
                        
                        {/* PC File Upload Button */}
                        <input 
                                type="file" 
                                accept="audio/*"
                                ref={bgmInputRef}
                                onChange={handleBgmUpload}
                                className="hidden"
                            />
                        <button 
                            onClick={() => bgmInputRef.current?.click()}
                            className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg border focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${settings.bgmUrl ? 'bg-green-100 border-green-400 text-green-700' : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'}`}
                            title="PC에서 음악 파일 선택"
                        >
                            {settings.bgmUrl ? <FileAudio size={16}/> : <Upload size={16}/>}
                            <span>{settings.bgmUrl ? "파일 재생 중" : "PC 파일 선택"}</span>
                        </button>

                        <span className="text-stone-300 text-xs hidden sm:inline">|</span>

                        {/* YouTube Search Helper */}
                        <div className="flex items-center gap-1 bg-white border border-stone-300 rounded-lg p-1">
                            <input
                                type="text"
                                value={youtubeSearchTerm}
                                onChange={(e) => setYoutubeSearchTerm(e.target.value)}
                                placeholder="음악 검색"
                                className="w-20 sm:w-24 text-sm px-1 outline-none"
                                onKeyDown={(e) => e.key === 'Enter' && handleYoutubeSearch()}
                            />
                            <button onClick={handleYoutubeSearch} className="text-red-500 hover:text-red-600 p-1" title="유튜브에서 검색하기">
                                <Search size={16} />
                            </button>
                        </div>
                    </div>
                    
                    {/* Screen Capture */}
                    <div className="border-l border-stone-300 pl-4">
                        <button 
                            onClick={handleCaptureScreen}
                            className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-bold text-sm"
                            title="화면 저장하기"
                        >
                            <Camera size={16} /> <span className="hidden sm:inline">화면 저장</span>
                        </button>
                    </div>

                </div>
              </div>
          </div>
      </div>
      
      <div className="flex-1 w-full overflow-y-auto p-6 md:p-10 pt-4">
        <p className="text-center text-stone-500 mb-6 font-comic animate-bounce-gentle">
            👇 원하는 선생님 카드를 클릭하면 수업이 시작됩니다!
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 max-w-7xl mx-auto pb-10">
            {TEACHERS.map((teacher) => (
            <button
                key={teacher.id}
                onClick={() => onSelect(teacher)}
                className="group relative flex flex-col items-center p-6 bg-white rounded-3xl shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border-4 border-transparent hover:border-yellow-400 h-full justify-between"
            >
                <div className="flex flex-col items-center">
                    <div className="text-7xl md:text-8xl mb-4 transform transition-transform group-hover:scale-110 duration-300 filter drop-shadow-md">
                        {teacher.avatar}
                    </div>
                    
                    <div className="flex items-center gap-2 mb-2">
                        <h2 className="text-xl md:text-2xl font-bold text-gray-800 font-comic break-keep text-center">{teacher.name}</h2>
                    </div>
                    
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold mb-3 ${teacher.gender === 'male' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                        {teacher.gender === 'male' ? '남' : '여'}
                    </span>
                    
                    <p className="text-gray-500 text-center text-sm mb-4 line-clamp-3 leading-relaxed break-keep font-medium">
                        {teacher.style}
                    </p>
                </div>
                
                <div className={`w-full py-2 rounded-xl text-white text-sm font-bold shadow-md transition-opacity opacity-80 group-hover:opacity-100 ${teacher.color}`}>
                    수업 듣기 &rarr;
                </div>
            </button>
            ))}
        </div>
      </div>
      
      <footer className="w-full bg-white/80 p-4 text-center text-gray-500 text-sm font-comic flex-shrink-0 border-t border-stone-200">
        AI Teacher Classroom &copy; 재미있는 AI 수업 시간
      </footer>
    </div>
  );
};

export default TeacherSelector;