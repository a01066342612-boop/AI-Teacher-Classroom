
export interface Teacher {
  id: string;
  name: string;
  avatar: string; // URL to an image or emoji
  style: string; // Description of teaching style
  voiceName: string; // Gemini TTS voice name
  gender: 'male' | 'female';
  color: string; // Theme color
  greeting: string;
  visualDesc: string; // Description for image generation
  backgroundPrompt: string; // Description for classroom background generation
  customImageUrl?: string; // Optional: Uploaded custom image URL
}

export enum GradeLevel {
  GRADE_1 = "초등학교 1학년",
  GRADE_2 = "초등학교 2학년",
  GRADE_3 = "초등학교 3학년",
  GRADE_4 = "초등학교 4학년",
  GRADE_5 = "초등학교 5학년",
  GRADE_6 = "초등학교 6학년",
}

export interface LessonContent {
  sectionTitle: string;
  text: string;
  visualPrompts: string[]; // Array of prompts to generate multiple images
  visualType: 'none' | 'image' | 'video';
}

export interface QuizItem {
  question: string;
  options: string[];
  answer: number; // Index
}

export interface ActivityItem {
  title: string;
  description: string; // Intro/Motivation
  materials: string[]; // List of materials needed
  steps: string[]; // Step-by-step instructions
  exampleResultDesc: string; // Description of the result for image generation
}

export interface LessonPlan {
  topic: string;
  learningGoal: string; // Learning objective summary
  sections: LessonContent[];
  quizzes: QuizItem[]; // Array of quiz questions
  activities: ActivityItem[]; // Array of suggested activities
}
