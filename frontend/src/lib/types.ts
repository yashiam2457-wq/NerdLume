export type PlanType = "free" | "free-premium" | "diamond";

export interface PlanLimits {
  notes: number;
  explain: number;
  quick: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  plan: PlanType;
  role?: "user" | "admin";
  avatar?: string;
  token?: string;
  usage: {
    notes: number;
    explain: number;
    quick: number;
    resetDate: string;
  };
}

export interface TokenStats {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd: number;
  callsCount: number;
  modeBreakdown: {
    notes: number;
    explain: number;
    quickAssignment: number;
    quickPractical: number;
  };
  dailyUsage: Array<{ date: string; tokens: number; calls: number }>;
}

export interface SystemActivity {
  id: string;
  timestamp: string;
  eventType:
    | "generation"
    | "token_consumption"
    | "quota_check"
    | "auto_download"
    | "policy_change"
    | "admin_login";
  scholar: string;
  mode?: string;
  tokensConsumed?: number;
  latencyMs?: number;
  status: "success" | "warning" | "error";
  description: string;
}

export type GenerationMode = "learning" | "quick" | "assignment";
export type QuickType = "assignment" | "practical";
export type LearningGoal = "notes" | "practice" | "explain";
export type NoteType = "oneliner" | "brief" | "summary" | "mindmap";
export type NoteMethod =
  | "cornell"
  | "outline"
  | "mindmap"
  | "t-notes"
  | "feynman"
  | "sq3r";

export type PracticeType = "quiz" | "mock" | "flash" | "guide" | "qna";

export interface GenerationRequest {
  mode: GenerationMode;
  goal?: LearningGoal;
  quickType?: QuickType;
  topic?: string;
  files?: Array<{ name: string; size: number; type: string }>;
  noteType?: NoteType;
  method?: NoteMethod;
  practiceType?: PracticeType;
  practiceTimer?: number;
  practiceCount?: number;
  practiceDifficulty?: "easy" | "medium" | "hard" | "competitive";
  options?: {
    theoryAndNumericals?: boolean;
    programWithCode?: boolean;
    dataGraphs?: boolean;
    asciiDiagrams?: boolean;
    [key: string]: any;
  };
  assignmentOptions?: {
    sections?: string[];
    level?: string;
    language?: string;
    format?: string;
  };
  practicalOptions?: {
    sections?: string[];
    language?: string;
    includeOutput?: boolean;
    includeTestCases?: boolean;
    includeComplexity?: boolean;
    format?: string;
  };
}

export interface GenerationResult {
  id: string;
  title: string;
  timestamp: string;
  mode: GenerationMode;
  goal?: LearningGoal;
  summary: string;
  content: string;
  diagrams?: string[];
  codeSnippets?: Array<{ language: string; code: string; output?: string }>;
  flashcards?: FlashcardItem[];
  quizQuestions?: QuizQuestionItem[];
  downloadUrls?: {
    md?: string;
    txt?: string;
    docx?: string;
    pdf?: string;
  };
}

export interface FlashcardItem {
  id: string;
  front: string;
  back: string;
  category?: string;
  mastery?: "again" | "hard" | "good" | "easy";
}

export interface QuizQuestionItem {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  topic?: string;
}

export interface FeatureLock {
  id?: string;
  match?: string;
  type: "goal-card" | "option-text" | "practice-type";
  required: PlanType;
  label: string;
  description?: string;
}
