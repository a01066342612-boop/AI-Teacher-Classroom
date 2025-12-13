import React, { useState } from 'react';
import TeacherSelector from './components/TeacherSelector';
import Classroom from './components/Classroom';
import { Teacher } from './types';

export interface GlobalSettings {
  fontFamily: string;
  fontSizeIndex: number;
  bgmUrl: string | null;
  youtubeEmbedId: string | null;
  // Student Info
  schoolName: string;
  gradeClass: string;
  studentName: string;
}

function App() {
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  
  // Lifted state for settings
  const [settings, setSettings] = useState<GlobalSettings>(() => {
    // Try to load saved student info from localStorage
    let savedInfo: Partial<GlobalSettings> = {};
    try {
        const saved = localStorage.getItem('ai_classroom_student_info');
        if (saved) {
            savedInfo = JSON.parse(saved);
        }
    } catch (e) {
        console.error("Failed to load saved student info", e);
    }

    return {
      fontFamily: 'font-chalk',
      fontSizeIndex: 4, // Default to middle of 0-9 range
      bgmUrl: null,
      youtubeEmbedId: null,
      schoolName: savedInfo.schoolName || '',
      gradeClass: savedInfo.gradeClass || '',
      studentName: savedInfo.studentName || '',
    };
  });

  return (
    <div className="h-full w-full">
      {!selectedTeacher ? (
        <TeacherSelector 
          onSelect={setSelectedTeacher} 
          settings={settings}
          setSettings={setSettings}
        />
      ) : (
        <Classroom 
          teacher={selectedTeacher} 
          onBack={() => setSelectedTeacher(null)}
          initialSettings={settings}
        />
      )}
    </div>
  );
}

export default App;