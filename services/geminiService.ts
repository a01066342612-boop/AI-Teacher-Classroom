
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { LessonPlan } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

/**
 * Common schema for lesson plans
 */
const lessonPlanSchema = {
  type: Type.OBJECT,
  properties: {
    topic: { type: Type.STRING },
    learningGoal: { type: Type.STRING, description: "한 문장으로 요약된 수업의 핵심 학습 목표" },
    sections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          sectionTitle: { type: Type.STRING },
          text: { type: Type.STRING, description: "선생님이 학생에게 말하는 대화체 내용" },
          visualPrompts: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "List of 1 English prompt for image generation" 
          },
          visualType: { type: Type.STRING, enum: ["image", "none"] }
        },
        required: ["sectionTitle", "text", "visualPrompts", "visualType"]
      }
    },
    quizzes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          options: { type: Type.ARRAY, items: { type: Type.STRING } },
          answer: { type: Type.INTEGER, description: "0-based index of correct option" }
        },
        required: ["question", "options", "answer"]
      }
    },
    activities: {
      type: Type.ARRAY,
      description: "List of 3 different creative activities for students to choose from",
      items: {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING, description: "Title of the activity" },
            description: { type: Type.STRING, description: "Short motivation/intro for the activity in Korean" },
            materials: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of materials needed in Korean" },
            steps: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Step by step instructions in Korean" },
            exampleResultDesc: { type: Type.STRING, description: "A detailed visual English description of what the finished activity result looks like (e.g., 'a colorful drawing of a space rocket', 'a clay model of a dinosaur'). Used for image generation." }
        },
        required: ["title", "description", "materials", "steps", "exampleResultDesc"]
      }
    }
  },
  required: ["topic", "learningGoal", "sections", "quizzes", "activities"]
};

// Schema for Teacher Metadata
const teacherSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: "Name of the teacher in Korean, e.g., '공룡 선생님' or '우주인 선생님'" },
    style: { type: Type.STRING, description: "A short, fun description of their teaching style in Korean" },
    voiceName: { type: Type.STRING, enum: ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'] },
    gender: { type: Type.STRING, enum: ['male', 'female'] },
    color: { type: Type.STRING, description: "A Tailwind CSS background color class (must be one of: bg-red-500, bg-blue-500, bg-green-500, bg-yellow-500, bg-purple-500, bg-pink-500, bg-indigo-500, bg-teal-500, bg-orange-500)" },
    greeting: { type: Type.STRING, description: "A friendly and characteristic short greeting message in Korean" },
    visualDesc: { type: Type.STRING, description: "A detailed English description for generating a full-body character vector illustration. Must include 'full body character', 'vector illustration', 'white background'." },
    backgroundPrompt: { type: Type.STRING, description: "A detailed English description for generating a matching classroom background." },
    avatarEmoji: { type: Type.STRING, description: "A single emoji representing the character" }
  },
  required: ["name", "style", "voiceName", "gender", "color", "greeting", "visualDesc", "backgroundPrompt", "avatarEmoji"]
};

/**
 * Generates teacher metadata based on a user keyword.
 */
export const generateTeacherMetadata = async (keyword: string): Promise<any> => {
  const prompt = `
    Create a unique, fun, and kid-friendly elementary school teacher character based on the keyword: "${keyword}".
    The character should be suitable for an educational app.
    Return the response in JSON format.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: teacherSchema
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  return JSON.parse(text);
};

/**
 * Generates a structured lesson plan based on topic, grade, and teacher style.
 */
export const generateLessonPlan = async (
  topic: string,
  grade: string,
  teacherStyle: string,
  quizCount: number = 3
): Promise<LessonPlan> => {
  const prompt = `
    당신은 ${grade} 학생들을 가르치는 선생님입니다.
    당신의 교육 스타일은 "${teacherStyle}" 입니다.
    주제: "${topic}"에 대해 수업을 진행해주세요.
    
    다음 JSON 형식으로 수업 계획을 작성해주세요.
    1. 도입, 전개, 심화, 정리 등 **총 10단계(섹션)**로 수업을 구성해주세요.
    2. **반드시 'learningGoal' 필드에 오늘 수업의 핵심 목표를 한 문장으로 요약해서 넣어주세요.**
    3. 학생들이 지루해하지 않도록 흥미로운 설명과 예시를 사용해주세요.
    4. 마지막 10번째 섹션은 반드시 **'배운 내용 정리하기'**라는 제목의 요약 섹션으로 구성하세요.
    5. 각 섹션마다 내용의 이해를 돕기 위해, **1개**의 이미지 생성을 위한 영어 프롬프트(visualPrompts)를 작성해주세요.
    6. 내용을 확인하는 **퀴즈를 정확히 ${quizCount}문제** 포함해주세요.
    7. **퀴즈 뒤에 ${grade} 수준에 맞는 재미있는 '창의 체험 활동'을 3가지 제안해주세요.** (예: 그림 그리기, 만들기, 편지 쓰기, 역할극, 퀴즈 만들기 등 다양한 유형). 각 활동별로 준비물(materials), 활동 순서(steps), 그리고 **완성된 결과물의 시각적 묘사(exampleResultDesc, 영어)**를 상세히 적어주세요.
    
    주의: 내용은 ${grade} 수준에 맞춰 이해하기 쉽고 흥미롭게 작성해야 합니다.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: lessonPlanSchema
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  return JSON.parse(text) as LessonPlan;
};

/**
 * Generates a lesson plan from uploaded file content.
 */
export const generateLessonPlanFromText = async (
  fileContent: string,
  grade: string,
  teacherStyle: string,
  quizCount: number = 3
): Promise<LessonPlan> => {
  const prompt = `
    당신은 ${grade} 학생들을 가르치는 선생님입니다.
    당신의 교육 스타일은 "${teacherStyle}" 입니다.
    
    다음은 수업에 사용할 자료(텍스트 파일 내용)입니다:
    """
    ${fileContent.substring(0, 10000)} 
    """

    위의 자료 내용을 바탕으로 아이들에게 설명해주는 수업 대본을 만들어주세요.
    1. 내용을 충분히 다루기 위해 **총 10단계(섹션)**로 나누어 구성해주세요.
    2. **반드시 'learningGoal' 필드에 오늘 수업의 핵심 목표를 한 문장으로 요약해서 넣어주세요.**
    3. 마지막 10번째 섹션은 반드시 내용을 요약하는 **'정리하기'** 시간으로 만들어주세요.
    4. 각 섹션마다 내용의 이해를 돕기 위해, **1개**의 이미지 생성을 위한 영어 프롬프트(visualPrompts)를 작성해주세요.
    5. 마지막에는 내용을 확인하는 **퀴즈를 정확히 ${quizCount}문제** 포함해주세요.
    6. **퀴즈 뒤에 이 내용과 관련된 '창의 체험 활동'을 3가지 제안해주세요.** 준비물(materials), 활동 순서(steps), **완성된 결과물의 시각적 묘사(exampleResultDesc, 영어)**를 상세히 포함하세요.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: lessonPlanSchema
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  return JSON.parse(text) as LessonPlan;
}

/**
 * Generates an image based on a prompt.
 */
export const generateClassroomImage = async (prompt: string): Promise<string> => {
  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt }] },
        config: {
          // 2.5 flash image does not take aspect ratio in config for generateContent usually
        }
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    } catch (e) {
      console.warn(`Image generation attempt ${attempt + 1} failed:`, e);
      if (attempt === maxRetries - 1) throw e;
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
  
  throw new Error("No image generated after retries");
};

/**
 * Generates speech from text.
 */
export const generateSpeech = async (text: string, voiceName: string): Promise<AudioBuffer> => {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName }
        }
      }
    }
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("No audio generated");

  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  const audioBuffer = await decodeAudioData(
    decode(base64Audio),
    audioContext,
    24000,
    1
  );
  return audioBuffer;
};

/**
 * Helper to decode raw PCM data from Gemini TTS
 */
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/**
 * Generates a short video summary using Veo.
 */
export const generateVideoSummary = async (prompt: string): Promise<string> => {
    if (window.aistudio && window.aistudio.hasSelectedApiKey) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
             await window.aistudio.openSelectKey();
        }
    }

    const veoAi = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

    let operation = await veoAi.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: `Cute educational animation about: ${prompt}. Cartoon style, bright colors.`,
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: '16:9'
        }
    });

    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000)); 
        operation = await veoAi.operations.getVideosOperation({ operation: operation });
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("Video generation failed");

    return `${videoUri}&key=${process.env.API_KEY}`;
};
